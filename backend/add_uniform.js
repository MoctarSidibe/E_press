const db = require('./database/db');
require('dotenv').config();

async function addUniformOfficer() {
    console.log('Adding "Uniform Officer" category...');
    try {
        const cat = { name: 'Uniform Officer', name_fr: 'Uniforme Officier', icon: 'customs-officer', price: 12.00 };

        const check = await db.query('SELECT * FROM clothing_categories WHERE name = $1', [cat.name]);
        if (check.rows.length === 0) {
            console.log(`Adding category: ${cat.name}`);
            await db.query(
                `INSERT INTO clothing_categories (name, name_fr, icon_name, base_price) VALUES ($1, $2, $3, $4)`,
                [cat.name, cat.name_fr, cat.icon, cat.price]
            );
        } else {
            console.log(`Category exists: ${cat.name}`);
        }
        console.log('✅ process complete');

    } catch (err) {
        console.error('❌ Error:', err.message);
    } finally {
        process.exit();
    }
}

addUniformOfficer();
