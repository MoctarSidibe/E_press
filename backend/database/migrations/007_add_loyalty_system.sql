-- Migration 007: Add Loyalty System (Virtual Cards, Points, Coupons)

-- 1. Add loyalty fields to users table
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS card_number VARCHAR(20) UNIQUE,
    ADD COLUMN IF NOT EXISTS points_balance INT DEFAULT 0,
    ADD COLUMN IF NOT EXISTS points_earned_total INT DEFAULT 0;

-- Generate card numbers for existing users
UPDATE users
SET card_number = CONCAT('EP-',
    LPAD(FLOOR(RANDOM() * 9999 + 1)::TEXT, 4, '0'), '-',
    LPAD(FLOOR(RANDOM() * 9999 + 1)::TEXT, 4, '0'), '-',
    LPAD(FLOOR(RANDOM() * 9999 + 1)::TEXT, 4, '0')
)
WHERE card_number IS NULL;

-- 2. Points configuration table (admin-controlled)
CREATE TABLE IF NOT EXISTS points_config (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    points_per_1000_fcfa INT DEFAULT 10,        -- Points earned per 1000 FCFA spent
    points_value_fcfa INT DEFAULT 5,             -- Value of 1 point in FCFA (for redemption)
    min_redemption_points INT DEFAULT 100,       -- Minimum points to redeem
    max_redemption_percent INT DEFAULT 50,       -- Max % of order total payable with points
    is_active BOOLEAN DEFAULT true,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID REFERENCES users(id)
);

-- Insert default config
INSERT INTO points_config (points_per_1000_fcfa, points_value_fcfa, min_redemption_points, max_redemption_percent)
VALUES (10, 5, 100, 50)
ON CONFLICT DO NOTHING;

-- 3. Points transactions table
CREATE TABLE IF NOT EXISTS points_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('earned', 'redeemed', 'expired', 'admin_adjustment')),
    points INT NOT NULL,                         -- Positive = earned, Negative = redeemed
    balance_after INT NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_points_transactions_user ON points_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_points_transactions_order ON points_transactions(order_id);

-- 4. Coupons table
CREATE TABLE IF NOT EXISTS coupons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    discount_type VARCHAR(10) NOT NULL CHECK (discount_type IN ('percent', 'fixed')),
    discount_value DECIMAL(10, 2) NOT NULL,      -- % if percent, FCFA if fixed
    min_order_amount DECIMAL(10, 2) DEFAULT 0,   -- Minimum order total to use
    max_discount_amount DECIMAL(10, 2),          -- Cap for percent discounts
    max_uses INT DEFAULT NULL,                   -- NULL = unlimited
    uses_count INT DEFAULT 0,
    valid_from TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    valid_until TIMESTAMP,                       -- NULL = no expiry
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_coupons_code ON coupons(code);
CREATE INDEX IF NOT EXISTS idx_coupons_active ON coupons(is_active);

-- 5. Add coupon & points fields to orders
ALTER TABLE orders
    ADD COLUMN IF NOT EXISTS coupon_id UUID REFERENCES coupons(id),
    ADD COLUMN IF NOT EXISTS coupon_code VARCHAR(50),
    ADD COLUMN IF NOT EXISTS coupon_discount DECIMAL(10, 2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS points_redeemed INT DEFAULT 0,
    ADD COLUMN IF NOT EXISTS points_discount DECIMAL(10, 2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS points_earned INT DEFAULT 0;
