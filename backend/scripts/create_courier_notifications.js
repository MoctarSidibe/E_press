const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const db = require('../database/db');

async function createCourierNotificationsTable() {
    console.log('🔄 Creating courier_notifications table...');

    const client = await db.pool.connect();

    try {
        await client.query('BEGIN');

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

        // Add indexes for performance
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_courier_notif_order ON courier_notifications(order_id);
            CREATE INDEX IF NOT EXISTS idx_courier_notif_driver ON courier_notifications(sent_to);
            CREATE INDEX IF NOT EXISTS idx_courier_notif_status ON courier_notifications(is_accepted);
        `);

        await client.query('COMMIT');
        console.log('✅ courier_notifications table created successfully!');
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Failed to create table:', error);
    } finally {
        client.release();
        process.exit();
    }
}

createCourierNotificationsTable();
