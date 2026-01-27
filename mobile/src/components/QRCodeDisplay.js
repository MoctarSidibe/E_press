import React from 'react';
import { View, StyleSheet } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

/**
 * QR Code Display Component
 * @param {Object} props
 * @param {String} props.value - Data to encode in QR
 * @param {Number} props.size - QR code size (default: 200)
 * @param {String} props.backgroundColor - Background color (default: white)
 * @param {String} props.color - QR code color (default: black)
 */
const QRCodeDisplay = ({
    value,
    size = 200,
    backgroundColor = '#ffffff',
    color = '#000000',
    logo = null
}) => {
    if (!value) {
        return null;
    }

    return (
        <View style={styles.container}>
            <QRCode
                value={value}
                size={size}
                backgroundColor={backgroundColor}
                color={color}
                logo={logo}
                logoSize={size * 0.2}
                logoBackgroundColor="#ffffff"
                logoMargin={2}
                logoBorderRadius={5}
                quietZone={10}
                enableLinearGradient={false}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: 10,
    }
});

export default QRCodeDisplay;
