-- Migration 011: Ghost Laverie System
-- Adds laveries table and assigns nearest laverie to orders automatically

-- ─── Laveries table ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS laveries (
    id                    SERIAL PRIMARY KEY,
    name                  VARCHAR(120)     NOT NULL,
    address               TEXT,
    phone                 VARCHAR(30),
    lat                   DECIMAL(10, 7)   NOT NULL,
    lng                   DECIMAL(10, 7)   NOT NULL,
    radius_km             DECIMAL(5, 2)    NOT NULL DEFAULT 5.0,
    max_concurrent_orders INTEGER          NOT NULL DEFAULT 20,
    active                BOOLEAN          NOT NULL DEFAULT TRUE,
    created_at            TIMESTAMP        NOT NULL DEFAULT NOW(),
    updated_at            TIMESTAMP        NOT NULL DEFAULT NOW()
);

-- Index for geolocation queries
CREATE INDEX IF NOT EXISTS idx_laveries_active ON laveries (active);
CREATE INDEX IF NOT EXISTS idx_laveries_lat_lng ON laveries (lat, lng);

-- ─── Add laverie assignment columns to orders ──────────────────────────────────
ALTER TABLE orders
    ADD COLUMN IF NOT EXISTS assigned_laverie_id INTEGER REFERENCES laveries(id),
    ADD COLUMN IF NOT EXISTS pickup_lat           DECIMAL(10, 7),
    ADD COLUMN IF NOT EXISTS pickup_lng           DECIMAL(10, 7),
    ADD COLUMN IF NOT EXISTS laverie_distance_km  DECIMAL(6, 3);

CREATE INDEX IF NOT EXISTS idx_orders_laverie ON orders (assigned_laverie_id);

-- ─── Auto-update updated_at on laveries ───────────────────────────────────────
CREATE OR REPLACE FUNCTION update_laveries_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_laveries_updated_at ON laveries;
CREATE TRIGGER trg_laveries_updated_at
    BEFORE UPDATE ON laveries
    FOR EACH ROW EXECUTE FUNCTION update_laveries_updated_at();
