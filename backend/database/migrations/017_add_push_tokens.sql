-- Migration 017: Expo push token storage
-- The mobile app registers an Expo push token after login and persists it here
-- so the backend can deliver remote notifications (order updates, KYC results)
-- to users who aren't actively connected to the socket.

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS push_token       VARCHAR(255),
    ADD COLUMN IF NOT EXISTS push_platform    VARCHAR(20),   -- 'ios' | 'android'
    ADD COLUMN IF NOT EXISTS push_token_at    TIMESTAMP;

-- Lookups by token (rare — for unregister-on-collision flows) and
-- bulk fetch of "users with a valid token" stay fast.
CREATE INDEX IF NOT EXISTS idx_users_push_token
    ON users (push_token)
    WHERE push_token IS NOT NULL;
