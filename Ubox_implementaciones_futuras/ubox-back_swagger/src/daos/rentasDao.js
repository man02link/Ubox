import users_bbdd from '../config/db.js';

export const rentasDao = {
    async findAvailableProducts() {
        const res = await users_bbdd.query("SELECT * FROM products_rent WHERE status = 'available'");
        return res.rows;
    },

    async createProductRent(product) {
        const query = `
            INSERT INTO products_rent (id, name, rental_price_day, serial_number, description, createdAt, status)
            VALUES ($1, $2, $3, $4, $5, $6, 'available')
        `;
        return await users_bbdd.query(query, [product.id, product.name, product.rental_price_day, product.serial_number, product.description, product.createdAt]);
    },

    async findAllRentals() {
        const query = `
            SELECT r.*, COUNT(rd.id) as total_articulos 
            FROM rentals r 
            LEFT JOIN rentals_details rd ON r.id = rd.rentalId
            GROUP BY r.id, r.userId, r.client_name, r.client_id_card, r.client_phone, r.client_email, r.date_start, r.date_end_plan, r.total_contract, r.status, r.createdAt
            ORDER BY CASE WHEN r.status = 'active' THEN 1 ELSE 2 END, r.date_end_plan ASC
        `;
        const res = await users_bbdd.query(query);
        return res.rows;
    },

    async executeRentalTransaction(rentalData, cartItems) {
        const client = await users_bbdd.connect();
        try {
            await client.query('BEGIN');

            await client.query(`
                INSERT INTO rentals (id, userId, client_name, client_id_card, client_phone, client_email, date_start, date_end_plan, total_contract, status, createdAt)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'active', $10)
            `, [rentalData.id, rentalData.userId, rentalData.client_name, rentalData.client_id_card, rentalData.client_phone, rentalData.client_email, rentalData.date_start, rentalData.date_end_plan, rentalData.total_contract, rentalData.date_start]);

            for (const item of cartItems) {
                await client.query(
                    `INSERT INTO rentals_details (rentalId, productId, quantity, price_at_moment) VALUES ($1, $2, $3, $4)`,
                    [rentalData.id, item.id, item.quantity || 1, item.price]
                );
                await client.query(`UPDATE products_rent SET status = 'rented' WHERE id = $1`, [item.id]);
            }

            await client.query('COMMIT');
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    },

    async executeReturnTransaction(rentalId) {
        const client = await users_bbdd.connect();
        try {
            await client.query('BEGIN');

            const res = await client.query(`UPDATE rentals SET status = 'completed' WHERE id = $1`, [rentalId]);
            if (res.rowCount === 0) throw new Error("Renta no encontrada");

            const itemsRes = await client.query(`SELECT productId FROM rentals_details WHERE rentalId = $1`, [rentalId]);
            
            for (const item of itemsRes.rows) {
                await client.query(`UPDATE products_rent SET status = 'available' WHERE id = $1`, [item.productid]);
            }

            await client.query('COMMIT');
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }
};