/**
 * orderCode.js
 *
 * Generates tamper-proof offline order codes and signs payloads
 * using HMAC-SHA256 via the Web Crypto API (available in RN 0.71+).
 *
 * Code format:  EP-[3 alphanum]-[DDMM]
 * Example:      EP-7X4-2703
 *
 * Security model:
 *  - Every offline order gets a one-time nonce (prevents replay)
 *  - Payload is HMAC-signed with a key derived from the user's auth token
 *  - Server re-verifies the signature using its stored token hash during sync
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const CHARSET      = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no I, O, 0, 1 (ambiguous)
const OFFLINE_SALT = 'epress_offline_v2_salt_2024';       // must match backend OFFLINE_SECRET logic

// ─────────────────────────────────────────────
// Code generation
// ─────────────────────────────────────────────

/**
 * Generate a human-readable order code: EP-7X4-2703
 * Collision-safe for normal daily order volumes.
 */
export function generateOrderCode() {
    const now = new Date();
    const dd  = String(now.getDate()).padStart(2, '0');
    const mm  = String(now.getMonth() + 1).padStart(2, '0');

    let hash = '';
    const bytes = new Uint8Array(3);
    crypto.getRandomValues(bytes);
    bytes.forEach(b => { hash += CHARSET[b % CHARSET.length]; });

    return `EP-${hash}-${dd}${mm}`;
}

/**
 * Generate a random 32-char hex nonce (one-time use per order).
 */
export function generateNonce() {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

// ─────────────────────────────────────────────
// HMAC signing (Web Crypto API)
// ─────────────────────────────────────────────

/**
 * Derive a signing key from the user's auth token.
 * key = HMAC-SHA256(OFFLINE_SALT, authToken)  — same derivation as backend
 */
async function deriveKey(authToken) {
    const enc      = new TextEncoder();
    const saltKey  = await crypto.subtle.importKey(
        'raw', enc.encode(OFFLINE_SALT),
        { name: 'HMAC', hash: 'SHA-256' },
        false, ['sign']
    );
    const derivedBuf = await crypto.subtle.sign('HMAC', saltKey, enc.encode(authToken));
    // Use derived bytes as the actual signing key
    return crypto.subtle.importKey(
        'raw', derivedBuf,
        { name: 'HMAC', hash: 'SHA-256' },
        false, ['sign']
    );
}

/**
 * Sign a payload object. Returns hex string.
 * payload keys are sorted for determinism (matches backend).
 */
export async function signPayload(payload, authToken) {
    const key  = await deriveKey(authToken);
    const data = JSON.stringify(payload, Object.keys(payload).sort());
    const sig  = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data));
    return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// ─────────────────────────────────────────────
// Full offline order payload builder
// ─────────────────────────────────────────────

/**
 * Build and sign a complete offline order payload.
 * Returns { payload, sig, client_code, client_nonce }
 * ready to be stored in SQLite and later synced.
 */
export async function buildOfflineOrder(orderData, userId) {
    const authToken = await AsyncStorage.getItem('authToken') || '';

    const client_code  = generateOrderCode();
    const client_nonce = generateNonce();

    const payload = {
        client_code,
        client_nonce,
        user_id:          userId,
        pickup_address:   orderData.pickup_address   || '',
        delivery_address: orderData.delivery_address || '',
        items:            orderData.items            || [],
        total_amount:     orderData.total_amount     || 0,
        notes:            orderData.notes            || '',
        iat:              Math.floor(Date.now() / 1000),
    };

    const sig = await signPayload(payload, authToken);

    return { payload, sig, client_code, client_nonce };
}

// ─────────────────────────────────────────────
// QR payload builder (for display after order creation)
// ─────────────────────────────────────────────

/**
 * Build QR content string for an offline order.
 * The QR encodes the signed payload so a livreur can scan it
 * even without connectivity — they see order details + signature.
 */
export async function buildOfflineQRContent(orderId, payload, sig) {
    return JSON.stringify({
        v:            'offline',
        local_id:     orderId,
        client_code:  payload.client_code,
        user_id:      payload.user_id,
        total_amount: payload.total_amount,
        items_count:  payload.items?.length || 0,
        iat:          payload.iat,
        sig,                         // HMAC — livreur app can't forge this
    });
}
