const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');

const data = JSON.stringify({
    "orderId": "c3635d6a-e0fe-4ee9-9f41-21b93d2600bb",
    "orderNumber": "TEST-CLEAN-90",
    "customerName": "Test Customer",
    "itemCount": 3
});

const outputPath = path.join('C:\\Users\\user\\.gemini\\antigravity\\brain\\8ca901e4-5e01-4abf-9928-6b6963a8b321', 'test_clean_90_qr.png');

QRCode.toFile(outputPath, data, {
    color: {
        dark: '#000000',
        light: '#FFFFFF'
    },
    width: 400
}, function (err) {
    if (err) throw err;
    console.log('✅ QR code saved to:', outputPath);
});
