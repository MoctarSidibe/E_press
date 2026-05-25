#!/usr/bin/env node
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const db = require('../database/db');

async function run() {
    try {
        await db.query('ALTER TABLE clothing_categories ADD COLUMN IF NOT EXISTS gif_url TEXT');
        console.log('✅ gif_url column added to clothing_categories');
    } catch (err) {
        console.error('❌ Migration failed:', err.message);
    } finally {
        await db.pool.end();
    }
}

run();
