-- Migration 013: Add Veste en Cuir to clothing categories
INSERT INTO clothing_categories (name, name_fr, icon_name, base_price, express_price, display_order, processing_time_hours)
VALUES ('Veste en Cuir', 'Veste en Cuir', 'leather', 30.00, 36.00, 20, 48)
ON CONFLICT DO NOTHING;
