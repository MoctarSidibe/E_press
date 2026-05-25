/**
 * Migration 017: Expo push token columns on users.
 * Mirrors backend/database/migrations/017_add_push_tokens.sql so it can be
 * applied without psql access.
 *
 * Run: node scripts/run_migration_017.js
 */
const db = require('../database/db');

async function migrate() {
    try {
        await db.query(`
            ALTER TABLE users
                ADD COLUMN IF NOT EXISTS push_token     VARCHAR(255),
                ADD COLUMN IF NOT EXISTS push_platform  VARCHAR(20),
                ADD COLUMN IF NOT EXISTS push_token_at  TIMESTAMP
        `);
        console.log('✅  push_token / push_platform / push_token_at columns added to users');

        await db.query(`
            CREATE INDEX IF NOT EXISTS idx_users_push_token
                ON users (push_token)
                WHERE push_token IS NOT NULL
        `);
        console.log('✅  Partial index idx_users_push_token created');
    } catch (err) {
        console.error('Migration error:', err.message);
    } finally {
        process.exit(0);
    }
}

migrate();
