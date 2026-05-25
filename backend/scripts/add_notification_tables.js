const db = require('../database/db');

async function addNotificationTables() {
    console.log('🔄 Starting notification tables creation...');

    const client = await db.pool.connect();

    try {
        await client.query('BEGIN');

        // Create notifications table
        console.log('Creating notifications table...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS notifications (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                user_id UUID REFERENCES users(id) ON DELETE CASCADE,
                title VARCHAR(255) NOT NULL,
                message TEXT NOT NULL,
                type VARCHAR(50) NOT NULL,
                is_read BOOLEAN DEFAULT false,
                data JSONB,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('✅ notifications table created/verified');

        // Create courier_notifications table
        console.log('Creating courier_notifications table...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS courier_notifications (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
                notification_type VARCHAR(50) NOT NULL,
                sent_to UUID REFERENCES users(id) ON DELETE CASCADE,
                sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                is_accepted BOOLEAN DEFAULT false,
                accepted_at TIMESTAMP,
                read_at TIMESTAMP
            );
        `);
        console.log('✅ courier_notifications table created/verified');

        // Create indexes
        console.log('Creating indexes...');
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read);
        `);
        console.log('✅ indexes created');

        await client.query('COMMIT');
        console.log('🎉 Notification tables setup completed successfully!');
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Table creation failed:', error);
    } finally {
        client.release();
        process.exit();
    }
}

addNotificationTables();
