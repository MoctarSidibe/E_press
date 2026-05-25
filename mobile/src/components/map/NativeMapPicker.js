/**
 * NativeMapPicker
 * ─────────────────────────────────────────────────────────────────────────────
 * Native react-native-maps picker — fully open-source, no API key required:
 *
 *   Standard  → Carto Voyager CDN (OSM data, free, no policy warning)
 *               basemaps.cartocdn.com — no registration, no rate limits for apps
 *
 *   Satellite → Esri World Imagery (arcgisonline.com, free, no API key)
 *             + Esri reference labels overlay
 *
 * Gestures are fully native (no WebView).
 * ─────────────────────────────────────────────────────────────────────────────
 */
import React, { useRef, useEffect, useCallback } from 'react';
import { StyleSheet } from 'react-native';
import MapView, { Marker, UrlTile, PROVIDER_DEFAULT } from 'react-native-maps';

// ── Tile sources ─────────────────────────────────────────────────────────────

// Carto Voyager — beautiful, free, OSM-based, no API key, no usage policy issues
const CARTO_URL = 'https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png';

// Esri World Imagery (satellite) — free, no API key
const ESRI_SAT_URL =
    'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';

// Esri reference labels overlay (roads / city names on satellite)
const ESRI_LABELS_URL =
    'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}';

// ── Component ─────────────────────────────────────────────────────────────────
const NativeMapPicker = ({
    region,            // { latitude, longitude, latitudeDelta, longitudeDelta }
    markerCoordinate,  // { latitude, longitude } | null — controlled from parent
    onLocationChange,  // (coord: {latitude, longitude}) => void
    mapType = 'standard',  // 'standard' | 'satellite'
    showUserLocation = true,
    style,
}) => {
    const mapRef = useRef(null);

    // Smoothly animate whenever the parent changes region (e.g. from search)
    useEffect(() => {
        if (region && mapRef.current) {
            mapRef.current.animateToRegion(
                {
                    latitude:      region.latitude,
                    longitude:     region.longitude,
                    latitudeDelta:  region.latitudeDelta  ?? 0.008,
                    longitudeDelta: region.longitudeDelta ?? 0.008,
                },
                450,
            );
        }
    }, [region?.latitude, region?.longitude]);

    const handleMapPress = useCallback((e) => {
        onLocationChange?.(e.nativeEvent.coordinate);
    }, [onLocationChange]);

    const handleDragEnd = useCallback((e) => {
        onLocationChange?.(e.nativeEvent.coordinate);
    }, [onLocationChange]);

    const isSatellite = mapType === 'satellite';

    return (
        <MapView
            ref={mapRef}
            provider={PROVIDER_DEFAULT}
            mapType="none"            // Hide Google/Apple base tiles → use UrlTile
            style={[styles.map, style]}
            initialRegion={region ?? DEFAULT_REGION}
            onPress={handleMapPress}
            showsUserLocation={showUserLocation}
            showsMyLocationButton={false}
            showsCompass={false}
            showsScale={false}
            rotateEnabled={false}
            pitchEnabled={false}
            toolbarEnabled={false}
            moveOnMarkerPress={false}
        >
            {/* Base tiles */}
            <UrlTile
                urlTemplate={isSatellite ? ESRI_SAT_URL : CARTO_URL}
                maximumZ={19}
                flipY={false}
                tileSize={256}
                zIndex={1}
            />

            {/* Satellite label overlay (roads, city names) */}
            {isSatellite && (
                <UrlTile
                    urlTemplate={ESRI_LABELS_URL}
                    maximumZ={19}
                    flipY={false}
                    tileSize={256}
                    zIndex={2}
                />
            )}

            {/* Draggable pin */}
            {markerCoordinate && (
                <Marker
                    coordinate={markerCoordinate}
                    draggable
                    onDragEnd={handleDragEnd}
                    tracksViewChanges={false}
                    pinColor="#00D4D4"
                />
            )}
        </MapView>
    );
};

// Default to Libreville, Gabon
const DEFAULT_REGION = {
    latitude:      0.3924,
    longitude:     9.4536,
    latitudeDelta:  0.05,
    longitudeDelta: 0.05,
};

const styles = StyleSheet.create({
    map: { flex: 1 },
});

export default NativeMapPicker;
