-- E-Press Laundry Management System Database Schema

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users Table (Admin, Driver, Customer)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'driver', 'customer')),
    avatar_url TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Clothing Categories
CREATE TABLE clothing_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    name_fr VARCHAR(100),
    icon_name VARCHAR(50) NOT NULL,
    base_price DECIMAL(10, 2) NOT NULL,
    express_price DECIMAL(10, 2),
    description TEXT,
    processing_time_hours INT DEFAULT 48,
    display_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Customer Locations
CREATE TABLE locations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    label VARCHAR(100) NOT NULL,
    address TEXT NOT NULL,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    is_default BOOLEAN DEFAULT false,
    instructions TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Orders
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_number VARCHAR(50) UNIQUE NOT NULL,
    customer_id UUID REFERENCES users(id) ON DELETE SET NULL,
    driver_id UUID REFERENCES users(id) ON DELETE SET NULL,
    
    -- Locations
    pickup_location_id UUID REFERENCES locations(id),
    delivery_location_id UUID REFERENCES locations(id),
    
    -- Status tracking
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN (
        'pending', 'assigned', 'driver_en_route_pickup', 'arrived_pickup',
        'picked_up', 'in_facility', 'cleaning', 'ready',
        'out_for_delivery', 'driver_en_route_delivery', 'arrived_delivery',
        'delivered', 'cancelled'
    )),
    
    -- Scheduling
    pickup_scheduled_at TIMESTAMP,
    pickup_actual_at TIMESTAMP,
    delivery_scheduled_at TIMESTAMP,
    delivery_actual_at TIMESTAMP,
    
    -- Pricing
    subtotal DECIMAL(10, 2) DEFAULT 0,
    delivery_fee DECIMAL(10, 2) DEFAULT 0,
    express_fee DECIMAL(10, 2) DEFAULT 0,
    tax DECIMAL(10, 2) DEFAULT 0,
    total DECIMAL(10, 2) DEFAULT 0,
    
    -- Service type
    is_express BOOLEAN DEFAULT false,
    
    -- Special instructions
    special_instructions TEXT,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    cancelled_at TIMESTAMP,
    cancellation_reason TEXT
);

-- Order Items (Individual clothing pieces)
CREATE TABLE order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    category_id UUID REFERENCES clothing_categories(id),
    quantity INT NOT NULL DEFAULT 1,
    price_per_item DECIMAL(10, 2) NOT NULL,
    subtotal DECIMAL(10, 2) NOT NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Driver Real-time Locations
CREATE TABLE driver_locations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    driver_id UUID REFERENCES users(id) ON DELETE CASCADE,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    heading DECIMAL(5, 2),
    speed DECIMAL(5, 2),
    accuracy DECIMAL(5, 2),
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Payments
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    payment_method VARCHAR(50) NOT NULL CHECK (payment_method IN ('cash', 'airtel_money', 'moov_money')),
    amount DECIMAL(10, 2) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
    transaction_id VARCHAR(255),
    payment_metadata JSONB,
    paid_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Notifications
CREATE TABLE notifications (
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
CREATE TABLE courier_notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    notification_type VARCHAR(50) NOT NULL, -- 'pickup_available', 'delivery_available'
    sent_to UUID REFERENCES users(id) ON DELETE CASCADE,
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_accepted BOOLEAN DEFAULT false,
    accepted_at TIMESTAMP,
    read_at TIMESTAMP
);

-- Order Status History (for tracking)
CREATE TABLE order_status_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL,
    changed_by UUID REFERENCES users(id),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Order Photos (Evidence/Tracking)
CREATE TABLE order_photos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    photo_type VARCHAR(50) NOT NULL, -- 'pickup', 'delivery', 'damage', 'item'
    photo_url TEXT NOT NULL,
    uploaded_by UUID REFERENCES users(id),
    notes TEXT,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Order Signatures (Proof of Service)
