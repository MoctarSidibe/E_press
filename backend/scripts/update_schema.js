const db = require('../database/db');

async function updateSchema() {
    console.log('🔄 Starting schema update...');

    const client = await db.pool.connect();

    try {
        await client.query('BEGIN');

        // Create order_photos table
        await client.query(`
            CREATE TABLE IF NOT EXISTS order_photos (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
                photo_type VARCHAR(50) NOT NULL,
                photo_url TEXT NOT NULL,
                uploaded_by UUID REFERENCES users(id),
                notes TEXT,
                uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('✅ order_photos table created/verified');

        // Create order_signatures table
        await client.query(`
            CREATE TABLE IF NOT EXISTS order_signatures (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
                signature_type VARCHAR(50) NOT NULL,
                signature_data TEXT NOT NULL,
                signed_by UUID REFERENCES users(id),
                signed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('✅ order_signatures table created/verified');

        await client.query('COMMIT');
        console.log('🎉 Schema update completed successfully!');
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Schema update failed:', error);
    } finally {
        client.release();
        process.exit();
    }
}

updateSchema();
