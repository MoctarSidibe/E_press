import React, { useRef, useEffect, useState } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';

const OpenStreetMap = ({
    initialRegion,
    markers = [],
    circles = [],
    polylines = [],
    onRegionChange,
    onMapPress,
    interaction = 'static', // 'static', 'picker', 'nav'
    style
}) => {
    const webViewRef = useRef(null);
    const [isLoaded, setIsLoaded] = useState(false);

    // Initial positioning
    const lat = initialRegion?.latitude || 48.8566;
    const lng = initialRegion?.longitude || 2.3522;
    const zoom = 15;

    // Generate Marker JS
    const markersJs = markers.map(m => `
        L.marker([${m.latitude}, ${m.longitude}]).addTo(map)
        .bindPopup("${m.title || ''}")
        ${m.description ? `.openPopup()` : ''};
    `).join('\n');

    // Generate Circle JS
    const circlesJs = circles.map(c => `
        L.circle([${c.latitude}, ${c.longitude}], {
            color: '${c.strokeColor || 'blue'}',
            fillColor: '${c.fillColor || '#30f'}',
            fillOpacity: 0.5,
            radius: ${c.radius || 200}
        }).addTo(map);
    `).join('\n');

    // Generate Polyline JS
    // Support explicit polylines prop OR fallback to connecting markers if nav mode
    const polylinesJs = [];

    if (polylines && polylines.length > 0) {
        polylines.forEach(p => {
            const latlngs = p.coordinates.map(c => `[${c.latitude}, ${c.longitude}]`).join(',');
            polylinesJs.push(`
                var line = L.polyline([${latlngs}], {color: '${p.strokeColor || 'blue'}', weight: ${p.strokeWidth || 3}}).addTo(map);
                map.fitBounds(line.getBounds(), {padding: [50, 50]});
            `);
        });
    } else if (markers.length > 1 && interaction === 'nav') {
        const latlngs = markers.map(m => `[${m.latitude}, ${m.longitude}]`).join(',');
        polylinesJs.push(`
            var line = L.polyline([${latlngs}], {color: 'blue'}).addTo(map);
            map.fitBounds(line.getBounds(), {padding: [50, 50]});
        `);
    }

    const finalPolylinesJs = polylinesJs.join('\n');

    const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=" crossorigin=""/>
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=" crossorigin=""></script>
        <style>
            body { margin: 0; padding: 0; }
            #map { width: 100vw; height: 100vh; }
            .center-marker {
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -100%); /* Bottom-center of pin is target */
                z-index: 1000;
                pointer-events: none;
            }
        </style>
    </head>
    <body>
        <div id="map"></div>
        ${interaction === 'picker' ? `<img src="https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png" class="center-marker" />` : ''}

        <script>
            var map = L.map('map', { zoomControl: false }).setView([${lat}, ${lng}], ${zoom});
            
            L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; OpenStreetMap contributors'
            }).addTo(map);

            // Add markers
            ${markersJs}

            // Add circles
            ${circlesJs}

            // Add polylines
            // Add polylines
            ${finalPolylinesJs}

            // Events
            map.on('moveend', function() {
                var center = map.getCenter();
                window.ReactNativeWebView.postMessage(JSON.stringify({
                    type: 'regionChange',
                    latitude: center.lat,
                    longitude: center.lng,
                    latitudeDelta: 0.01,
                    longitudeDelta: 0.01
                }));
            });

            map.on('click', function(e) {
                window.ReactNativeWebView.postMessage(JSON.stringify({
                    type: 'mapPress',
                    latitude: e.latlng.lat,
                    longitude: e.latlng.lng
                }));
            });
        </script>
    </body>
    </html>
    `;

    const handleMessage = (event) => {
        try {
            const data = JSON.parse(event.nativeEvent.data);
            if (data.type === 'regionChange' && onRegionChange) {
                onRegionChange({
                    latitude: data.latitude,
                    longitude: data.longitude,
                    latitudeDelta: data.latitudeDelta,
                    longitudeDelta: data.longitudeDelta,
                });
            } else if (data.type === 'mapPress' && onMapPress) {
                onMapPress({
                    latitude: data.latitude,
                    longitude: data.longitude
                });
            }
        } catch (e) {
            console.error("OpenStreetMap message error:", e);
        }
    };

    return (
        <View style={[styles.container, style]}>
            <WebView
                ref={webViewRef}
                originWhitelist={['*']}
                source={{ html }}
                onMessage={handleMessage}
                style={styles.webview}
                onLoadEnd={() => setIsLoaded(true)}
            />
            {!isLoaded && (
                <View style={styles.loading}>
                    <ActivityIndicator size="large" color="#0000ff" />
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f0f0f0',
    },
    webview: {
        flex: 1,
    },
    loading: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f0f0f0',
    },
});

export default OpenStreetMap;