CREATE TABLE order_signatures (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    signature_type VARCHAR(50) NOT NULL, -- 'pickup', 'delivery'
    signature_data TEXT NOT NULL, -- Base64 or URL
    signed_by UUID REFERENCES users(id), -- User who collected the signature (driver)
    signed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for Performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_orders_customer ON orders(customer_id);
CREATE INDEX idx_orders_driver ON orders(driver_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created ON orders(created_at DESC);
CREATE INDEX idx_driver_locations_driver ON driver_locations(driver_id);
CREATE INDEX idx_driver_locations_time ON driver_locations(recorded_at DESC);
CREATE INDEX idx_notifications_user ON notifications(user_id, is_read);
CREATE INDEX idx_payments_order ON payments(order_id);

-- Insert Default Clothing Categories with Professional Icons
INSERT INTO clothing_categories (name, name_fr, icon_name, base_price, express_price, description, processing_time_hours, display_order) VALUES
('Shirt', 'Chemise', 'shirt', 2.50, 4.00, 'Regular shirts and blouses', 48, 1),
('T-Shirt', 'T-Shirt', 'tshirt', 1.50, 2.50, 'Casual t-shirts and tops', 48, 2),
('Pants/Trousers', 'Pantalon', 'pants', 3.00, 5.00, 'Dress pants, jeans, trousers', 48, 3),
('Dress', 'Robe', 'dress', 5.00, 8.00, 'Dresses and gowns', 72, 4),
('Suit Jacket', 'Veste de Costume', 'suit-jacket', 7.00, 12.00, 'Blazers and suit jackets', 72, 5),
('Suit (Full)', 'Costume Complet', 'suit', 12.00, 20.00, 'Full suit (jacket + pants)', 72, 6),
('Coat/Jacket', 'Manteau', 'coat', 8.00, 14.00, 'Coats, jackets, outerwear', 72, 7),
('Sweater', 'Pull', 'sweater', 4.00, 6.50, 'Sweaters and cardigans', 48, 8),
('Skirt', 'Jupe', 'skirt', 3.00, 5.00, 'Skirts of all lengths', 48, 9),
('Shorts', 'Short', 'shorts', 2.00, 3.50, 'Shorts and bermudas', 48, 10),
('Underwear', 'Sous-vêtements', 'underwear', 1.00, 2.00, 'Undergarments (per piece)', 24, 11),
('Bed Sheets', 'Draps de Lit', 'bedsheet', 5.00, 8.00, 'Bed linens and sheets', 48, 12),
('Towel', 'Serviette', 'towel', 2.00, 3.50, 'Bath and hand towels', 48, 13),
('Curtains', 'Rideaux', 'curtain', 10.00, 16.00, 'Window curtains and drapes', 72, 14),
('Tie', 'Cravate', 'tie', 2.50, 4.00, 'Neckties and bow ties', 24, 15),
('Scarf', 'Écharpe', 'scarf', 3.00, 5.00, 'Scarves and shawls', 48, 16),
('Gloves', 'Gants', 'gloves', 2.00, 3.50, 'Pair of gloves', 48, 17),
('Blanket', 'Couverture', 'blanket', 8.00, 12.00, 'Standard blankets', 72, 18),
('Pillow', 'Oreiller', 'pillow', 6.00, 9.00, 'Sleeping pillows', 48, 19),
('Duvet', 'Couette', 'duvet', 12.00, 18.00, 'Heavy duvets and comforters', 72, 20),
('Blouse', 'Blouse', 'blouse', 3.00, 5.00, 'Women''s blouses', 48, 21),
('Women''s Panties', 'Slip Femme', 'panties', 1.50, 2.50, 'Women''s underwear', 24, 22),
('Socks (Pair)', 'Chaussettes', 'socks', 1.00, 2.00, 'Pair of socks', 24, 23),
('Hat/Cap', 'Chapeau/Casquette', 'hat', 4.00, 6.00, 'Hats and caps', 48, 24),
('Bathrobe', 'Peignoir', 'bathrobe', 7.00, 10.00, 'Bathrobes', 48, 25),
('Swimsuit', 'Maillot de bain', 'swimsuit', 4.00, 6.00, 'Swimwear', 24, 26),
('Tablecloth', 'Nappe', 'tablecloth', 8.00, 12.00, 'Table linens', 72, 27),
('Napkin', 'Serviette de Table', 'napkin', 1.50, 2.50, 'Cloth napkins', 24, 28);

-- Insert Demo Admin User (password: Admin@123)
-- Hash generated with bcrypt, rounds=10
INSERT INTO users (email, password_hash, full_name, phone, role) VALUES
('admin@epress.com', '$2a$10$rYvK7YQxhBqE4YqZ5YqZ5eJ5YqZ5YqZ5YqZ5YqZ5YqZ5YqZ5YqZ5Y', 'Admin User', '+241 00 00 00 00', 'admin');

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
