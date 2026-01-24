const db = require('./database/db');
require('dotenv').config();

async function listCategories() {
    try {
        const result = await db.query(
            `SELECT name, name_fr, icon_name, base_price, display_order 
             FROM clothing_categories 
             WHERE is_active = true 
             ORDER BY display_order ASC`
        );

        console.log('Current Active Categories:\n');
        console.log('═'.repeat(80));
        result.rows.forEach((c, i) => {
            console.log(`${String(i + 1).padStart(2)}. ${c.name.padEnd(25)} | Order: ${String(c.display_order).padStart(3)} | $${c.base_price}`);
        });
        console.log('═'.repeat(80));
        console.log(`\nTotal: ${result.rows.length} active categories`);

    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        process.exit();
    }
}

listCategories();
