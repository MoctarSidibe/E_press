import React from 'react';
import { StyleSheet, View, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';

const LeafletMapComponent = ({
    origin,
    destination,
    driverLocation,
    style
}) => {

    // Create the HTML content for Leaflet
    const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
            <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=" crossorigin="" />
            <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=" crossorigin=""></script>
            <style>
                body { margin: 0; padding: 0; }
                #map { height: 100vh; width: 100vw; }
                .driver-icon {
                    font-size: 24px;
                    text-align: center;
                    display: block;
                }
            </style>
        </head>
        <body>
            <div id="map"></div>
            <script>
                // Initialize map
                var map = L.map('map').setView([${driverLocation?.latitude || 37.78825}, ${driverLocation?.longitude || -122.4324}], 13);

                // Add OpenStreetMap tiles
                L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    maxZoom: 19,
                    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                }).addTo(map);

                // Custom Icons
                var pickupIcon = L.icon({
                    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png',
                    iconSize: [25, 41],
                    iconAnchor: [12, 41],
                    popupAnchor: [1, -34],
                });

                var deliveryIcon = L.icon({
                    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
                    iconSize: [25, 41],
                    iconAnchor: [12, 41],
                    popupAnchor: [1, -34],
                });

                var driverIcon = L.divIcon({
                    className: 'driver-icon',
                    html: '🚗',
                    iconSize: [30, 30],
                    iconAnchor: [15, 15]
                });

                // Add Markers
                var driverMarker = L.marker([${driverLocation?.latitude || 0}, ${driverLocation?.longitude || 0}], {icon: driverIcon}).addTo(map);
                
                ${origin ? `L.marker([${origin.latitude}, ${origin.longitude}], {icon: pickupIcon}).addTo(map).bindPopup('Pickup');` : ''}
                ${destination ? `L.marker([${destination.latitude}, ${destination.longitude}], {icon: deliveryIcon}).addTo(map).bindPopup('Delivery');` : ''}

                // Function to update driver location
                function updateDriverLocation(lat, lng) {
                    var newLatLng = new L.LatLng(lat, lng);
                    driverMarker.setLatLng(newLatLng);
                    map.panTo(newLatLng);
                }
            </script>
        </body>
        </html>
    `;

    // Inject javascript to update position when props change
    const injectedJavaScript = `
        if (typeof updateDriverLocation === 'function') {
            updateDriverLocation(${driverLocation?.latitude}, ${driverLocation?.longitude});
        }
        true;
    `;

    return (
        <View style={[styles.container, style]}>
            <WebView
                originWhitelist={['*']}
                source={{ html: htmlContent }}
                style={styles.webview}
                injectedJavaScript={injectedJavaScript}
                startInLoadingState={true}
                renderLoading={() => <ActivityIndicator style={styles.loading} />}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        overflow: 'hidden',
    },
    webview: {
        flex: 1,
    },
    loading: {
        position: 'absolute',
        top: '50%',
        left: '50%',
        zIndex: 1,
    }
});

export default LeafletMapComponent;
