-- Migration: Add cleaner and driver tracking columns to orders
-- This enables tracking which cleaner received the order and which drivers handled pickup/delivery

ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS pickup_driver_id UUID REFERENCES users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS delivery_driver_id UUID REFERENCES users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS reception_cleaner_id UUID REFERENCES users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS pickup_item_count INT,
ADD COLUMN IF NOT EXISTS reception_item_count INT,
ADD COLUMN IF NOT EXISTS delivery_item_count INT,
ADD COLUMN IF NOT EXISTS pickup_type VARCHAR(50) DEFAULT 'immediate',
ADD COLUMN IF NOT EXISTS order_comment TEXT,
ADD COLUMN IF NOT EXISTS item_comment TEXT,
ADD COLUMN IF NOT EXISTS confirmed_item_count INT,
ADD COLUMN IF NOT EXISTS qr_code_data TEXT,
ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50) DEFAULT 'cash';

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_orders_pickup_driver ON orders(pickup_driver_id);
CREATE INDEX IF NOT EXISTS idx_orders_delivery_driver ON orders(delivery_driver_id);
CREATE INDEX IF NOT EXISTS idx_orders_reception_cleaner ON orders(reception_cleaner_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
