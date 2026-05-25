-- Migration 018: Convert laveries.user_id from INTEGER to UUID
-- The original 016_add_user_id_to_laveries.sql used INTEGER (wrong — users.id is
-- UUID). Migration 016 has since been corrected for fresh installs, but already-
-- deployed databases ran the broken column type. This migration fixes them.
--
-- Safe so long as laveries.user_id holds no meaningful integer references. If
-- it does (post-016 INSERTs), they'd already be NULLs (since the FK to users.id
-- UUID could never have been satisfied) — those NULLs survive the conversion.

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'laveries'
          AND column_name = 'user_id'
          AND data_type   = 'integer'
    ) THEN
        ALTER TABLE laveries DROP COLUMN user_id;
        ALTER TABLE laveries
            ADD COLUMN user_id UUID REFERENCES users(id) ON DELETE SET NULL;
        CREATE INDEX IF NOT EXISTS idx_laveries_user_id ON laveries (user_id);
        RAISE NOTICE 'laveries.user_id converted from INTEGER to UUID';
    ELSE
        RAISE NOTICE 'laveries.user_id is already UUID (or missing) — no-op';
    END IF;
END $$;
