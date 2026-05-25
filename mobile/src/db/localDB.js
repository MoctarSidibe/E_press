/**
 * localDB.js
 *
 * SQLite local database for offline-first order management.
 *
 * Tables:
 *   local_orders  — orders created on-device (pending sync or synced)
 *   sync_queue    — items waiting to be sent to the server
 *   cached_data   — lightweight key/value cache (categories, barème, etc.)
 */

import * as SQLite from 'expo-sqlite';

let _db = null;

function getDB() {
    if (!_db) _db = SQLite.openDatabaseSync('epress_offline.db');
    return _db;
}

// ─────────────────────────────────────────────
// Schema initialisation — call once at app start
// ─────────────────────────────────────────────

export async function initDB() {
    const db = getDB();

    db.execSync(`
        PRAGMA journal_mode = WAL;

        CREATE TABLE IF NOT EXISTS local_orders (
            id               TEXT PRIMARY KEY,          -- local UUID
            client_code      TEXT UNIQUE NOT NULL,      -- EP-7X4-2703
            client_nonce     TEXT UNIQUE NOT NULL,      -- one-time nonce
            sig              TEXT NOT NULL,             -- HMAC hex
            user_id          INTEGER,
            status           TEXT NOT NULL DEFAULT 'pending_sync',
            -- pending_sync | syncing | synced | rejected
            server_id        INTEGER,                   -- set after successful sync
            server_number    TEXT,                      -- e.g. ORD-0042
            payload          TEXT NOT NULL,             -- JSON string
            qr_content       TEXT,                      -- QR JSON string
            created_at       INTEGER NOT NULL,          -- unix ms
            synced_at        INTEGER,
            rejection_reason TEXT
        );

        CREATE INDEX IF NOT EXISTS idx_lo_status     ON local_orders(status);
        CREATE INDEX IF NOT EXISTS idx_lo_user       ON local_orders(user_id);
        CREATE INDEX IF NOT EXISTS idx_lo_code       ON local_orders(client_code);

        CREATE TABLE IF NOT EXISTS sync_queue (
            id           TEXT PRIMARY KEY,              -- = local_orders.id
            attempts     INTEGER NOT NULL DEFAULT 0,
            last_attempt INTEGER,                       -- unix ms
            next_attempt INTEGER NOT NULL DEFAULT 0,   -- unix ms (exponential backoff)
            created_at   INTEGER NOT NULL
        );

        CREATE TABLE IF NOT EXISTS cached_data (
            key        TEXT PRIMARY KEY,
            value      TEXT NOT NULL,
            expires_at INTEGER NOT NULL               -- unix ms
        );
    `);
}

// ─────────────────────────────────────────────
// local_orders CRUD
// ─────────────────────────────────────────────

/** Save a new offline order and add it to the sync queue. */
export function saveOfflineOrder({ id, client_code, client_nonce, sig, user_id, payload, qr_content }) {
    const db  = getDB();
    const now = Date.now();

    db.runSync(
        `INSERT OR IGNORE INTO local_orders
            (id, client_code, client_nonce, sig, user_id, status, payload, qr_content, created_at)
         VALUES (?,?,?,?,?,'pending_sync',?,?,?)`,
        [id, client_code, client_nonce, sig, user_id,
         typeof payload === 'string' ? payload : JSON.stringify(payload),
         qr_content || null, now]
    );

    db.runSync(
        `INSERT OR IGNORE INTO sync_queue (id, next_attempt, created_at)
         VALUES (?,?,?)`,
        [id, 0, now]
    );
}

/** Get all pending-sync orders (to attempt upload). */
export function getPendingSyncOrders() {
    const db  = getDB();
    const now = Date.now();
    const rows = db.getAllSync(
        `SELECT lo.*, sq.attempts, sq.next_attempt
         FROM local_orders lo
         JOIN sync_queue sq ON sq.id = lo.id
         WHERE lo.status = 'pending_sync'
           AND sq.next_attempt <= ?
         ORDER BY lo.created_at ASC
         LIMIT 20`,
        [now]
    );
    return rows.map(r => ({ ...r, payload: JSON.parse(r.payload) }));
}

