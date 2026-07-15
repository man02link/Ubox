import users_bbdd from '../config/db.js';

export const inventarioDao = {
    async createProduct(productData) {
        const query = `
            INSERT INTO products (id, name, price, quantity, image_path, brand, Id_suppliers, Id_user, Descripcion, createdAt) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        `;
        const values = [
            productData.id, productData.name, productData.price, productData.quantity,
            productData.image_path, productData.brand, productData.Id_suppliers,
            productData.userId, productData.Descripcion, productData.createdAt
        ];
        return await users_bbdd.query(query, values);
    },

    async findById(id) {
        const res = await users_bbdd.query('SELECT * FROM products WHERE id = $1', [id]);
        return res.rows[0] || null;
    },

    async findAll(userId) {
        if (userId) {
            const res = await users_bbdd.query('SELECT * FROM products WHERE Id_user = $1 ORDER BY createdAt DESC', [userId]);
            return res.rows;
        }
        const res = await users_bbdd.query('SELECT * FROM products ORDER BY createdAt DESC');
        return res.rows;
    },

    async update(id, fields) {
        const keys = Object.keys(fields);
        const updates = keys.map((key, index) => `${key} = $${index + 1}`);
        const values = Object.values(fields);
        
        values.push(id); // El ID será el último parámetro
        const idIndex = values.length;

        const query = `UPDATE products SET ${updates.join(', ')} WHERE id = $${idIndex}`;
        return await users_bbdd.query(query, values);
    },

    async delete(id) {
        return await users_bbdd.query('DELETE FROM products WHERE id = $1', [id]);
    },

    async restock(quantity, productId, userId) {
        return await users_bbdd.query(
            'UPDATE products SET quantity = quantity + $1 WHERE id = $2 AND Id_user = $3',
            [quantity, productId, userId]
        );
    },

    async executeCheckoutTransaction(saleId, userId, items, createdAt) {
        const client = await users_bbdd.connect();
        try {
            await client.query('BEGIN');
            let totalPaid = 0;

            for (const item of items) {
                totalPaid += parseFloat(item.price) * parseInt(item.quantity);
                
                // Actualizar stock validando que haya suficiente
                const updateRes = await client.query(
                    'UPDATE products SET quantity = quantity - $1 WHERE id = $2 AND quantity >= $1',
                    [parseInt(item.quantity), item.id]
                );

                if (updateRes.rowCount === 0) {
                    throw new Error(`Stock insuficiente para: ${item.name}`);
                }
            }

            // Insertar la venta global
            await client.query(
                'INSERT INTO sales (id, userId, total_paid, createdAt) VALUES ($1, $2, $3, $4)',
                [saleId, userId, totalPaid, createdAt]
            );

            // Insertar detalles
            for (const item of items) {
                await client.query(
                    'INSERT INTO sales_details (saleId, productId, quantity, price_at_sale) VALUES ($1, $2, $3, $4)',
                    [saleId, item.id, parseInt(item.quantity), parseFloat(item.price)]
                );
            }

            await client.query('COMMIT');
            return totalPaid;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    },

    async getSales(userId) {
        const res = await users_bbdd.query('SELECT id, total_paid, createdAt FROM sales WHERE userId = $1 ORDER BY createdAt DESC', [userId]);
        return res.rows;
    },

    async getSalesHistory(userId) {
        // Adaptado a funciones nativas de agregación de cadenas de PostgreSQL
        const query = `
            SELECT 
                s.id as "saleId", s.total_paid, s.createdAt,
                STRING_AGG(p.name || ' (x' || sd.quantity || ')', ', ') as productos_resumen,
                '[' || STRING_AGG('{"name":"' || p.name || '","quantity":' || sd.quantity || ',"price":' || sd.price_at_sale || '}', ',') || ']' as detalle_json
            FROM sales s
            JOIN sales_details sd ON s.id = sd.saleId
            JOIN products p ON sd.productId = p.id
            WHERE s.userId = $1 
            GROUP BY s.id, s.total_paid, s.createdAt 
            ORDER BY s.createdAt DESC
        `;
        const res = await users_bbdd.query(query, [userId]);
        return res.rows;
    },

    // --- SECCIÓN PROVEEDORES ---
    async createSupplier(supplier) {
        const query = `
            INSERT INTO suppliers (id, name, contact_name, phone, email, address, Id_user, createdAt) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `;
        return await users_bbdd.query(query, [supplier.id, supplier.name, supplier.contact_name, supplier.phone, supplier.email, supplier.address, supplier.Id_user, supplier.createdAt]);
    },

    async findSuppliersByUser(userId) {
        const res = await users_bbdd.query('SELECT * FROM suppliers WHERE Id_user = $1 ORDER BY name ASC', [userId]);
        return res.rows;
    },

    async deleteSupplier(id, userId) {
        return await users_bbdd.query('DELETE FROM suppliers WHERE id = $1 AND Id_user = $2', [id, userId]);
    },

    // --- SECCIÓN GIMNASIO ---
    async createWorker(worker) {
        return await users_bbdd.query('INSERT INTO gym_workers (id, name, last_name, phone, salary, createdAt) VALUES ($1, $2, $3, $4, $5, $6)', [worker.id, worker.name, worker.last_name, worker.phone, worker.salary, worker.createdAt]);
    },
    async findAllWorkers() { 
        const res = await users_bbdd.query('SELECT * FROM gym_workers ORDER BY createdAt DESC');
        return res.rows;
    },
    async deleteWorker(id) { return await users_bbdd.query('DELETE FROM gym_workers WHERE id = $1', [id]); },

    async createPlan(plan) { return await users_bbdd.query('INSERT INTO gym_plans (id, name, duration_days, createdAt) VALUES ($1, $2, $3, $4)', [plan.id, plan.name, plan.duration_days, plan.createdAt]); },
    async findAllPlans() { 
        const res = await users_bbdd.query('SELECT * FROM gym_plans ORDER BY createdAt DESC');
        return res.rows;
    },
    async deletePlan(id) { return await users_bbdd.query('DELETE FROM gym_plans WHERE id = $1', [id]); },

    async createClient(client) { return await users_bbdd.query('INSERT INTO gym_clients (id, name, last_name, phone, plan_id, enrollment_date) VALUES ($1, $2, $3, $4, $5, $6)', [client.id, client.name, client.last_name, client.phone, client.plan_id, client.enrollment_date]); },
    async findAllClients() {
        const res = await users_bbdd.query(`
            SELECT c.*, p.name as plan_name FROM gym_clients c LEFT JOIN gym_plans p ON c.plan_id = p.id ORDER BY c.enrollment_date DESC
        `);
        return res.rows;
    },
    async deleteClient(id) { return await users_bbdd.query('DELETE FROM gym_clients WHERE id = $1', [id]); }
};