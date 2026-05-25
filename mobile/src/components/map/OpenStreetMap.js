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
    mapType = 'standard',   // 'standard', 'satellite'
    command,                // JS string to inject on change (for panning/placing markers)
    style
}) => {
    const webViewRef = useRef(null);
    const [isLoaded, setIsLoaded] = useState(false);

    // Inject JS command whenever it changes (after map is loaded)
    useEffect(() => {
        if (command && webViewRef.current && isLoaded) {
            webViewRef.current.injectJavaScript(command + '\ntrue;');
        }
    }, [command, isLoaded]);

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

    // For picker mode: tap-to-place draggable marker logic
    const pickerJs = interaction === 'picker' ? `
        var pickerMarker = null;

        function placePickerMarker(lat, lng) {
            if (pickerMarker) {
                pickerMarker.setLatLng([lat, lng]);
            } else {
                pickerMarker = L.marker([lat, lng], {
                    draggable: true,
                    icon: L.divIcon({
                        className: '',
                        html: '<svg viewBox="0 0 32 42" width="32" height="42" xmlns="http://www.w3.org/2000/svg"><path d="M16 0C9.37 0 4 5.37 4 12c0 9 12 30 12 30s12-21 12-30C28 5.37 22.63 0 16 0z" fill="#00D4D4" stroke="#007a7a" stroke-width="1.5"/><circle cx="16" cy="12" r="5" fill="white"/></svg>',
                        iconSize: [32, 42],
                        iconAnchor: [16, 42]
                    })
                }).addTo(map);

                pickerMarker.on('dragend', function(e) {
                    var pos = e.target.getLatLng();
                    window.ReactNativeWebView.postMessage(JSON.stringify({
                        type: 'mapPress',
                        latitude: pos.lat,
                        longitude: pos.lng
                    }));
                });
            }
            window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'mapPress',
                latitude: lat,
                longitude: lng
            }));
        }

        map.on('click', function(e) {
            placePickerMarker(e.latlng.lat, e.latlng.lng);
        });
    ` : `
        map.on('click', function(e) {
            window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'mapPress',
                latitude: e.latlng.lat,
                longitude: e.latlng.lng
            }));
        });
    `;

    const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=" crossorigin=""/>
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=" crossorigin=""></script>
        <style>
            * { box-sizing: border-box; }
            body { margin: 0; padding: 0; overflow: hidden; touch-action: none; }
            #map { width: 100vw; height: 100vh; touch-action: none; }
        </style>
    </head>
    <body>
        <div id="map"></div>

        <script>
            var map = L.map('map', { zoomControl: false }).setView([${lat}, ${lng}], ${zoom});

            var tileUrl = '${mapType === 'satellite'
                ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
                : 'https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png'}';

            var attribution = '${mapType === 'satellite'
                ? 'Tiles &copy; Esri'
                : '&copy; OpenStreetMap contributors'}';

            L.tileLayer(tileUrl, {
                attribution: attribution,
                maxZoom: 19
            }).addTo(map);

            // Add static markers
            ${markersJs}

            // Add circles
            ${circlesJs}

            // Add polylines
            ${finalPolylinesJs}

            // Picker or static click handler
            ${pickerJs}

            // Region change
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
                javaScriptEnabled={true}
                domStorageEnabled={true}
                scrollEnabled={false}
                bounces={false}
                overScrollMode="never"
                nestedScrollEnabled={false}
                allowsInlineMediaPlayback={true}
                mixedContentMode="always"
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
