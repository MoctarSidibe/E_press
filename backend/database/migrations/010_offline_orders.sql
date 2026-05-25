-- Migration 010: Offline order support + secure QR nonce tracking

-- Offline orders: created on device when no connectivity
CREATE TABLE IF NOT EXISTS offline_orders (
    id                  UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_code         VARCHAR(20)  UNIQUE NOT NULL,   -- EP-7X4-2703
    client_nonce        VARCHAR(32)  UNIQUE NOT NULL,   -- one-time anti-replay token
    client_sig          VARCHAR(64)  NOT NULL,          -- HMAC-SHA256 hex
    user_id             UUID         REFERENCES users(id) ON DELETE SET NULL,
    order_id            UUID         REFERENCES orders(id) ON DELETE SET NULL, -- NULL until synced
    payload             JSONB        NOT NULL,          -- full order payload
    device_id           VARCHAR(100),
    status              VARCHAR(20)  NOT NULL DEFAULT 'pending',
    -- pending | synced | rejected | expired
    rejection_reason    TEXT,
    created_at_device   TIMESTAMP    NOT NULL,          -- device local time
    synced_at           TIMESTAMP,
    created_at          TIMESTAMP    DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_offline_orders_user    ON offline_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_offline_orders_code    ON offline_orders(client_code);
CREATE INDEX IF NOT EXISTS idx_offline_orders_status  ON offline_orders(status);

-- QR nonces: prevents QR replay attacks (each QR nonce can only be used once)
CREATE TABLE IF NOT EXISTS qr_nonces (
    nonce       VARCHAR(32)  PRIMARY KEY,
    order_id    UUID         REFERENCES orders(id) ON DELETE CASCADE,
    used_by     UUID         REFERENCES users(id),
    used_at     TIMESTAMP    DEFAULT NOW(),
    expires_at  TIMESTAMP    NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_qr_nonces_expires ON qr_nonces(expires_at);

-- Auto-expire old nonces (cleanup via scheduled task or on insert)
-- Orders table: add client_code column for tracking offline origin
ALTER TABLE orders ADD COLUMN IF NOT EXISTS client_code    VARCHAR(20)  UNIQUE;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS is_offline_origin BOOLEAN   DEFAULT FALSE;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS synced_at      TIMESTAMP;
