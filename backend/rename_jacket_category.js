const db = require('./database/db');
require('dotenv').config();

/**
 * Rename "Suit Jacket" to "Jacket / Coat"
 */

async function updateSuitJacketCategory() {
    console.log('🔄 Renaming Suit Jacket to Jacket / Coat...\n');

    try {
        const result = await db.query(
            `UPDATE clothing_categories 
             SET name = $1, name_fr = $2
             WHERE name = $3 
             RETURNING name, name_fr, icon_name, base_price`,
            ['Jacket / Coat', 'Veste / Manteau', 'Suit Jacket']
        );

        if (result.rows.length > 0) {
            console.log('✅ Successfully renamed category:');
            console.log(`   Name: ${result.rows[0].name}`);
            console.log(`   Name (FR): ${result.rows[0].name_fr}`);
            console.log(`   Icon: ${result.rows[0].icon_name}`);
            console.log(`   Price: $${result.rows[0].base_price}`);
        } else {
            console.log('⚠️  Category "Suit Jacket" not found');
        }

        // Verify Suit icon is correct
        console.log('\n🔍 Verifying Suit category icon...');
        const suitCheck = await db.query(
            `SELECT name, icon_name FROM clothing_categories WHERE name = $1`,
            ['Suit']
        );

        if (suitCheck.rows.length > 0) {
            console.log(`✅ Suit icon: ${suitCheck.rows[0].icon_name}`);
        }

    } catch (err) {
        console.error('❌ Error:', err.message);
    } finally {
        process.exit();
    }
}

updateSuitJacketCategory();
