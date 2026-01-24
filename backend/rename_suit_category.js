const db = require('./database/db');
require('dotenv').config();

/**
 * Rename "Suit (Full)" to just "Suit"
 */

async function renameSuitCategory() {
    console.log('🔄 Renaming Suit (Full) to Suit...\n');

    try {
        const result = await db.query(
            `UPDATE clothing_categories 
             SET name = $1, name_fr = $2
             WHERE name = $3 
             RETURNING name, name_fr, icon_name`,
            ['Suit', 'Costume', 'Suit (Full)']
        );

        if (result.rows.length > 0) {
            console.log('✅ Successfully renamed category:');
            console.log(`   Name: ${result.rows[0].name}`);
            console.log(`   Name (FR): ${result.rows[0].name_fr}`);
            console.log(`   Icon: ${result.rows[0].icon_name}`);
        } else {
            console.log('⚠️  Category "Suit (Full)" not found');
        }

    } catch (err) {
        console.error('❌ Error:', err.message);
    } finally {
        process.exit();
    }
}

renameSuitCategory();
