-- Migration: Add notification tables
-- These tables were defined in schema.sql but missing from migration files

-- Notifications (General user notifications)
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

-- Courier Notifications (For order offers)
CREATE TABLE IF NOT EXISTS courier_notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    notification_type VARCHAR(50) NOT NULL, -- 'pickup_available', 'delivery_available'
    sent_to UUID REFERENCES users(id) ON DELETE CASCADE,
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_accepted BOOLEAN DEFAULT false,
    accepted_at TIMESTAMP,
    read_at TIMESTAMP
);

-- Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read);
