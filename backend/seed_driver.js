const db = require('./database/db');
const bcrypt = require('bcryptjs');

async function seedDriver() {
    try {
        console.log('Connecting to database...');
        const client = await db.pool.connect();

        const email = 'driver@epress.com';
        const password = 'password123';
        const fullName = 'John "Speedy" Driver';

        // Check if driver exists
        const checkRes = await client.query('SELECT * FROM users WHERE email = $1', [email]);

        if (checkRes.rows.length > 0) {
            console.log(`Driver account ${email} already exists.`);
            console.log('ID:', checkRes.rows[0].id);
            process.exit(0);
        }

        console.log('Creating new driver account...');
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(password, salt);

        const insertRes = await client.query(
            `INSERT INTO users (email, password_hash, full_name, role, phone, is_active) 
             VALUES ($1, $2, $3, 'driver', '555-0199', true) 
             RETURNING id, email, role`,
            [email, hash, fullName]
        );

        console.log('✅ Driver created successfully!');
        console.log('Email:', insertRes.rows[0].email);
        console.log('Password:', password);
        console.log('Role:', insertRes.rows[0].role);

        client.release();
    } catch (error) {
        console.error('Error seeding driver:', error);
    } finally {
        process.exit();
    }
}

seedDriver();
