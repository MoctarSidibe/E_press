import axios from 'axios';

// Using OSRM Public API
// Note: For heavy production use, consider hosting your own OSRM instance or using a provider like Mapbox.
// This public server is free but has usage policies (fair use).
const OSRM_BASE_URL = 'https://router.project-osrm.org/route/v1/driving';

export const routingService = {
    /**
     * Get route between two coordinates
     * @param {Object} start - { latitude, longitude }
     * @param {Object} end - { latitude, longitude }
     * @returns {Promise<Array>} - Array of coordinates [{latitude, longitude}, ...]
     */
    getRoute: async (start, end) => {
        try {
            if (!start || !end) return [];

            // OSRM expects: longitude,latitude;longitude,latitude
            const startStr = `${start.longitude},${start.latitude}`;
            const endStr = `${end.longitude},${end.latitude}`;

            // Request GeoJSON for easy parsing
            const url = `${OSRM_BASE_URL}/${startStr};${endStr}?overview=full&geometries=geojson`;

            const response = await axios.get(url);

            if (response.data.code !== 'Ok' || !response.data.routes || response.data.routes.length === 0) {
                console.warn('OSRM Route Error:', response.data);
                return [];
            }

            const route = response.data.routes[0];
            const coordinates = route.geometry.coordinates.map(coord => ({
                latitude: coord[1],
                longitude: coord[0]
            }));

            return {
                coordinates,
                distance: route.distance, // meters
                duration: route.duration  // seconds
            };

        } catch (error) {
            console.error('Routing Service Error:', error);
            return null;
        }
    }
};
