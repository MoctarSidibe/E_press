-- Migration: Add Coverall and Leather Jacket categories
-- These categories are missing from the initial schema

INSERT INTO clothing_categories (name, name_fr, icon_name, base_price, express_price, description, processing_time_hours, display_order) VALUES
('Coverall', 'Combinaison', 'coverall', 12.00, 18.00, 'Work coveralls and jumpsuits', 72, 24),
('Leather Jacket', 'Veste en Cuir', 'leather-jacket', 15.00, 25.00, 'Leather jackets and coats', 72, 25),
('Hooded Sweatshirt', 'Sweat à Capuche', 'hooded-sweatshirt', 4.50, 7.00, 'Hooded sweatshirts and hoodies', 48, 26);
