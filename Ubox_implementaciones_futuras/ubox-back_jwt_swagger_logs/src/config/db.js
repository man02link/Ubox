import pg from 'pg';
import { env } from './env.js';

const { Pool } = pg;

// Configuración del pool usando tu convención local en minúsculas
const users_bbdd = new Pool({
    user: env.db.user,
    host: env.db.host,
    database: env.db.database,
    password: env.db.password,
    port: env.db.port,
});

// Validación de la conexión con el contenedor Docker
users_bbdd.on('connect', () => {
    console.log('⚡ Conexión exitosa a la base de datos PostgreSQL en Docker (users_bbdd)');
});

users_bbdd.on('error', (err) => {
    console.error('❌ Error inesperado en el pool de PostgreSQL:', err);
    process.exit(-1);
});

// Función para inicializar la estructura de las tablas de U-Box si no existen
const initDatabase = async () => {
    try {
        // --- 1. Tabla de Usuarios ---
        await users_bbdd.query(`
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                username VARCHAR(100) UNIQUE NOT NULL,
                password TEXT NOT NULL,
                name VARCHAR(150),
                phone VARCHAR(20),
                email VARCHAR(150),
                address TEXT,
                role VARCHAR(30) DEFAULT 'user',
                refresh_token TEXT, -- <-- NUEVA COLUMNA
                createdAt TEXT
            );
        `);

        try { await users_bbdd.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS refresh_token TEXT;`); } catch (e) {}

        // --- 2. Tabla de Productos ---
        await users_bbdd.query(`
            CREATE TABLE IF NOT EXISTS products (
                id TEXT PRIMARY KEY,
                name VARCHAR(200) NOT NULL,
                price DOUBLE PRECISION NOT NULL,
                quantity INTEGER NOT NULL,
                image_path TEXT,
                brand VARCHAR(100),
                Id_suppliers TEXT,
                createdAt TEXT,
                Id_user TEXT,
                Descripcion TEXT
            );
        `);

        // --- 3. Tabla de Proveedores ---
        await users_bbdd.query(`
            CREATE TABLE IF NOT EXISTS suppliers (
                id TEXT PRIMARY KEY,
                name VARCHAR(200) NOT NULL,
                contact_name VARCHAR(150),
                phone VARCHAR(20),
                email VARCHAR(150),
                address TEXT,
                Id_user TEXT,
                createdAt TEXT
            );
        `);

        // --- 4. Tabla de Ventas (Encabezado) ---
        await users_bbdd.query(`
            CREATE TABLE IF NOT EXISTS sales (
                id TEXT PRIMARY KEY,
                userId TEXT NOT NULL,
                total_paid DOUBLE PRECISION NOT NULL,
                createdAt TEXT NOT NULL
            );
        `);

        // --- 5. Tabla de Detalle de Ventas ---
        await users_bbdd.query(`
            CREATE TABLE IF NOT EXISTS sales_details (
                id SERIAL PRIMARY KEY,
                saleId TEXT NOT NULL,
                productId TEXT NOT NULL,
                quantity INTEGER NOT NULL,
                price_at_sale DOUBLE PRECISION NOT NULL,
                FOREIGN KEY (saleId) REFERENCES sales(id) ON DELETE CASCADE
            );
        `);

        // --- 6. GYM: Trabajadores, Planes y Clientes ---
        await users_bbdd.query(`
            CREATE TABLE IF NOT EXISTS gym_workers (
                id TEXT PRIMARY KEY,
                name VARCHAR(150) NOT NULL,
                last_name VARCHAR(150),
                phone VARCHAR(20),
                salary DOUBLE PRECISION,
                createdAt TEXT
            );

            CREATE TABLE IF NOT EXISTS gym_plans (
                id TEXT PRIMARY KEY,
                name VARCHAR(150) NOT NULL,
                duration_days INTEGER NOT NULL,
                createdAt TEXT
            );

            CREATE TABLE IF NOT EXISTS gym_clients (
                id TEXT PRIMARY KEY,
                name VARCHAR(150) NOT NULL,
                last_name VARCHAR(150),
                phone VARCHAR(20),
                plan_id TEXT,
                enrollment_date TEXT,
                FOREIGN KEY(plan_id) REFERENCES gym_plans(id) ON DELETE SET NULL
            );
        `);

        // --- 7. Módulo de Rentas ---
        await users_bbdd.query(`
            CREATE TABLE IF NOT EXISTS products_rent (
                id TEXT PRIMARY KEY,
                name VARCHAR(200) NOT NULL,
                rental_price_day DOUBLE PRECISION NOT NULL,
                rental_price_hour DOUBLE PRECISION,
                category VARCHAR(100),
                image_path TEXT,
                status VARCHAR(50) DEFAULT 'available',
                description TEXT,
                serial_number VARCHAR(100) UNIQUE,
                createdAt TEXT
            );

            CREATE TABLE IF NOT EXISTS rentals (
                id TEXT PRIMARY KEY,
                userId TEXT NOT NULL,
                client_name VARCHAR(150) NOT NULL,
                client_id_card VARCHAR(100) NOT NULL,
                client_phone VARCHAR(20),
                client_email VARCHAR(150),
                date_start TEXT NOT NULL,
                date_end_plan TEXT NOT NULL,
                total_contract DOUBLE PRECISION NOT NULL,
                status VARCHAR(50) DEFAULT 'active',
                createdAt TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS rentals_details (
                id SERIAL PRIMARY KEY,
                rentalId TEXT NOT NULL,
                productId TEXT NOT NULL,
                quantity INTEGER DEFAULT 1,
                price_at_moment DOUBLE PRECISION NOT NULL,
                FOREIGN KEY (rentalId) REFERENCES rentals(id) ON DELETE CASCADE,
                FOREIGN KEY (productId) REFERENCES products_rent(id)
            );
        `);

                // --- 9. Tabla de Auditoría ---
        await users_bbdd.query(`
            CREATE TABLE IF NOT EXISTS audit_logs (
                id UUID PRIMARY KEY,
                usuario_id VARCHAR(128) NOT NULL,
                accion VARCHAR(50) NOT NULL,
                tabla_afectada VARCHAR(100) NOT NULL,
                detalle TEXT NOT NULL,
                registro_referencia_id UUID, -- Permite nulos si la acción no aplica a un registro (ej: LOGIN)
                fecha TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
                ip_address VARCHAR(45)
            );
        `);

        // --- 8. Migraciones de Columnas por si acaso ---
        try { await users_bbdd.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS Id_user TEXT;`); } catch (e) {}
        try { await users_bbdd.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS Descripcion TEXT;`); } catch (e) {}
        try { await users_bbdd.query(`ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS Id_user TEXT;`); } catch (e) {}

        console.log("✔️ Estructura de PostgreSQL verificada y actualizada correctamente.");
    } catch (error) {
        console.error("❌ Error al inicializar las tablas en PostgreSQL:", error.message);
    }
};

// Ejecutamos la inicialización al levantar el archivo
initDatabase();

export default users_bbdd;