-- Migration 008: Update categories to match official E-Press Barème pricing
-- All base_price values: stored_price × 100 = FCFA displayed (e.g. 40.00 → 4000 Fcfa)
-- Express price = base_price × 1.20 (20% surcharge)

-- Remove all existing categories (they will be replaced by the official barème)
DELETE FROM order_items WHERE category_id IN (SELECT id FROM clothing_categories);
DELETE FROM clothing_categories;

-- ─── INSERT OFFICIAL BARÈME ──────────────────────────────────────────────────

-- VÊTEMENTS HOMME & ENSEMBLE
INSERT INTO clothing_categories (name, name_fr, icon_name, base_price, express_price, display_order, processing_time_hours) VALUES
('Ensemble Homme',     'Ensemble Homme',     'human-male',          40.00, 48.00,  1,  48),
('Ensemble Dame',      'Ensemble Dame',      'human-female',        40.00, 48.00,  2,  48),
('Costume',            'Costume',            'briefcase',           50.00, 60.00,  3,  48);

-- CHEMISES & HAUTS
INSERT INTO clothing_categories (name, name_fr, icon_name, base_price, express_price, display_order, processing_time_hours) VALUES
('Chemise',            'Chemise',            'shirt',               15.00, 18.00,  4,  24),
('Haut Boubou',        'Haut Boubou',        'tshirt-crew',         20.00, 24.00,  5,  24),
('Haut Dame',          'Haut Dame',          'tshirt-crew-outline', 15.00, 18.00,  6,  24),
('T-Shirt',            'T-Shirt',            'tshirt-crew',         15.00, 18.00,  7,  24),
('Polo',               'Polo',               'polo',                15.00, 18.00,  8,  24),
('Débardeur',          'Débardeur',          'human',               10.00, 12.00,  9,  24);

-- PANTALONS
INSERT INTO clothing_categories (name, name_fr, icon_name, base_price, express_price, display_order, processing_time_hours) VALUES
('Pantalon',           'Pantalon',           'pants',               20.00, 24.00, 10,  24),
('Pantalon Dame',      'Pantalon Dame',      'pants',               25.00, 30.00, 11,  24),
('Pantalon Jeans',     'Pantalon Jeans',     'pants',               20.00, 24.00, 12,  24);

-- JUPES & ROBES
INSERT INTO clothing_categories (name, name_fr, icon_name, base_price, express_price, display_order, processing_time_hours) VALUES
('Jupe Simple',        'Jupe Simple',        'skirt',               20.00, 24.00, 13,  24),
('Jupe Plissée',       'Jupe Plissée',       'skirt',               25.00, 30.00, 14,  24),
('Robe Simple',        'Robe Simple',        'dress',               30.00, 36.00, 15,  48),
('Robe de Soirée',     'Robe de Soirée',     'dress',              120.00,144.00, 16,  72),
('Robe de Mariage',    'Robe de Mariage',    'dress',              300.00,360.00, 17,  96);

-- SOUS-VÊTEMENTS
INSERT INTO clothing_categories (name, name_fr, icon_name, base_price, express_price, display_order, processing_time_hours) VALUES
('Culotte',            'Culotte',            'underwear',           10.00, 12.00, 18,  24);

-- VÊTEMENTS D'EXTÉRIEUR
INSERT INTO clothing_categories (name, name_fr, icon_name, base_price, express_price, display_order, processing_time_hours) VALUES
('Blouson',            'Blouson',            'jacket',              25.00, 30.00, 19,  48),
('Peignoir',           'Peignoir',           'coat',                25.00, 30.00, 20,  48);

-- COMBINAISON / PROFESSIONNEL
INSERT INTO clothing_categories (name, name_fr, icon_name, base_price, express_price, display_order, processing_time_hours) VALUES
('Combinaison',        'Combinaison',        'coverall',            40.00, 48.00, 21,  48);

-- LINGE DE MAISON
INSERT INTO clothing_categories (name, name_fr, icon_name, base_price, express_price, display_order, processing_time_hours) VALUES
('Drap Simple',        'Drap Simple',        'bed',                 20.00, 24.00, 22,  48),
('Paire de Drap',      'Paire de Drap',      'bed',                 40.00, 48.00, 23,  48),
('Couvre-Lit',         'Couvre-Lit',         'bed',                100.00,120.00, 24,  72),
('Serviette',          'Serviette',          'towel',               10.00, 12.00, 25,  24),
('Rideau',             'Rideau',             'curtain',             25.00, 30.00, 26,  72);
