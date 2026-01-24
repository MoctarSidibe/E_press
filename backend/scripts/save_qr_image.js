require('dotenv').config({ path: '../.env' });
const db = require('../database/db');
const qrService = require('../services/qr.service');
const fs = require('fs');
const path = require('path');

async function saveLatestOrderQR() {
    try {
        // 1. Get latest order
        const res = await db.query('SELECT * FROM orders ORDER BY created_at DESC LIMIT 1');
        if (res.rows.length === 0) {
            console.error('No orders found');
            process.exit(1);
        }
        const order = res.rows[0];
        console.log(`Generating QR for Order: ${order.order_number}`);

        // 2. Generate QR Data
        const qrDataString = qrService.generateQRData(order);

        // 3. Generate Image (Data URL)
        const dataUrl = await qrService.generateQRImage(qrDataString);

        // 4. Save to file
        // Remove "data:image/png;base64," prefix
        const base64Data = dataUrl.replace(/^data:image\/png;base64,/, "");
        const outputPath = path.join(__dirname, '../../docs/cleaner_test_qr.png');

        fs.writeFileSync(outputPath, base64Data, 'base64');
        console.log(`QR Code Image saved to: ${outputPath}`);

    } catch (err) {
        console.error('Error:', err);
    } finally {
        process.exit();
    }
}

saveLatestOrderQR();
