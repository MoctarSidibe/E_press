const QRCode = require('qrcode');

class QRService {
    /**
     * Generate QR code data for an order
     * @param {Object} order - Order object
     * @returns {String} JSON string to encode in QR
     */
    generateQRData(order) {
        const qrData = {
            orderId: order.id,
            orderNumber: order.order_number,
            customerName: order.customer_name || '',
            customerPhone: order.customer_phone || '',
            itemCount: order.confirmed_item_count || 0,
            createdAt: order.created_at,
            pickupAddress: order.pickup_address || '',
            deliveryAddress: order.delivery_address || ''
        };

        return JSON.stringify(qrData);
    }

    /**
     * Generate QR code image as base64
     * @param {String} data - Data to encode
     * @returns {Promise<String>} Base64 encoded PNG image
     */
    async generateQRImage(data) {
        try {
            // Generate QR code as data URL (base64)
            const qrCodeDataURL = await QRCode.toDataURL(data, {
                errorCorrectionLevel: 'H',  // High error correction (30% damage tolerance)
                type: 'image/png',
                width: 400,  // 400x400 pixels
                margin: 2,
                color: {
                    dark: '#000000',
                    light: '#FFFFFF'
                }
            });

            return qrCodeDataURL;
        } catch (error) {
            throw new Error(`QR Code generation failed: ${error.message}`);
        }
    }

    /**
     * Generate QR code data string (for storing in database)
     * @param {String} data - Data to encode
     * @returns {String} The data string to be encoded
     */
    generateQRCode(data) {
        // Simply return the data string - it will be encoded when needed
        return data;
    }

    /**
     * Validate and parse QR code data
     * @param {String} qrData - Scanned QR code data
     * @returns {Object} Parsed QR data
     */
    validateQRData(qrData) {
        try {
            const parsed = JSON.parse(qrData);

            // Validate required fields
            if (!parsed.orderId || !parsed.orderNumber) {
                throw new Error('Invalid QR code: missing order information');
            }

            return parsed;
        } catch (error) {
            throw new Error(`QR code validation failed: ${error.message}`);
        }
    }

    /**
     * Generate complete QR code package for order
     * @param {Object} order - Order object
     * @returns {Promise<Object>} QR data and image
     */
    async generateOrderQR(order) {
        const qrData = this.generateQRData(order);
        const qrImage = await this.generateQRImage(qrData);

        return {
            qrData,
            qrImage,
            qrImageFormat: 'data:image/png;base64'
        };
    }
}

module.exports = new QRService();