/** Get all local orders for display (by user). */
export function getLocalOrders(userId) {
    const db = getDB();
    const rows = db.getAllSync(
        `SELECT * FROM local_orders WHERE user_id = ? ORDER BY created_at DESC`,
        [userId]
    );
    return rows.map(r => ({ ...r, payload: JSON.parse(r.payload) }));
}

/** Get one order by client_code. */
export function getOrderByCode(client_code) {
    const db = getDB();
    const row = db.getFirstSync(
        `SELECT * FROM local_orders WHERE client_code = ?`,
        [client_code]
    );
    return row ? { ...row, payload: JSON.parse(row.payload) } : null;
}

/** Mark order as synced with server response. */
export function markOrderSynced(id, server_id, server_number) {
    const db = getDB();
    db.runSync(
        `UPDATE local_orders
         SET status = 'synced', server_id = ?, server_number = ?, synced_at = ?
         WHERE id = ?`,
        [server_id, server_number, Date.now(), id]
    );
    db.runSync(`DELETE FROM sync_queue WHERE id = ?`, [id]);
}

/** Mark order as rejected (server refused). */
export function markOrderRejected(id, reason) {
    const db = getDB();
    db.runSync(
        `UPDATE local_orders
         SET status = 'rejected', rejection_reason = ?
         WHERE id = ?`,
        [reason, id]
    );
    db.runSync(`DELETE FROM sync_queue WHERE id = ?`, [id]);
}

// ─────────────────────────────────────────────
// sync_queue management
// ─────────────────────────────────────────────

/** Record a failed sync attempt with exponential backoff (max 1 h). */
export function recordSyncAttempt(id, failed = false) {
    const db = getDB();
    const row = db.getFirstSync(`SELECT attempts FROM sync_queue WHERE id = ?`, [id]);
    if (!row) return;

    const attempts = (row.attempts || 0) + 1;
    // Backoff: 30s, 2m, 8m, 32m, 60m (capped)
    const backoffMs = failed
        ? Math.min(30_000 * Math.pow(4, attempts - 1), 3_600_000)
        : 0;

    db.runSync(
        `UPDATE sync_queue
         SET attempts = ?, last_attempt = ?, next_attempt = ?
         WHERE id = ?`,
        [attempts, Date.now(), Date.now() + backoffMs, id]
    );
}

/** Count items currently in the sync queue. */
export function getSyncQueueCount() {
    const db  = getDB();
    const row = db.getFirstSync(
        `SELECT COUNT(*) as cnt FROM sync_queue sq
         JOIN local_orders lo ON lo.id = sq.id
         WHERE lo.status = 'pending_sync'`
    );
    return row?.cnt || 0;
}

// ─────────────────────────────────────────────
// cached_data helpers
// ─────────────────────────────────────────────

/** Write a value to the cache with a TTL (ms). */
export function cacheSet(key, value, ttlMs = 3_600_000) {
    const db = getDB();
    db.runSync(
        `INSERT OR REPLACE INTO cached_data (key, value, expires_at)
         VALUES (?,?,?)`,
        [key, JSON.stringify(value), Date.now() + ttlMs]
    );
}

/** Read from cache; returns null if missing or expired. */
export function cacheGet(key) {
    const db  = getDB();
    const row = db.getFirstSync(
        `SELECT value, expires_at FROM cached_data WHERE key = ?`,
        [key]
    );
    if (!row || Date.now() > row.expires_at) return null;
    try { return JSON.parse(row.value); } catch { return null; }
}

/** Purge all expired cache entries. */
export function cachePurgeExpired() {
    getDB().runSync(`DELETE FROM cached_data WHERE expires_at < ?`, [Date.now()]);
}
