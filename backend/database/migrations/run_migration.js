const db = require('../db');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

/**
 * Run database migration for QR tracking system
 */

async function runMigration() {
    console.log('🔄 Running QR Tracking Migration...\n');

    try {
        // Read migration file
        const migrationPath = path.join(__dirname, '001_add_qr_tracking.sql');
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

        console.log('📄 Migration file loaded: 001_add_qr_tracking.sql\n');

        // Execute migration
        await db.query(migrationSQL);

        console.log('✅ Migration completed successfully!\n');

        // Verify tables were created
        console.log('🔍 Verifying new tables...\n');

        const tables = ['order_photos', 'order_signatures', 'courier_notifications'];

        for (const table of tables) {
            const result = await db.query(
                `SELECT COUNT(*) as count FROM information_schema.tables WHERE table_name = $1`,
                [table]
            );

            if (result.rows[0].count > 0) {
                console.log(`   ✓ ${table} table created`);
            } else {
                console.log(`   ✗ ${table} table NOT found`);
            }
        }

        // Verify orders table columns
        console.log('\n🔍 Verifying orders table columns...\n');

        const columns = [
            'qr_code_data', 'confirmed_item_count', 'pickup_item_count',
            'delivery_item_count', 'order_comment', 'item_comment',
            'pickup_driver_id', 'delivery_driver_id'
        ];

        for (const column of columns) {
            const result = await db.query(
                `SELECT COUNT(*) as count FROM information_schema.columns 
                 WHERE table_name = 'orders' AND column_name = $1`,
                [column]
            );

            if (result.rows[0].count > 0) {
                console.log(`   ✓ orders.${column} added`);
            } else {
                console.log(`   ✗ orders.${column} NOT found`);
            }
        }

        console.log('\n' + '═'.repeat(60));
        console.log('✅ QR Tracking Database Migration Complete!');
        console.log('═'.repeat(60));

    } catch (err) {
        console.error('\n❌ Migration Error:', err.message);
        console.error(err);
        process.exit(1);
    } finally {
        process.exit(0);
    }
}

runMigration();
