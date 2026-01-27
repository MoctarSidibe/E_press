const db = require('./database/db');
require('dotenv').config();

/**
 * Add Sportswear category with basketball-equipment icon
 */

async function addSportswear() {
    console.log('🔄 Adding Sportswear category...\n');

    try {
        // Check if Sportswear already exists
        const check = await db.query(
            'SELECT * FROM clothing_categories WHERE name = $1',
            ['Sportswear']
        );

        if (check.rows.length === 0) {
            await db.query(
                `INSERT INTO clothing_categories 
                 (name, name_fr, icon_name, base_price, express_price, description, processing_time_hours, display_order, is_active) 
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
                [
                    'Sportswear',
                    'Vêtements de Sport',
                    'basketball-equipment',
                    3.50,
                    5.50,
                    'Athletic and sports clothing',
                    48,
                    30,  // display_order (add at end)
                    true
                ]
            );
            console.log('✅ Added: Sportswear');
            console.log('   Name (FR): Vêtements de Sport');
            console.log('   Icon: basketball-equipment');
            console.log('   Price: $3.50 / Express: $5.50');
        } else {
            console.log('ℹ️  Sportswear already exists');
            // Make sure it's active
            await db.query(
                'UPDATE clothing_categories SET is_active = true WHERE name = $1',
                ['Sportswear']
            );
        }

        console.log('\n✅ Complete!');

    } catch (err) {
        console.error('❌ Error:', err.message);
    } finally {
        process.exit();
    }
}

addSportswear();
