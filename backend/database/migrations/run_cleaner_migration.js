const db = require('../db');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

async function runMigration() {
    console.log('🔄 Running Cleaner Tracking Migration (005)...\n');

    try {
        const migrationPath = path.join(__dirname, '005_add_cleaner_tracking.sql');
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

        console.log('📄 Executing SQL...');
        await db.query(migrationSQL);

        console.log('✅ Migration completed successfully!');

    } catch (err) {
        console.error('❌ Migration Error:', err.message);
        process.exit(1);
    } finally {
        // Allow time for logs to flush
        setTimeout(() => process.exit(0), 1000);
    }
}

runMigration();
