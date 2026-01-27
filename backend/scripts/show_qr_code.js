const db = require('../database/db');
const qrService = require('../services/qr.service');
const fs = require('fs');
const path = require('path');

async function showOrderQR() {
    try {
        const orderId = process.argv[2];
        let query = 'SELECT * FROM orders ORDER BY created_at DESC LIMIT 1';
        let params = [];

        if (orderId) {
            query = 'SELECT * FROM orders WHERE id = $1';
            params = [orderId];
        }

        const res = await db.query(query, params);
        const order = res.rows[0];

        if (!order) {
            console.error('❌ No order found');
            process.exit(1);
        }

        console.log('✅ Found Order:', order.order_number);
        console.log('🆔 ID:', order.id);

        if (!order.qr_code_data) {
            console.log('⚠️ No QR data in DB, generating now...');
            const qrDataString = qrService.generateQRData(order);
            const qrCodeData = await qrService.generateQRCode(qrDataString);

            await db.query('UPDATE orders SET qr_code_data = $1 WHERE id = $2', [qrCodeData, order.id]);
            order.qr_code_data = qrCodeData;
        }

        // Generate Image from data
        let maxData = order.qr_code_data;
        try {
            maxData = JSON.stringify(JSON.parse(order.qr_code_data)); // Minify JSON
        } catch (e) {
            console.warn("⚠️ QR Data is not JSON, using as raw string");
        }
        console.log('📦 QR Data Content:', maxData);

        // Generate a base64 Data URL for the user to copy-paste into a browser if needed
        const qrImage = await qrService.generateQRImage(maxData);

        // Save to file for easy opening
        const base64Data = qrImage.replace(/^data:image\/png;base64,/, "");
        const fileName = `qr_${order.order_number}.png`;
        const filePath = path.join(__dirname, fileName);

        fs.writeFileSync(filePath, base64Data, 'base64');
        console.log(`🖼️  QR Image saved to: ${filePath}`);
        console.log('👉 Open this file to scan it with the app!');

    } catch (err) {
        console.error('Error:', err);
    } finally {
        process.exit();
    }
}

showOrderQR();
