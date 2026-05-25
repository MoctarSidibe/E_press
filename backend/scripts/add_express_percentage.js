/**
 * Migration: add express_percentage column to points_config
 * Run: node scripts/add_express_percentage.js
 */
const db = require('../database/db');

async function migrate() {
    try {
        await db.query(`
            ALTER TABLE points_config
            ADD COLUMN IF NOT EXISTS express_percentage INTEGER NOT NULL DEFAULT 20
        `);
        console.log('✅  express_percentage column added to points_config (default: 20%)');
    } catch (err) {
        console.error('Migration error:', err.message);
    } finally {
        process.exit(0);
    }
}

migrate();
