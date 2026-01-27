const db = require('../database/db');

class CategoryService {
    // Get all active categories
    async getAllCategories() {
        const result = await db.query(
            `SELECT id, name, name_fr, icon_name, base_price, express_price, 
                    description, processing_time_hours, display_order
             FROM clothing_categories
             WHERE is_active = true
             ORDER BY display_order ASC`
        );

        return result.rows;
    }

    // Get category by ID
    async getCategoryById(id) {
        const result = await db.query(
            'SELECT * FROM clothing_categories WHERE id = $1',
            [id]
        );

        if (result.rows.length === 0) {
            throw new Error('Category not found');
        }

        return result.rows[0];
    }

    // Create category (admin)
    async createCategory(categoryData) {
        const {
            name,
            nameFr,
            iconName,
            basePrice,
            expressPrice,
            description,
            processingTimeHours,
            displayOrder
        } = categoryData;

        const result = await db.query(
            `INSERT INTO clothing_categories 
             (name, name_fr, icon_name, base_price, express_price, description, processing_time_hours, display_order)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             RETURNING *`,
            [name, nameFr, iconName, basePrice, expressPrice, description, processingTimeHours, displayOrder]
        );

        return result.rows[0];
    }

    // Update category (admin)
    async updateCategory(id, updates) {
        const fields = [];
        const values = [];
        let paramCount = 1;

        Object.keys(updates).forEach(key => {
            fields.push(`${this.toSnakeCase(key)} = $${paramCount}`);
            values.push(updates[key]);
            paramCount++;
        });

        if (fields.length === 0) {
            throw new Error('No updates provided');
        }

        values.push(id);

        const result = await db.query(
            `UPDATE clothing_categories SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *`,
            values
        );

        if (result.rows.length === 0) {
            throw new Error('Category not found');
        }

        return result.rows[0];
    }

    // Helper to convert camelCase to snake_case
    toSnakeCase(str) {
        return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
    }
}

module.exports = new CategoryService();
