-- Migration 016: Link laveries to their owner user
-- Adds user_id FK so a cleaner's laverie can be found/deduped by user, not name

ALTER TABLE laveries
    ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_laveries_user_id ON laveries (user_id);
