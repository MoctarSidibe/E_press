# Mobile Dependencies Installation Guide

## Required Packages for QR Tracking

Run these commands in the `mobile` directory:

### Socket.IO Client
```bash
npm install socket.io-client
```

### QR Code Display
```bash
npx expo install react-native-qrcode-svg react-native-svg
```

### Camera & Barcode Scanner
```bash
npx expo install expo-camera expo-barcode-scanner
```

### Image Manipulation
```bash
npx expo install expo-image-picker expo-image-manipulator
```

### Signature Pad
```bash
npm install react-native-signature-canvas
```

## All in One (Copy & Paste)

```bash
cd mobile
npm install socket.io-client react-native-signature-canvas
npx expo install react-native-qrcode-svg react-native-svg expo-camera expo-barcode-scanner expo-image-picker expo-image-manipulator
```

## Next Steps After Installation

1. Create Socket.IO service
2. Create QR code display component
3. Create photo capture component
4. Create signature pad component
5. Enhance order creation screen
6. Create in-app receipt component
