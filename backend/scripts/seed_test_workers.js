/**
 * Seed test workers — skip Phases 1 & 2 of the manual walkthrough.
 *
 * Creates (or refreshes) two approved worker accounts so you can jump straight
 * to placing customer orders and watching the chain run:
 *
 *   1. Laverie "Pressing Centre"      (cleaner, KYC approved, laverie set up in Libreville)
 *   2. Livreur "Driver Test"          (driver,  KYC approved)
 *
 * Idempotent — re-running just resets the accounts and laverie record.
 *
 * Run:
 *   cd backend
 *   node scripts/seed_test_workers.js
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const bcrypt = require('bcryptjs');
const db = require('../database/db');

// ─── Config — change these if you want different test credentials ─────────────
const LAVERIE = {
    fullName: 'Pressing Centre',
    phone:    '+24177000001',
    password: 'test1234',
    laverie: {
        name:      'Pressing Centre',
        address:   'Centre-ville, Libreville',
        lat:       0.4162,    // Libreville centre
        lng:       9.4673,
        radius_km: 10,
    },
};

const DRIVER = {
    fullName: 'Driver Test',
    phone:    '+24177000002',
    password: 'test1234',
};

// Synthetic email matches the mobile fallback ({local}@phone.epress.local) so
// either login mode works (email mode OR phone mode against the new
// OR-by-phone lookup in auth.service.js).
const syntheticEmail = (phone) => `${phone.replace(/\D/g, '').replace(/^241/, '')}@phone.epress.local`;

// Same card-number generator the auth service uses (EP-XXXX-XXXX-XXXX).
const generateCardNumber = () => {
    const seg = () => String(Math.floor(Math.random() * 9000) + 1000);
    return `EP-${seg()}-${seg()}-${seg()}`;
};

async function uniqueCardNumber(client) {
    // Loop until we find a card not yet in use (collisions extremely rare).
    for (let i = 0; i < 10; i++) {
        const card = generateCardNumber();
        const exists = await client.query('SELECT 1 FROM users WHERE card_number = $1', [card]);
        if (exists.rows.length === 0) return card;
    }
    throw new Error('Could not generate a unique card number after 10 tries');
}

async function upsertWorker(client, { fullName, phone, password, role }) {
    const email = syntheticEmail(phone);
    const passwordHash = await bcrypt.hash(password, 10);

    const existing = await client.query(
        'SELECT id, card_number FROM users WHERE phone = $1 OR email = $1 LIMIT 1',
        [phone]
    );

    if (existing.rows.length > 0) {
        // Update existing: refresh password, ensure role/active/KYC, keep card number.
        const id = existing.rows[0].id;
        await client.query(
            `UPDATE users
             SET full_name = $1,
                 email = $2,
                 password_hash = $3,
                 phone = $4,
                 role = $5,
                 is_active = true,
                 kyc_status = 'approved',
                 kyc_approved_at = NOW(),
                 kyc_rejection_reason = NULL,
                 updated_at = NOW()
             WHERE id = $6`,
            [fullName, email, passwordHash, phone, role, id]
        );
        return { id, action: 'updated' };
    }

    // Insert new user.
    const cardNumber = await uniqueCardNumber(client);
    const inserted = await client.query(
        `INSERT INTO users
            (full_name, email, password_hash, phone, role, card_number,
             points_balance, points_earned_total, is_active,
             kyc_status, kyc_approved_at)
         VALUES ($1, $2, $3, $4, $5, $6, 0, 0, true, 'approved', NOW())
         RETURNING id`,
        [fullName, email, passwordHash, phone, role, cardNumber]
    );
    return { id: inserted.rows[0].id, action: 'created' };
}

async function upsertLaverie(client, ownerUserId, cfg) {
    const existing = await client.query(
        'SELECT id FROM laveries WHERE user_id = $1 LIMIT 1',
        [ownerUserId]
    );

    if (existing.rows.length > 0) {
        const id = existing.rows[0].id;
        await client.query(
            `UPDATE laveries
             SET name = $1, address = $2, phone = $3,
                 lat = $4, lng = $5,
                 radius_km = $6,
                 active = true,
                 updated_at = NOW()
             WHERE id = $7`,
            [cfg.name, cfg.address, LAVERIE.phone, cfg.lat, cfg.lng, cfg.radius_km, id]
        );
        return { id, action: 'updated' };
    }

    const inserted = await client.query(
        `INSERT INTO laveries
            (user_id, name, address, phone, lat, lng, radius_km, max_concurrent_orders, active)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 20, true)
         RETURNING id`,
        [ownerUserId, cfg.name, cfg.address, LAVERIE.phone, cfg.lat, cfg.lng, cfg.radius_km]
    );
    return { id: inserted.rows[0].id, action: 'created' };
}

async function main() {
    const client = await db.pool.connect();
    try {
        console.log('🌱 Seeding test workers…\n');
        await client.query('BEGIN');

        const cleaner = await upsertWorker(client, {
            fullName: LAVERIE.fullName,
            phone:    LAVERIE.phone,
            password: LAVERIE.password,
            role:     'cleaner',
        });
        console.log(`  ✓ Cleaner ${cleaner.action}: ${LAVERIE.phone} (id=${cleaner.id})`);

        const laverie = await upsertLaverie(client, cleaner.id, LAVERIE.laverie);
        console.log(`  ✓ Laverie ${laverie.action}: "${LAVERIE.laverie.name}" @ (${LAVERIE.laverie.lat}, ${LAVERIE.laverie.lng}) [${LAVERIE.laverie.radius_km}km]`);

        const driver = await upsertWorker(client, {
            fullName: DRIVER.fullName,
            phone:    DRIVER.phone,
            password: DRIVER.password,
            role:     'driver',
        });
        console.log(`  ✓ Driver  ${driver.action}: ${DRIVER.phone} (id=${driver.id})`);

        await client.query('COMMIT');

        console.log('\n✅ Done. Login credentials (use phone mode on the Login screen):\n');
        console.log('  Laverie  →  phone: ' + LAVERIE.phone + '  password: ' + LAVERIE.password);
        console.log('  Livreur  →  phone: ' + DRIVER.phone   + '  password: ' + DRIVER.password);
        console.log('\nBoth accounts: KYC = approved, ready to use immediately.');
        console.log('Phase 1 & 2 of the walkthrough are now done — jump to Phase 3.\n');
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('❌ Seed failed:', err.message);
        if (err.code) console.error('   pg code:', err.code);
        process.exitCode = 1;
    } finally {
        client.release();
        process.exit(process.exitCode || 0);
    }
}

main();
