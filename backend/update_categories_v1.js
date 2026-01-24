const db = require('./database/db');
require('dotenv').config();

/**
 * Update categories for V1 implementation:
 * - Remove "Coat/Jacket" category (set is_active = false)
 * - Add "Coverall" category
 * - Add "Officer Uniform" category
 * - Update "Suit (Full)" to ensure proper icon reference
 */

async function updateCategories() {
    console.log('🔄 Updating categories for V1...\n');

    try {
        // 1. Deactivate Coat/Jacket category
        console.log('1️⃣ Deactivating Coat/Jacket category...');
        const deactivateResult = await db.query(
            `UPDATE clothing_categories 
             SET is_active = false 
             WHERE name = $1 
             RETURNING name`,
            ['Coat/Jacket']
        );

        if (deactivateResult.rows.length > 0) {
            console.log(`   ✅ Deactivated: ${deactivateResult.rows[0].name}`);
        } else {
            console.log('   ℹ️  Coat/Jacket not found (already removed or doesn\'t exist)');
        }

        // 2. Add Coverall category if it doesn't exist
        console.log('\n2️⃣ Adding Coverall category...');
        const coverallCheck = await db.query(
            'SELECT * FROM clothing_categories WHERE name = $1',
            ['Coverall']
        );

        if (coverallCheck.rows.length === 0) {
            await db.query(
                `INSERT INTO clothing_categories 
                 (name, name_fr, icon_name, base_price, express_price, description, processing_time_hours, display_order, is_active) 
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
                [
                    'Coverall',
                    'Combinaison',
                    'coverall',
                    6.00,
                    10.00,
                    'Work coveralls and overalls',
                    72,
                    7,  // display_order (replacing Coat/Jacket)
                    true
                ]
            );
            console.log('   ✅ Added: Coverall');
        } else {
            console.log('   ℹ️  Coverall already exists');
            // Make sure it's active
            await db.query(
                'UPDATE clothing_categories SET is_active = true WHERE name = $1',
                ['Coverall']
            );
        }

        // 3. Add Officer Uniform category if it doesn't exist
        console.log('\n3️⃣ Adding Officer Uniform category...');
        const uniformCheck = await db.query(
            'SELECT * FROM clothing_categories WHERE name = $1',
            ['Officer Uniform']
        );

        if (uniformCheck.rows.length === 0) {
            await db.query(
                `INSERT INTO clothing_categories 
                 (name, name_fr, icon_name, base_price, express_price, description, processing_time_hours, display_order, is_active) 
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
                [
                    'Officer Uniform',
                    'Uniforme d\'Officier',
                    'customs-officer',
                    15.00,
                    25.00,
                    'Police, military, and customs officer uniforms',
                    96,
                    29,  // display_order (add at end)
                    true
                ]
            );
            console.log('   ✅ Added: Officer Uniform');
        } else {
            console.log('   ℹ️  Officer Uniform already exists');
            // Make sure it's active
            await db.query(
                'UPDATE clothing_categories SET is_active = true WHERE name = $1',
                ['Officer Uniform']
            );
        }

        // 4. Update Suit (Full) icon if needed
        console.log('\n4️⃣ Updating Suit (Full) icon reference...');
        await db.query(
            `UPDATE clothing_categories 
             SET icon_name = $1 
             WHERE name = $2`,
            ['suit', 'Suit (Full)']
        );
        console.log('   ✅ Updated: Suit (Full) icon_name to "suit"');

        // 5. Display current active categories
        console.log('\n📋 Current Active Categories:');
        console.log('═'.repeat(80));
        const categories = await db.query(
            `SELECT name, name_fr, icon_name, base_price, express_price, display_order 
             FROM clothing_categories 
             WHERE is_active = true 
             ORDER BY display_order ASC`
        );

        categories.rows.forEach((cat, index) => {
            console.log(`${index + 1}. ${cat.name.padEnd(20)} | Icon: ${cat.icon_name.padEnd(15)} | $${cat.base_price}`);
        });
        console.log('═'.repeat(80));

        console.log('\n✅ Category update complete!');
        console.log('\n📝 Summary:');
        console.log('   • Removed: Coat/Jacket');
        console.log('   • Added: Coverall');
        console.log('   • Added: Officer Uniform');
        console.log('   • Updated: Suit (Full) icon reference');

    } catch (err) {
        console.error('\n❌ Error:', err.message);
        console.error(err);
    } finally {
        process.exit();
    }
}

updateCategories();
