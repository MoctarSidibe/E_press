-- Migration: Remove Blouse, Bathrobe, Duvet, Suit Jacket
-- Run on server: sudo -u postgres psql -d epress_laundry -c "..." (see below)

DELETE FROM clothing_categories WHERE name IN ('Blouse', 'Bathrobe', 'Duvet', 'Suit Jacket');
