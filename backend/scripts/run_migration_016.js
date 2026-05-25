/**
 * Migration 016: add user_id column to laveries
 * Run: node scripts/run_migration_016.js
 */
const db = require('../database/db');

async function migrate() {
    try {
        await db.query(`
            ALTER TABLE laveries
            ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE SET NULL
        `);
        console.log('✅  user_id column added to laveries');

        await db.query(`
            CREATE INDEX IF NOT EXISTS idx_laveries_user_id ON laveries (user_id)
        `);
        console.log('✅  Index idx_laveries_user_id created');
    } catch (err) {
        console.error('Migration error:', err.message);
    } finally {
        process.exit(0);
    }
}

migrate();
