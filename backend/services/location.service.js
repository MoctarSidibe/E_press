const db = require('../database/db');

class LocationService {
    // Create location for user
    async createLocation(userId, locationData) {
        const { label, address, latitude, longitude, instructions, isDefault = false } = locationData;

        const client = await db.pool.connect();

        try {
            await client.query('BEGIN');

            // If this is set as default, unset other defaults
            if (isDefault) {
                await client.query(
                    'UPDATE locations SET is_default = false WHERE user_id = $1',
                    [userId]
                );
            }

            const result = await client.query(
                `INSERT INTO locations (user_id, label, address, latitude, longitude, instructions, is_default)
                 VALUES ($1, $2, $3, $4, $5, $6, $7)
                 RETURNING *`,
                [userId, label, address, latitude, longitude, instructions, isDefault]
            );

            await client.query('COMMIT');

            return result.rows[0];

        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    // Get all locations for user
    async getUserLocations(userId) {
        const result = await db.query(
            'SELECT * FROM locations WHERE user_id = $1 ORDER BY is_default DESC, created_at DESC',
            [userId]
        );

        return result.rows;
    }

    // Get location by ID
    async getLocationById(id, userId = null) {
        let query = 'SELECT * FROM locations WHERE id = $1';
        const params = [id];

        if (userId) {
            query += ' AND user_id = $2';
            params.push(userId);
        }

        const result = await db.query(query, params);

        if (result.rows.length === 0) {
            throw new Error('Location not found');
        }

        return result.rows[0];
    }

    // Update location
    async updateLocation(id, userId, updates) {
        const fields = [];
        const values = [];
        let paramCount = 1;

        Object.keys(updates).forEach(key => {
            if (key === 'isDefault') {
                fields.push(`is_default = $${paramCount}`);
            } else {
                fields.push(`${this.toSnakeCase(key)} = $${paramCount}`);
            }
            values.push(updates[key]);
            paramCount++;
        });

        if (fields.length === 0) {
            throw new Error('No updates provided');
        }

        values.push(id, userId);

        const client = await db.pool.connect();

        try {
            await client.query('BEGIN');

            // If setting as default, unset others
            if (updates.isDefault) {
                await client.query(
                    'UPDATE locations SET is_default = false WHERE user_id = $1',
                    [userId]
                );
            }

            const result = await client.query(
                `UPDATE locations SET ${fields.join(', ')} 
                 WHERE id = $${paramCount} AND user_id = $${paramCount + 1}
                 RETURNING *`,
                values
            );

            if (result.rows.length === 0) {
                throw new Error('Location not found');
            }

            await client.query('COMMIT');

            return result.rows[0];

        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    // Delete location
    async deleteLocation(id, userId) {
        const result = await db.query(
            'DELETE FROM locations WHERE id = $1 AND user_id = $2 RETURNING *',
            [id, userId]
        );

        if (result.rows.length === 0) {
            throw new Error('Location not found');
        }

        return result.rows[0];
    }

    toSnakeCase(str) {
        return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
    }
}

module.exports = new LocationService();
