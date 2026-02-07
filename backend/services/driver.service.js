const db = require('../database/db');

class DriverService {
    // Get assigned orders for driver
    async getDriverOrders(driverId, status = null) {
        let query = `
            SELECT o.*, 
                   c.full_name as customer_name, c.phone as customer_phone,
                   pl.address as pickup_address, pl.latitude as pickup_lat, pl.longitude as pickup_lng,
                   dl.address as delivery_address, dl.latitude as delivery_lat, dl.longitude as delivery_lng
            FROM orders o
            JOIN users c ON o.customer_id = c.id
            LEFT JOIN locations pl ON o.pickup_location_id = pl.id
            LEFT JOIN locations dl ON o.delivery_location_id = dl.id
            WHERE (o.pickup_driver_id = $1 OR o.delivery_driver_id = $1)
        `;

        const params = [driverId];

        if (status) {
            // If comma separated statuses
            if (status.includes(',')) {
                const statuses = status.split(',').map(s => s.trim());
                query += ` AND o.status = ANY($2::text[])`;
                params.push(statuses);
            } else {
                query += ' AND o.status = $2';
                params.push(status);
            }
        }

        query += ' ORDER BY o.pickup_scheduled_at ASC';

        const result = await db.query(query, params);
        return result.rows;
    }

    // Update driver location
    async updateLocation(driverId, locationData) {
        const { latitude, longitude, heading, speed, accuracy } = locationData;

        const result = await db.query(
            `INSERT INTO driver_locations (driver_id, latitude, longitude, heading, speed, accuracy)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING *`,
            [driverId, latitude, longitude, heading, speed, accuracy]
        );

        return result.rows[0];
    }

    // Get driver's current location
    async getCurrentLocation(driverId) {
        const result = await db.query(
            `SELECT * FROM driver_locations
             WHERE driver_id = $1
             ORDER BY recorded_at DESC
             LIMIT 1`,
            [driverId]
        );

        return result.rows[0] || null;
    }

    // Get all active drivers (admin)
    async getAllDrivers() {
        const result = await db.query(
            `SELECT u.id, u.full_name, u.phone, u.email, u.avatar_url,
                    dl.latitude, dl.longitude, dl.recorded_at as last_location_update
             FROM users u
             LEFT JOIN LATERAL (
                 SELECT latitude, longitude, recorded_at
                 FROM driver_locations
                 WHERE driver_id = u.id
                 ORDER BY recorded_at DESC
                 LIMIT 1
             ) dl ON true
             WHERE u.role = 'driver' AND u.is_active = true
             ORDER BY u.full_name ASC`
        );

        return result.rows;
    }

    // Get driver statistics
    async getDriverStats(driverId) {
        const result = await db.query(
            `SELECT 
                (SELECT COUNT(*) FROM orders WHERE pickup_driver_id = $1 AND status NOT IN ('pending', 'assigned', 'cancelled')) as pickups_completed,
                (SELECT COUNT(*) FROM orders WHERE delivery_driver_id = $1 AND status = 'delivered') as deliveries_completed,
                (SELECT COUNT(*) FROM orders WHERE (pickup_driver_id = $1 OR delivery_driver_id = $1) AND status IN ('assigned', 'driver_en_route_pickup', 'picked_up', 'out_for_delivery', 'ready')) as active_deliveries,
                (SELECT COALESCE(SUM(total), 0) FROM orders WHERE delivery_driver_id = $1 AND status = 'delivered') as total_earnings
             `,
            [driverId]
        );

        // Map old field names to new logic for compatibility if needed, but easier to just return new structure
        // The frontend expects: total_deliveries, completed_deliveries (we'll map deliveries_completed), active_deliveries, total_earnings
        const row = result.rows[0];
        return {
            total_deliveries: parseInt(row.pickups_completed) + parseInt(row.deliveries_completed), // Total tasks
            completed_deliveries: parseInt(row.deliveries_completed),
            completed_pickups: parseInt(row.pickups_completed),
            active_deliveries: parseInt(row.active_deliveries),
            total_earnings: parseFloat(row.total_earnings)
        };
    }

    // Find nearest available driver
    async findNearestDriver(latitude, longitude) {
        const result = await db.query(
            `SELECT u.id, u.full_name, dl.latitude, dl.longitude,
                    (6371 * acos(cos(radians($1)) * cos(radians(dl.latitude)) 
                    * cos(radians(dl.longitude) - radians($2)) 
                    + sin(radians($1)) * sin(radians(dl.latitude)))) AS distance
             FROM users u
             JOIN LATERAL (
                 SELECT latitude, longitude
                 FROM driver_locations
                 WHERE driver_id = u.id
                 ORDER BY recorded_at DESC
                 LIMIT 1
             ) dl ON true
             WHERE u.role = 'driver' AND u.is_active = true
             ORDER BY distance ASC
             LIMIT 1`,
            [latitude, longitude]
        );

        return result.rows[0] || null;
    }
}

module.exports = new DriverService();
