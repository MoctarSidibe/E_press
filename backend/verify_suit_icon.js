const db = require('./database/db');
require('dotenv').config();

/**
 * Verify and ensure Suit category icon is 'suit' (for suit.gif)
 */

async function verifySuitIcon() {
    console.log('🔍 Checking Suit category icon...\n');

    try {
        // Check current icon
        const current = await db.query(
            `SELECT name, icon_name FROM clothing_categories WHERE name = $1`,
            ['Suit']
        );

        if (current.rows.length > 0) {
            console.log('Current Suit category:');
            console.log(`   Name: ${current.rows[0].name}`);
            console.log(`   Icon: ${current.rows[0].icon_name}`);
        }

        // Update to ensure it's 'suit'
        console.log('\n🔄 Ensuring icon is set to "suit"...');
        const result = await db.query(
            `UPDATE clothing_categories 
             SET icon_name = $1
             WHERE name = $2 
             RETURNING name, icon_name`,
            ['suit', 'Suit']
        );

        if (result.rows.length > 0) {
            console.log('✅ Updated:');
            console.log(`   Name: ${result.rows[0].name}`);
            console.log(`   Icon: ${result.rows[0].icon_name} (maps to suit.gif)`);
        }

    } catch (err) {
        console.error('❌ Error:', err.message);
    } finally {
        process.exit();
    }
}

verifySuitIcon();
