-- Migration 012: Add Tenue Professionnelle to clothing categories
INSERT INTO clothing_categories (name, name_fr, icon_name, base_price, express_price, display_order, processing_time_hours)
VALUES ('Tenue Professionnelle', 'Tenue Professionnelle', 'customs-officer', 30.00, 36.00, 6, 48)
ON CONFLICT DO NOTHING;
