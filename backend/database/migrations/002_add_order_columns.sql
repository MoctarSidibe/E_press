-- Migration: Add missing columns to orders table
-- Run this to add the new columns needed for the order creation flow

-- Add new columns to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS pickup_type VARCHAR(20) CHECK (pickup_type IN ('immediate', 'scheduled'));
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50) CHECK (payment_method IN ('cash', 'airtel_money', 'moov_money'));
ALTER TABLE orders ADD COLUMN IF NOT EXISTS qr_code_data TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_comment TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS item_comment TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS confirmed_item_count INT DEFAULT 0;

-- Add columns for dual driver system (pickup and delivery drivers)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS pickup_driver_id UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_driver_id UUID REFERENCES users(id) ON DELETE SET NULL;

-- Add item count tracking columns
ALTER TABLE orders ADD COLUMN IF NOT EXISTS pickup_item_count INT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_item_count INT;

-- Rename existing driver_id for clarity (optional, maintains backward compatibility)
-- The existing driver_id can be used as pickup_driver_id for now

COMMENT ON COLUMN orders.pickup_type IS 'Type of pickup: immediate or scheduled';
COMMENT ON COLUMN orders.payment_method IS 'Payment method selected by customer';
COMMENT ON COLUMN orders.qr_code_data IS 'QR code data for order tracking';
COMMENT ON COLUMN orders.order_comment IS 'General order comments/notes';
COMMENT ON COLUMN orders.item_comment IS 'Special instructions for specific items';
COMMENT ON COLUMN orders.confirmed_item_count IS 'Number of items confirmed at order creation';
COMMENT ON COLUMN orders.pickup_driver_id IS 'Driver assigned for pickup';
COMMENT ON COLUMN orders.delivery_driver_id IS 'Driver assigned for delivery';
COMMENT ON COLUMN orders.pickup_item_count IS 'Number of items counted at pickup';
COMMENT ON COLUMN orders.delivery_item_count IS 'Number of items counted at delivery';
