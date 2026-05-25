/**
 * Migration 018: Convert laveries.user_id from INTEGER to UUID.
 * Mirrors backend/database/migrations/018_fix_laveries_user_id_type.sql.
 * Run: node scripts/run_migration_018.js
 */
const db = require('../database/db');

async function migrate() {
    try {
        const before = await db.query(
            `SELECT data_type FROM information_schema.columns
             WHERE table_name = 'laveries' AND column_name = 'user_id'`
        );
        const currentType = before.rows[0]?.data_type;

        if (currentType !== 'integer') {
            console.log(`ℹ️  laveries.user_id is already ${currentType || 'missing'} — nothing to do`);
            process.exit(0);
        }

        await db.query('ALTER TABLE laveries DROP COLUMN user_id');
        await db.query(
            'ALTER TABLE laveries ADD COLUMN user_id UUID REFERENCES users(id) ON DELETE SET NULL'
        );
        await db.query('CREATE INDEX IF NOT EXISTS idx_laveries_user_id ON laveries (user_id)');
        console.log('✅  laveries.user_id converted from INTEGER → UUID');
    } catch (err) {
        console.error('Migration error:', err.message);
        process.exitCode = 1;
    } finally {
        process.exit(process.exitCode || 0);
    }
}

migrate();
