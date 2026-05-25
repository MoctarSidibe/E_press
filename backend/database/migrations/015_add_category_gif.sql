-- Add gif_url column to clothing_categories
ALTER TABLE clothing_categories ADD COLUMN IF NOT EXISTS gif_url TEXT;
