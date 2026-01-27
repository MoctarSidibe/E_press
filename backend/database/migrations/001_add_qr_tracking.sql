-- Migration: Add QR Tracking System Tables and Fields
-- Version: V1.0
-- Date: 2026-01-11

-- =====================================================
-- 1. CREATE NEW TABLES
-- =====================================================

-- Order Photos Table
CREATE TABLE IF NOT EXISTS order_photos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    photo_type VARCHAR(50) NOT NULL CHECK (photo_type IN ('pickup', 'delivery', 'issue')),
    photo_url TEXT NOT NULL,
    uploaded_by UUID REFERENCES users(id),
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notes TEXT
);

CREATE INDEX idx_order_photos_order ON order_photos(order_id);
CREATE INDEX idx_order_photos_type ON order_photos(photo_type);

-- Order Signatures Table
CREATE TABLE IF NOT EXISTS order_signatures (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    signature_type VARCHAR(50) NOT NULL CHECK (signature_type IN ('pickup', 'delivery')),
    signature_data TEXT NOT NULL,  -- Base64 encoded signature image
    signed_by VARCHAR(255) NOT NULL,  -- Customer name
    signed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_order_signatures_order ON order_signatures(order_id);
CREATE INDEX idx_order_signatures_type ON order_signatures(signature_type);

-- Courier Notifications Table
CREATE TABLE IF NOT EXISTS courier_notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    notification_type VARCHAR(50) NOT NULL CHECK (notification_type IN ('pickup_available', 'delivery_available')),
    sent_to UUID NOT NULL REFERENCES users(id),  -- courier user
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    read_at TIMESTAMP,
    accepted_at TIMESTAMP,
    is_accepted BOOLEAN DEFAULT false
);

CREATE INDEX idx_courier_notifs_order ON courier_notifications(order_id);
CREATE INDEX idx_courier_notifs_courier ON courier_notifications(sent_to);
CREATE INDEX idx_courier_notifs_accepted ON courier_notifications(is_accepted, sent_to);

-- =====================================================
-- 2. ALTER ORDERS TABLE
-- =====================================================

-- QR Code data
ALTER TABLE orders ADD COLUMN IF NOT EXISTS qr_code_data TEXT;

-- Item counts at different stages
ALTER TABLE orders ADD COLUMN IF NOT EXISTS confirmed_item_count INT;  -- Customer confirmed at order creation
ALTER TABLE orders ADD COLUMN IF NOT EXISTS pickup_item_count INT;     -- Courier confirmed at pickup
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_item_count INT;   -- Customer confirmed at delivery

-- Comments
ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_comment TEXT;   -- General order comment
ALTER TABLE orders ADD COLUMN IF NOT EXISTS item_comment TEXT;    -- Specific item notes

-- Separate pickup and delivery couriers
ALTER TABLE orders ADD COLUMN IF NOT EXISTS pickup_driver_id UUID REFERENCES users(id);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_driver_id UUID REFERENCES users(id);

-- Create indexes for new fields
CREATE INDEX IF NOT EXISTS idx_orders_pickup_driver ON orders(pickup_driver_id);
CREATE INDEX IF NOT EXISTS idx_orders_delivery_driver ON orders(delivery_driver_id);

-- =====================================================
-- 3. ADD COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON TABLE order_photos IS 'Stores photos taken at pickup, delivery, or for issues';
COMMENT ON TABLE order_signatures IS 'Stores customer signatures at pickup and delivery';
COMMENT ON TABLE courier_notifications IS 'Tracks notifications sent to couriers for available orders';

COMMENT ON COLUMN orders.qr_code_data IS 'JSON data encoded in QR code (order ID, customer info, item count)';
COMMENT ON COLUMN orders.confirmed_item_count IS 'Item count confirmed by customer when creating order';
COMMENT ON COLUMN orders.pickup_item_count IS 'Item count confirmed by courier at pickup';
COMMENT ON COLUMN orders.delivery_item_count IS 'Item count confirmed by customer at delivery';
COMMENT ON COLUMN orders.order_comment IS 'General order comment from customer';
COMMENT ON COLUMN orders.item_comment IS 'Specific notes about items (stains, special care, etc.)';
COMMENT ON COLUMN orders.pickup_driver_id IS 'Courier who picked up the order';
COMMENT ON COLUMN orders.delivery_driver_id IS 'Courier who delivered the order';

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
