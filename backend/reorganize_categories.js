const db = require('./database/db');
require('dotenv').config();

/**
 * Reorganize categories with professional display order
 * Groups:
 * 1. Everyday Wear (1-10)
 * 2. Outerwear & Formal (11-16)
 * 3. Professional & Uniforms (17-19)
 * 4. Household Linens (20-22)
 * 5. Children & Baby (23)
 */

async function reorganizeCategories() {
    console.log('🔄 Reorganizing categories with professional display order...\n');

    try {
        const categoryOrder = [
            // Group 1: Everyday Wear (1-10)
            { name: 'Shirt', display_order: 1 },
            { name: 'T-Shirt', display_order: 2 },
            { name: 'Polo', display_order: 3 },
            { name: 'Pants/Trousers', display_order: 4 },
            { name: 'Dress', display_order: 5 },
            { name: 'Skirt', display_order: 6 },
            { name: 'Shorts', display_order: 7 },
            { name: 'Underwear', display_order: 8 },
            { name: 'Panties', display_order: 9 },
            { name: 'Sportswear', display_order: 10 },

            // Group 2: Outerwear & Formal (11-16)
            { name: 'Jacket / Coat', display_order: 11 },
            { name: 'Leather Jacket', display_order: 12 },
            { name: 'Sweater', display_order: 13 },
            { name: 'Sweatshirt', display_order: 14 },
            { name: 'Suit', display_order: 15 },
            { name: 'Vest', display_order: 16 },

            // Group 3: Professional & Uniforms (17-19)
            { name: 'Officer Uniform', display_order: 17 },
            { name: 'Coverall', display_order: 18 },
            { name: 'Tie', display_order: 19 },

            // Group 4: Household Linens (20-22)
            { name: 'Bed Sheets', display_order: 20 },
            { name: 'Towel', display_order: 21 },
            { name: 'Curtains', display_order: 22 },

            // Group 5: Children & Baby (23)
            { name: 'Baby Clothes', display_order: 23 }
        ];

        console.log('Updating display order for all categories...\n');

        for (const category of categoryOrder) {
            const result = await db.query(
                `UPDATE clothing_categories 
                 SET display_order = $1 
                 WHERE name = $2 
                 RETURNING name, display_order`,
                [category.display_order, category.name]
            );

            if (result.rows.length > 0) {
                const group =
                    category.display_order <= 10 ? '📦 Everyday Wear' :
                        category.display_order <= 16 ? '👔 Outerwear & Formal' :
                            category.display_order <= 19 ? '💼 Professional & Uniforms' :
                                category.display_order <= 22 ? '🏠 Household Linens' :
                                    '👶 Children & Baby';

                console.log(`✅ ${String(category.display_order).padStart(2)}. ${result.rows[0].name.padEnd(25)} | ${group}`);
            } else {
                console.log(`⚠️  Category not found: ${category.name}`);
            }
        }

        // Verify final order
        console.log('\n📋 Final Category Order:');
        console.log('═'.repeat(80));

        const verification = await db.query(
            `SELECT name, display_order 
             FROM clothing_categories 
             WHERE is_active = true 
             ORDER BY display_order ASC`
        );

        let currentGroup = '';
        verification.rows.forEach(cat => {
            const group =
                cat.display_order <= 10 ? 'Everyday Wear' :
                    cat.display_order <= 16 ? 'Outerwear & Formal' :
                        cat.display_order <= 19 ? 'Professional & Uniforms' :
                            cat.display_order <= 22 ? 'Household Linens' :
                                'Children & Baby';

            if (group !== currentGroup) {
                console.log(`\n${group}:`);
                currentGroup = group;
            }
            console.log(`  ${String(cat.display_order).padStart(2)}. ${cat.name}`);
        });

        console.log('\n═'.repeat(80));
        console.log('✅ Category reorganization complete!');

    } catch (err) {
        console.error('❌ Error:', err.message);
        console.error(err);
    } finally {
        process.exit();
    }
}

reorganizeCategories();
