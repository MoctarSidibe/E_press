import { useState } from 'react';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { Alert, Platform } from 'react-native';

export const useReceiptPDF = () => {
    const [isGenerating, setIsGenerating] = useState(false);

    const generatePDFHTML = (order) => {
        const subtotal = parseFloat(order.subtotal || 0).toFixed(2);
        const deliveryFee = parseFloat(order.delivery_fee || 0).toFixed(2);
        const expressFee = parseFloat(order.express_fee || 0).toFixed(2);
        const tax = parseFloat(order.tax || 0).toFixed(2);
        const total = parseFloat(order.total || 0).toFixed(2);

        // Generate QR Code URL (using an API for the PDF)
        const qrData = JSON.stringify({
            id: order.id,
            num: order.order_number
        });
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(qrData)}`;

        const createdDate = new Date(order.created_at).toLocaleString();
        const pickupDate = order.pickup_scheduled_at ? new Date(order.pickup_scheduled_at).toLocaleString() : 'Immediate Pickup';

        // Items HTML
        const itemsHtml = order.items.map(item => `
            <tr class="item-row">
                <td class="item-col quantity">${item.quantity}x</td>
                <td class="item-col name">
                    ${item.category_name || item.name || 'Item'}
                    ${item.notes ? `<div class="item-notes">${item.notes}</div>` : ''}
                </td>
                <td class="item-col price">$${(parseFloat(item.price_per_item || 0) * item.quantity).toFixed(2)}</td>
            </tr>
        `).join('');

        return `
            <!DOCTYPE html>
            <html>
            <head>
                <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
                <style>
                    body { font-family: 'Helvetica', 'Arial', sans-serif; color: #333; margin: 0; padding: 20px; background-color: #fff; }
                    .receipt-container { max-width: 800px; margin: 0 auto; border: 1px solid #eee; padding: 30px; border-radius: 8px; box-shadow: 0 4px 10px rgba(0,0,0,0.05); }
                    .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #1E88E5; padding-bottom: 20px; }
                    .company-name { font-size: 28px; font-weight: bold; color: #333; margin: 0; }
                    .subtitle { font-size: 14px; color: #666; margin-top: 5px; text-transform: uppercase; letter-spacing: 1px; }
                    
                    .qr-section { display: flex; justify-content: center; margin: 20px 0; background-color: #f9f9f9; padding: 15px; border-radius: 8px; }
                    .qr-code { width: 140px; height: 140px; }
                    .qr-label { text-align: center; font-size: 10px; color: #999; margin-top: 5px; }

                    .order-info { margin-bottom: 30px; text-align: center; }
                    .order-number { font-size: 24px; font-weight: bold; color: #1E88E5; margin-bottom: 5px; }
                    .order-date { font-size: 12px; color: #888; }
                    
                    .details-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; }
                    .detail-box { background: #f9f9f9; padding: 15px; border-radius: 6px; font-size: 12px; }
                    .detail-label { color: #888; font-weight: bold; margin-bottom: 4px; text-transform: uppercase; font-size: 10px; }
                    .detail-value { color: #333; font-weight: 600; font-size: 13px; }

                    .items-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
                    .items-header th { text-align: left; padding: 10px; border-bottom: 1px solid #ddd; color: #666; font-size: 12px; text-transform: uppercase; }
                    .item-row td { padding: 12px 10px; border-bottom: 1px solid #eee; }
                    .item-col.quantity { font-weight: bold; width: 40px; color: #1E88E5; }
                    .item-col.name { }
                    .item-col.price { text-align: right; font-weight: 600; width: 80px; }
                    .item-notes { font-size: 11px; color: #888; font-style: italic; margin-top: 3px; }

                    .totals-section { width: 100%; border-top: 2px solid #333; padding-top: 15px; }
                    .total-row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 13px; }
                    .total-row.final { font-size: 18px; font-weight: bold; margin-top: 10px; padding-top: 10px; border-top: 1px solid #eee; color: #1E88E5; }
                    
                    .footer { margin-top: 40px; text-align: center; font-size: 11px; color: #999; border-top: 1px solid #eee; padding-top: 20px; }
                </style>
            </head>
            <body>
                <div class="receipt-container">
                    <div class="header">
                        <h1 class="company-name">E-Press Laundry</h1>
                        <div class="subtitle">Premium Digital Receipt</div>
                    </div>

                    <div class="order-info">
                        <div class="order-number">#${order.order_number}</div>
                        <div class="order-date">${createdDate}</div>
                    </div>

                    <div class="qr-section">
                        <div>
                            <img src="${qrUrl}" class="qr-code" />
                            <div class="qr-label">SCAN FOR TRACKING</div>
                        </div>
                    </div>

                    <div class="details-grid">
                        <div class="detail-box">
                            <div class="detail-label">Service Type</div>
                            <div class="detail-value">${order.is_express ? '⚡ EXPRESS SERVICE' : 'Standard Service'}</div>
                        </div>
                        <div class="detail-box">
                            <div class="detail-label">Items Count</div>
                            <div class="detail-value">${order.items.length} Items</div>
                        </div>
                        <div class="detail-box">
                            <div class="detail-label">Pickup Schedule</div>
                            <div class="detail-value">${pickupDate}</div>
                        </div>
                        <div class="detail-box">
                            <div class="detail-label">Payment Method</div>
                            <div class="detail-value">${(order.payment_method || 'Cash').toUpperCase()}</div>
                        </div>
                    </div>
                    
                    ${order.order_comment ? `
                    <div class="detail-box" style="margin-bottom: 20px;">
                        <div class="detail-label">Special Instructions</div>
                        <div class="detail-value">${order.order_comment}</div>
                    </div>
                    ` : ''}

                    <table class="items-table">
                        <tr class="items-header">
                            <th width="10%">Qty</th>
                            <th width="70%">Item</th>
                            <th width="20%" style="text-align:right;">Price</th>
                        </tr>
                        ${itemsHtml}
                    </table>

                    <div class="totals-section">
                        <div class="total-row">
                            <span>Subtotal</span>
                            <span>$${subtotal}</span>
                        </div>
                        <div class="total-row">
                            <span>Delivery Fee</span>
                            <span>$${deliveryFee}</span>
                        </div>
                        ${parseFloat(expressFee) > 0 ? `
                        <div class="total-row">
                            <span>Express Fee</span>
                            <span>$${expressFee}</span>
                        </div>
                        ` : ''}
                        <div class="total-row">
                            <span>Tax (10%)</span>
                            <span>$${tax}</span>
                        </div>
                        <div class="total-row final">
                            <span>Total Amount</span>
                            <span>$${total}</span>
                        </div>
                    </div>

                    <div class="footer">
                        <p>Thank you for choosing E-Press Laundry!</p>
                        <p>This is a digital receipt. No signature required.</p>
                    </div>
                </div>
            </body>
            </html>
        `;
    };

    const downloadPDF = async (order) => {
        try {
            setIsGenerating(true);

            // 1. Generate HTML
            const html = generatePDFHTML(order);

            // 2. Create PDF
            const { uri } = await Print.printToFileAsync({
                html,
                base64: false
            });

            // 5. Save/Share Logic
            if (Platform.OS === 'android') {
                // Check if SAF is available
                if (FileSystem.StorageAccessFramework) {
                    try {
                        const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();

                        if (permissions.granted) {
                            const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
                            const newFileUri = await FileSystem.StorageAccessFramework.createFileAsync(
                                permissions.directoryUri,
                                `E-Press_Receipt_${order.order_number}`,
                                'application/pdf'
                            );

                            await FileSystem.writeAsStringAsync(newFileUri, base64, { encoding: FileSystem.EncodingType.Base64 });
                            Alert.alert('Download Complete', 'Receipt saved to your selected folder.');
                        } else {
                            // User cancelled permission - offer share as backup
                            await Sharing.shareAsync(uri, {
                                mimeType: 'application/pdf',
                                dialogTitle: 'Share Receipt',
                                UTI: 'com.adobe.pdf'
                            });
                        }
                    } catch (safError) {
                        console.error('SAF Error:', safError);
                        // Fallback
                        await Sharing.shareAsync(uri, {
                            mimeType: 'application/pdf',
                            dialogTitle: 'Share Receipt',
                            UTI: 'com.adobe.pdf'
                        });
                    }
                } else {
                    // SAF not available (older Android)
                    await Sharing.shareAsync(uri, {
                        mimeType: 'application/pdf',
                        dialogTitle: 'Share Receipt',
                        UTI: 'com.adobe.pdf'
                    });
                }
            } else {
                // iOS - Share Sheet is the standard "Save to Files" way
                await Sharing.shareAsync(uri, {
                    mimeType: 'application/pdf',
                    dialogTitle: 'Save to Files',
                    UTI: 'com.adobe.pdf'
                });
            }

        } catch (error) {
            console.error('PDF Generation Error:', error);
            Alert.alert('Error', 'Failed to generate PDF receipt. Please try again.');
        } finally {
            setIsGenerating(false);
        }
    };

    return {
        downloadPDF,
        isGenerating
    };
};
