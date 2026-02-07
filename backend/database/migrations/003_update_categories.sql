-- Migration: Remove scarf, gloves, swimsuit; Add uniform, security vest
-- Run on server: sudo -u postgres psql -d epress_laundry -f /path/to/003_update_categories.sql

DELETE FROM clothing_categories WHERE name IN ('Scarf', 'Gloves', 'Swimsuit');

INSERT INTO clothing_categories (name, name_fr, icon_name, base_price, express_price, description, processing_time_hours, display_order)
SELECT 'Uniform', 'Uniforme', 'uniform', 12.00, 18.00, 'Work and service uniforms', 72, 16
WHERE NOT EXISTS (SELECT 1 FROM clothing_categories WHERE name = 'Uniform');

INSERT INTO clothing_categories (name, name_fr, icon_name, base_price, express_price, description, processing_time_hours, display_order)
SELECT 'Security Vest', 'Gilet de Sécurité', 'security-vest', 6.00, 10.00, 'High-visibility security vests', 48, 17
WHERE NOT EXISTS (SELECT 1 FROM clothing_categories WHERE name = 'Security Vest');
