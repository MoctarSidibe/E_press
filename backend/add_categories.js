const db = require('./database/db');
require('dotenv').config();

async function addMissingCategories() {
    console.log('Checking for missing categories...');
    try {
        const categoriesToAdd = [
            { name: 'Leather Jacket', name_fr: 'Veste en Cuir', icon: 'leather-jacket', price: 10.00 },
            { name: 'Polo', name_fr: 'Polo', icon: 'polo', price: 3.00 },
            { name: 'Sweatshirt', name_fr: 'Sweatshirt', icon: 'hoodie', price: 4.50 },
            { name: 'Panties', name_fr: 'Culotte', icon: 'panties', price: 1.50 },
            { name: 'Baby Clothes', name_fr: 'Vêtements Bébé', icon: 'baby-clothes', price: 2.00 },
            { name: 'Vest', name_fr: 'Gilet', icon: 'vest', price: 4.00 }
        ];

        for (const cat of categoriesToAdd) {
            const check = await db.query('SELECT * FROM clothing_categories WHERE name = $1', [cat.name]);
            if (check.rows.length === 0) {
                console.log(`Adding missing category: ${cat.name}`);
                await db.query(
                    `INSERT INTO clothing_categories (name, name_fr, icon_name, base_price) VALUES ($1, $2, $3, $4)`,
                    [cat.name, cat.name_fr, cat.icon, cat.price]
                );
            } else {
                console.log(`Category exists: ${cat.name}`);
            }
        }
        console.log('✅ process complete');

    } catch (err) {
        console.error('❌ Error:', err.message);
    } finally {
        process.exit();
    }
}

addMissingCategories();
