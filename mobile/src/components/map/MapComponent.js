import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import MapView, { Marker, UrlTile } from 'react-native-maps';
import theme from '../../theme/theme';

const MapComponent = ({
    origin,
    destination,
    driverLocation,
    style
}) => {

    const initialRegion = {
        latitude: origin?.latitude || 37.78825,
        longitude: origin?.longitude || -122.4324,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
    };

    return (
        <View style={[styles.container, style]}>
            <MapView
                style={styles.map}
                initialRegion={initialRegion}
                showsUserLocation={true}
                mapType="none"
            >
                {/* Free OpenSource Maps (OpenStreetMap) */}
                <UrlTile
                    urlTemplate="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    maximumZ={19}
                    flipY={false}
                />

                {/* Origin Marker (Pickup) */}
                {origin && (
                    <Marker
                        coordinate={origin}
                        title="Pickup Location"
                        pinColor={theme.colors.primary}
                    />
                )}

                {/* Destination Marker (Delivery) */}
                {destination && (
                    <Marker
                        coordinate={destination}
                        title="Delivery Location"
                        pinColor={theme.colors.secondary}
                    />
                )}

                {/* Driver Marker */}
                {driverLocation && (
                    <Marker
                        coordinate={driverLocation}
                        title="Driver"
                        description="Your courier is here"
                    >
                        <View style={styles.driverMarker}>
                            <Text style={styles.driverEmoji}>🚗</Text>
                        </View>
                    </Marker>
                )}
            </MapView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        overflow: 'hidden',
        borderRadius: theme.borderRadius.lg,
    },
    map: {
        width: '100%',
        height: '100%',
    },
    driverMarker: {
        backgroundColor: '#fff',
        padding: 5,
        borderRadius: 15,
        borderWidth: 2,
        borderColor: theme.colors.primary,
        elevation: 5,
    },
    driverEmoji: {
        fontSize: 20,
    }
});

export default MapComponent;
