const QRCode = require('qrcode');
const crypto = require('crypto');

// Two separate secrets — rotate independently
const QR_SECRET      = process.env.QR_SECRET      || 'epress_qr_v2_secret_CHANGE_IN_PROD';
const OFFLINE_SECRET = process.env.OFFLINE_SECRET  || 'epress_offline_v2_secret_CHANGE_IN_PROD';

class QRService {

    // ─────────────────────────────────────────────
    // INTERNAL: HMAC helpers
    // ─────────────────────────────────────────────

    _sign(payload, secret) {
        // Deterministic: sort keys before stringifying
        const data = JSON.stringify(payload, Object.keys(payload).sort());
        return crypto.createHmac('sha256', secret).update(data).digest('hex');
    }

    _verify(payload, sig, secret) {
        const expected = this._sign(payload, secret);
        try {
            return crypto.timingSafeEqual(
                Buffer.from(expected, 'hex'),
                Buffer.from(sig.padEnd(64, '0').slice(0, 64), 'hex')
            );
        } catch {
            return false;
        }
    }

    _randomNonce() {
        return crypto.randomBytes(16).toString('hex'); // 32 hex chars
    }

    // ─────────────────────────────────────────────
    // ONLINE QR: signed by server secret
    // ─────────────────────────────────────────────

    /**
     * Build a signed QR payload for a confirmed server order.
     * Returns a JSON string ready to be encoded into a QR image.
     */
    generateQRData(order) {
        const payload = {
            v:           2,
            orderId:     order.id,
            orderNumber: order.order_number,
            userId:      order.user_id,
            amount:      Number(order.total_amount) || 0,
            iat:         Math.floor(Date.now() / 1000),   // issued-at (unix)
            nonce:       this._randomNonce(),
        };
        const sig = this._sign(payload, QR_SECRET);
        return JSON.stringify({ ...payload, sig });
    }

    /**
     * Validate a QR code scanned by a driver/cleaner.
     * Throws on any tampering, expiry or replay attempt.
     * Caller must also check nonce in DB to prevent replays.
     */
    validateQRData(qrData) {
        let parsed;
        try {
            parsed = JSON.parse(qrData);
        } catch {
            throw new Error('QR invalide : format illisible');
        }

        const { sig, ...payload } = parsed;

        if (!sig)
            throw new Error('QR invalide : signature absente');
        if (payload.v !== 2)
            throw new Error('QR invalide : version non supportée');
        if (!this._verify(payload, sig, QR_SECRET))
            throw new Error('QR invalide : signature incorrecte');

        // Freshness: valid for 48 h
        const age = Math.floor(Date.now() / 1000) - (payload.iat || 0);
        if (age > 48 * 3600)  throw new Error('QR expiré');
        if (age < -300)       throw new Error('QR invalide : horodatage futur');

        return payload;  // { v, orderId, orderNumber, userId, amount, iat, nonce }
    }

    // ─────────────────────────────────────────────
    // OFFLINE QR: signed by user token (device)
    // Server re-verifies during sync using stored token hash
    // ─────────────────────────────────────────────

    /**
     * Verify an offline QR payload submitted during sync.
     * @param {Object} payload   - unsigned fields from device
     * @param {string} sig       - HMAC submitted by device
     * @param {string} tokenHash - SHA-256(user JWT) stored on server at login
     */
    verifyOfflineQR(payload, sig, tokenHash) {
        const offlineKey = crypto
            .createHmac('sha256', OFFLINE_SECRET)
            .update(tokenHash)
            .digest('hex');
        return this._verify(payload, sig, offlineKey);
    }

    // ─────────────────────────────────────────────
    // QR IMAGE generation
    // ─────────────────────────────────────────────

    async generateQRImage(data) {
        return QRCode.toDataURL(data, {
            errorCorrectionLevel: 'H',
            type:   'image/png',
            width:  400,
            margin: 2,
            color:  { dark: '#000000', light: '#FFFFFF' },
        });
    }

    async generateOrderQR(order) {
        const qrData  = this.generateQRData(order);
        const qrImage = await this.generateQRImage(qrData);
        return { qrData, qrImage };
    }
}

module.exports = new QRService();
