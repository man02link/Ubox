import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import Database from 'better-sqlite3';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcrypt'; // NECESARIO: npm install bcrypt

// ==========================================================
// CONFIGURACIÓN DE RUTAS Y BASE DE DATOS
// ==========================================================

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database('inventario_productos.db');

// --- 1. Tabla de Productos ---
db.exec(`
    CREATE TABLE IF NOT EXISTS products (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        price REAL NOT NULL,
        quantity INTEGER NOT NULL,
        image_path TEXT,
        brand TEXT,
        Id_suppliers TEXT,
        createdAt TEXT,
        Id_user TEXT,
        Descripcion TEXT

    )
`);

// --- 2. Tabla de Proveedores ---
db.exec(`
    CREATE TABLE IF NOT EXISTS suppliers (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        contact_name TEXT,
        phone TEXT,
        email TEXT,
        address TEXT,
        createdAt TEXT
    )
`);

// --- 3. Tabla de Usuarios (ACTUALIZADA PARA LOGIN) ---
db.exec(`
    CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        name TEXT,
        phone TEXT,
        email TEXT,
        address TEXT,
        role TEXT DEFAULT 'user',
        createdAt TEXT
    )
`);

// --- 4. Tabla de Ventas (Encabezado) ---
db.exec(`
    CREATE TABLE IF NOT EXISTS sales (
        id TEXT PRIMARY KEY,
        userId TEXT NOT NULL,
        total_paid REAL NOT NULL,
        createdAt TEXT NOT NULL
    )
`);

// --- 5. Tabla de Detalle de Ventas (Productos vendidos) ---
db.exec(`
    CREATE TABLE IF NOT EXISTS sales_details (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        saleId TEXT NOT NULL,
        productId TEXT NOT NULL,
        quantity INTEGER NOT NULL,
        price_at_sale REAL NOT NULL,
        FOREIGN KEY (saleId) REFERENCES sales(id)
    )
`);

// --- 6. GYM: Trabajadores ---
db.exec(`
    CREATE TABLE IF NOT EXISTS gym_workers (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        last_name TEXT,
        phone TEXT,
        salary REAL,
        createdAt TEXT
    )
`);

// --- 7. GYM: Planes ---
db.exec(`
    CREATE TABLE IF NOT EXISTS gym_plans (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        duration_days INTEGER NOT NULL,
        createdAt TEXT
    )
`);

// --- 8. GYM: Clientes ---
db.exec(`
    CREATE TABLE IF NOT EXISTS gym_clients (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        last_name TEXT,
        phone TEXT,
        plan_id TEXT,
        enrollment_date TEXT,
        FOREIGN KEY(plan_id) REFERENCES gym_plans(id)
    )
`);

// --- 9 Tabla de Productos Exclusivos para Renta ---
db.exec(`
    CREATE TABLE IF NOT EXISTS products_rent (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        rental_price_day REAL NOT NULL, -- Precio por día
        rental_price_hour REAL,          -- Opcional: Precio por hora
        category TEXT,                   -- Ej: Herramientas, Electrónicos
        image_path TEXT,
        status TEXT DEFAULT 'available', -- available, rented, maintenance, damaged
        description TEXT,
        serial_number TEXT UNIQUE,       -- Importante para identificar la unidad física ISBM
        createdAt TEXT
    )
`);

// --- 6. Tabla de Rentas (El Contrato/Firma) ---
db.exec(`
    CREATE TABLE IF NOT EXISTS rentals (
        id TEXT PRIMARY KEY,             -- Este actúa como el ID de Firma/Folio
        userId TEXT NOT NULL,            -- Vendedor que procesó la renta
        client_name TEXT NOT NULL,       -- Nombre del que renta
        client_id_card TEXT NOT NULL,    -- Matrícula / Identificación
        client_phone TEXT,
        client_email TEXT,
        date_start TEXT NOT NULL,        -- Fecha y hora de salida
        date_end_plan TEXT NOT NULL,     -- Fecha prometida de devolución
        total_contract REAL NOT NULL,    -- Monto total pactado
        status TEXT DEFAULT 'active',    -- active (en curso), completed (devuelto), overdue (retrasado)
        createdAt TEXT NOT NULL
    )
`);

// --- 7. Detalle de la Renta (Qué se llevó) ---
db.exec(`
    CREATE TABLE IF NOT EXISTS rentals_details (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        rentalId TEXT NOT NULL,
        productId TEXT NOT NULL,         -- ID de la tabla products_rent
        quantity INTEGER DEFAULT 1,
        price_at_moment REAL NOT NULL,   -- Precio pactado en ese momento
        FOREIGN KEY (rentalId) REFERENCES rentals(id),
        FOREIGN KEY (productId) REFERENCES products_rent(id)
    )
`);

// --- 4. Migraciones / Asegurar columnas ---
try {
    // Columnas de Productos

    try { db.exec(`ALTER TABLE products ADD COLUMN Id_user TEXT`); } catch (e) { }
    try { db.exec(`ALTER TABLE products ADD COLUMN Descripcion TEXT`); } catch (e) { }

    // Columnas de Proveedores
    try { db.exec(`ALTER TABLE suppliers ADD COLUMN Id_user TEXT`); } catch (e) { }



    console.log("Estructura de base de datos verificada y actualizada.");
} catch (e) {
    console.log("Nota sobre DB:", e.message);
}

const app = express();

// Configuración de middlewares
app.use(cors());
app.use(express.json());

// CONFIGURACIÓN DE MULTER
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, uuidv4() + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
// 2. Servir archivos estáticos del frontend
app.use(express.static(path.join(__dirname)));
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'menu.html'));
});

// ==========================================================
// 🔐 RUTAS DE AUTENTICACIÓN (LOGIN Y REGISTRO)
// ==========================================================

// 📝 REGISTRO DE USUARIO
app.post('/register', async (req, res) => {
    const { username, password, name, email, phone, address, role } = req.body;

    if (!username || !password) {
        return res.status(400).send({ message: "Usuario y contraseña son obligatorios." });
    }

    try {
        // Verificar si el usuario ya existe
        const userExists = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
        if (userExists) {
            return res.status(400).send({ message: "El nombre de usuario ya está en uso." });
        }

        // Encriptar contraseña
        const hashedPassword = await bcrypt.hash(password, 10);
        const id = uuidv4();
        const createdAt = new Date().toISOString();

        const stmt = db.prepare(`
            INSERT INTO users (id, username, password, name, phone, email, address, role, createdAt)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        stmt.run(id, username, hashedPassword, name || '', phone || '', email || '', address || '', role || '', createdAt);

        res.status(201).send({ message: "Usuario registrado exitosamente" });

    } catch (err) {
        console.error("Error en /register:", err);
        res.status(500).send({ message: "Error al registrar usuario." });
    }
});

// 🔑 LOGIN DE USUARIO
app.post('/login', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).send({ message: "Credenciales incompletas." });
    }

    try {
        const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);

        if (!user) {
            return res.status(401).send({ message: "Usuario o contraseña incorrectos." });
        }

        // Comparar contraseñas
        const match = await bcrypt.compare(password, user.password);

        if (match) {
            // No enviamos el password de vuelta
            res.send({
                message: "Login exitoso",
                user: {
                    id: user.id,
                    username: user.username,
                    name: user.name,
                    role: user.role
                }
            });
        } else {
            res.status(401).send({ message: "Usuario o contraseña incorrectos." });
        }

    } catch (err) {
        console.error("Error en /login:", err);
        res.status(500).send({ message: "Error interno en el servidor." });
    }
});


// ==========================================================
// 🚀 RUTAS DE PRODUCTOS (CRUD)
// ==========================================================

// 📦 POST /products

// 📦 RUTA PARA CREAR PRODUCTOS
app.post('/products', upload.single('product_image'), (req, res) => {
    try {
        // 1. Extraer datos del body
        let { name, price, quantity, brand, Id_suppliers, userId, Descripcion } = req.body;
        const image_path = req.file ? req.file.filename : null;

        // 🛠️ CORRECCIÓN DE DUPLICADOS:
        // Si Descripcion llega como array ['texto', 'texto'], tomamos el primer elemento.
        if (Array.isArray(Descripcion)) {
            Descripcion = Descripcion[0];
        }

        // 2. Preparar valores (Convertir strings a números y generar IDs)
        const id = uuidv4();
        const parsedPrice = parseFloat(price) || 0;
        const parsedQuantity = parseInt(quantity) || 0;
        const createdAt = new Date().toISOString();

        // 3. Preparar la sentencia SQL con parámetros NOMBRADOS (@)
        // Esto evita el error de "Too many parameter values"
        const stmt = db.prepare(`
            INSERT INTO products (
                id, 
                name, 
                price, 
                quantity, 
                image_path, 
                brand, 
                Id_suppliers, 
                Id_user, 
                Descripcion, 
                createdAt
            ) 
            VALUES (
                @id, 
                @name, 
                @price, 
                @quantity, 
                @image_path, 
                @brand, 
                @Id_suppliers, 
                @userId, 
                @Descripcion, 
                @createdAt
            )
        `);

        // 4. Ejecutar pasando un objeto donde las llaves coinciden con los @ de arriba
        stmt.run({
            id: id,
            name: name || "Producto sin nombre",
            price: parsedPrice,
            quantity: parsedQuantity,
            image_path: image_path,
            brand: brand || null,
            Id_suppliers: Id_suppliers || null,
            userId: userId || null, // Asegúrate que el frontend envíe 'userId'
            Descripcion: Descripcion || null,
            createdAt: createdAt
        });

        // 5. Respuesta exitosa
        res.status(201).send({
            message: "Producto creado exitosamente",
            product: { id, name, price: parsedPrice, quantity: parsedQuantity, image_path }
        });

    } catch (err) {
        // Registrar error exacto en la consola del servidor
        console.error("❌ Error en POST /products:", err);

        res.status(500).send({
            message: "Error interno al crear el producto",
            error: err.message
        });
    }
});
// 🔎 GET /products/:id
app.get('/products/:id', (req, res) => {
    const { id } = req.params;
    try {
        const stmt = db.prepare(`SELECT * FROM products WHERE id = ?`);
        const product = stmt.get(id);

        if (!product) return res.status(404).send({ message: "Producto no encontrado." });

        res.send({ message: "Producto encontrado", product });
    } catch (err) {
        res.status(500).send({ message: "Error al consultar el producto." });
    }
});

// 🖼️ GET /products
app.get('/products', (req, res) => {
    const { userId } = req.query;
    const products = userId
        ? db.prepare(`SELECT * FROM products WHERE Id_user = ? ORDER BY createdAt DESC`).all(userId)
        : db.prepare(`SELECT * FROM products ORDER BY createdAt DESC`).all();
    res.send({ products });
});

// ✏️ PATCH /products/:id
app.patch('/products/:id', (req, res) => {
    const { id } = req.params;
    const { name, price, quantity, image_path, brand, Id_suppliers, Descripcion } = req.body;

    const updates = [];
    const values = [];

    if (name !== undefined) { updates.push('name = ?'); values.push(name); }
    if (price !== undefined) { updates.push('price = ?'); values.push(parseFloat(price)); }
    if (quantity !== undefined) { updates.push('quantity = ?'); values.push(parseInt(quantity)); }
    if (image_path !== undefined) { updates.push('image_path = ?'); values.push(image_path); }
    if (brand !== undefined) { updates.push('brand = ?'); values.push(brand); }
    if (Id_suppliers !== undefined) { updates.push('Id_suppliers = ?'); values.push(Id_suppliers); }
    if (Descripcion !== undefined) { updates.push('Descripcion = ?'); values.push(Descripcion); }

    if (updates.length === 0) return res.status(400).send({ message: "No hay campos para actualizar." });

    values.push(id);

    try {
        const stmt = db.prepare(`UPDATE products SET ${updates.join(', ')} WHERE id = ?`);
        const info = stmt.run(...values);

        if (info.changes === 0) return res.status(404).send({ message: "Producto no encontrado." });

        res.send({ message: "Producto actualizado", updatedId: id });
    } catch (err) {
        res.status(500).send({ message: "Error al actualizar." });
    }
});

// 🗑️ DELETE /products/:id
app.delete('/products/:id', (req, res) => {
    const { id } = req.params;
    try {
        const info = db.prepare('DELETE FROM products WHERE id = ?').run(id);
        if (info.changes === 0) return res.status(404).send({ message: "Producto no encontrado." });
        res.send({ message: "Producto eliminado", deletedId: id });
    } catch (err) {
        res.status(500).send({ message: "Error al eliminar." });
    }
});

// ==========================================================
// 🚛 RUTA DE REABASTECIMIENTO (CORREGIDA)
// ==========================================================
app.post('/restock', (req, res) => {
    // 1. Recibimos también el userId desde el cuerpo de la petición
    const { productId, quantity, userId } = req.body;

    if (!productId || !quantity || !userId || quantity <= 0) {
        return res.status(400).send({ message: "Datos inválidos o falta identificación de usuario." });
    }

    try {
        // 2. El WHERE ahora tiene DOS condiciones: el ID del producto Y el ID del dueño
        const stmt = db.prepare(`
            UPDATE products 
            SET quantity = quantity + ? 
            WHERE id = ? AND Id_user = ?
        `);

        const info = stmt.run(parseInt(quantity), productId, userId);

        // 3. Si changes es 0, significa que el producto no existe O no pertenece a ese usuario
        if (info.changes === 0) {
            return res.status(403).send({
                message: "Acceso denegado o producto no encontrado. Solo puedes reabastecer tus propios productos."
            });
        }

        const newProduct = db.prepare('SELECT name, quantity FROM products WHERE id = ?').get(productId);
        res.send({
            message: `Stock de ${newProduct.name} actualizado. Nuevo total: ${newProduct.quantity}`,
            newQuantity: newProduct.quantity
        });

    } catch (err) {
        console.error("Error en restock:", err);
        res.status(500).send({ message: "Error interno al reabastecer." });
    }
});
// ==========================================================
// 🛒 RUTA DE CHECKOUT (CORREGIDA)
// ==========================================================
app.post('/checkout', (req, res) => {
    const { items, userId } = req.body;

    if (!items || items.length === 0) return res.status(400).send({ message: "Carrito vacío." });
    if (!userId) return res.status(400).send({ message: "Usuario no identificado." });

    const saleId = uuidv4();
    const createdAt = new Date().toISOString();

    const transaction = db.transaction(() => {
        let totalPaid = 0;

        const updateProductStmt = db.prepare(`UPDATE products SET quantity = quantity - ? WHERE id = ? AND quantity >= ?`);
        const insertSaleStmt = db.prepare(`INSERT INTO sales (id, userId, total_paid, createdAt) VALUES (?, ?, ?, ?)`);
        const insertDetailStmt = db.prepare(`INSERT INTO sales_details (saleId, productId, quantity, price_at_sale) VALUES (?, ?, ?, ?)`);

        // --- PASO 1: Calcular el total primero ---
        items.forEach(item => {
            totalPaid += parseFloat(item.price) * parseInt(item.quantity);
        });

        // --- PASO 2: REGISTRAR LA VENTA PRIMERO (LA "MADRE") ---
        // Al hacerlo aquí, el ID ya existe para cuando los detalles lo necesiten
        insertSaleStmt.run(saleId, userId, totalPaid, createdAt);

        // --- PASO 3: REGISTRAR LOS DETALLES (LOS "HIJOS") ---
        for (const item of items) {
            const productId = item.id;
            const quantity = parseInt(item.quantity);
            const price = parseFloat(item.price);

            // Descontar Stock
            const info = updateProductStmt.run(quantity, productId, quantity);
            if (info.changes === 0) {
                throw new Error(`Stock insuficiente para: ${item.name}`);
            }

            // Guardar detalle
            insertDetailStmt.run(saleId, productId, quantity, price);
        }

        return { totalPaid, saleId };
    });

    try {
        const result = transaction();
        res.send({
            message: "Compra exitosa",
            total_paid: result.totalPaid,
            orderId: result.saleId
        });
    } catch (err) {
        console.error("Transacción fallida:", err.message);
        res.status(400).send({ message: err.message });
    }
});

// 📑 GET /sales/:userId
app.get('/sales/:userId', (req, res) => {
    const { userId } = req.params;
    try {
        const sales = db.prepare(`
            SELECT id, total_paid, createdAt 
            FROM sales 
            WHERE userId = ? 
            ORDER BY createdAt DESC
        `).all(userId);
        res.send({ sales });
    } catch (err) {
        res.status(500).send({ message: "Error al obtener historial." });
    }
});

app.get('/sales-history/:userId', (req, res) => {
    const { userId } = req.params;
    try {
        const sales = db.prepare(`
            SELECT 
                s.id as saleId, 
                s.total_paid, 
                s.createdAt,
                GROUP_CONCAT(p.name || ' (x' || sd.quantity || ')', ', ') as productos_resumen,
                -- Este campo extra nos sirve para reconstruir el PDF exactamente como fue
                '[' || GROUP_CONCAT(
                    '{"name":"' || p.name || '","quantity":' || sd.quantity || ',"price":' || sd.price_at_sale || '}'
                ) || ']' as detalle_json
            FROM sales s
            JOIN sales_details sd ON s.id = sd.saleId
            JOIN products p ON sd.productId = p.id
            WHERE s.userId = ?
            GROUP BY s.id
            ORDER BY s.createdAt DESC
        `).all(userId);

        res.send({ sales });
    } catch (err) {
        console.error(err);
        res.status(500).send({ message: "Error al obtener el historial." });
    }
});
// ==========================================================
// 🏭 RUTAS DE PROVEEDORES (CRUD)
// ==========================================================

app.post('/suppliers', (req, res) => {
    // 1. Recibimos Id_user del cuerpo de la petición
    const { name, contact_name, phone, email, address, Id_user } = req.body;

    if (!name || !contact_name || !Id_user) {
        return res.status(400).send({ message: "Nombre, contacto e ID de usuario obligatorios." });
    }

    const id = uuidv4();
    try {
        // 2. Incluimos Id_user en el INSERT
        const stmt = db.prepare(`
            INSERT INTO suppliers (id, name, contact_name, phone, email, address, Id_user, createdAt) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);

        stmt.run(id, name, contact_name, phone, email, address, Id_user, new Date().toISOString());
        res.status(201).send({ message: "Proveedor creado", supplier: { id, name } });
    } catch (err) {
        console.error(err);
        res.status(500).send({ message: "Error al crear proveedor." });
    }
});

app.get('/suppliers', (req, res) => {
    const { Id_user } = req.query; // Se recibe como ?Id_user=...

    if (!Id_user) {
        return res.status(400).send({ message: "Se requiere el ID de usuario para ver sus proveedores." });
    }

    try {
        // 3. Filtramos con WHERE Id_user = ?
        const suppliers = db.prepare(`
            SELECT * FROM suppliers 
            WHERE Id_user = ? 
            ORDER BY name ASC
        `).all(Id_user);

        res.send({ message: "Proveedores obtenidos", suppliers });
    } catch (err) {
        res.status(500).send({ message: "Error al obtener proveedores." });
    }
});

app.delete('/suppliers/:id', (req, res) => {
    const { id } = req.params;
    const { Id_user } = req.body; // Enviamos el Id_user en el cuerpo del delete

    if (!Id_user) return res.status(400).send({ message: "Identificación de usuario necesaria." });

    try {
        // 4. Solo borra si el ID coincide Y el Id_user es el dueño
        const info = db.prepare('DELETE FROM suppliers WHERE id = ? AND Id_user = ?').run(id, Id_user);

        if (info.changes === 0) {
            return res.status(403).send({ message: "No encontrado o no tienes permiso para eliminarlo." });
        }
        res.send({ message: "Proveedor eliminado" });
    } catch (err) {
        res.status(500).send({ message: "Error al eliminar." });
    }
});
/* ==========================================================
   🏋️‍♂️ RUTAS DEL GIMNASIO (TRABAJADORES, PLANES, CLIENTES)
   ========================================================== */

// --- TRABAJADORES ---
app.post('/gym/workers', (req, res) => {
    const { name, last_name, phone, salary } = req.body;
    if (!name || !phone) return res.status(400).send({ message: "Nombre y teléfono son obligatorios." });
    try {
        const id = uuidv4();
        const stmt = db.prepare('INSERT INTO gym_workers (id, name, last_name, phone, salary, createdAt) VALUES (?, ?, ?, ?, ?, ?)');
        stmt.run(id, name, last_name || '', phone, parseFloat(salary) || 0, new Date().toISOString());
        res.status(201).send({ message: "Trabajador registrado", id });
    } catch (err) {
        res.status(500).send({ message: "Error al registrar trabajador." });
    }
});

app.get('/gym/workers', (req, res) => {
    try {
        const workers = db.prepare('SELECT * FROM gym_workers ORDER BY createdAt DESC').all();
        res.send({ workers });
    } catch (err) {
        res.status(500).send({ message: "Error al obtener trabajadores." });
    }
});

app.delete('/gym/workers/:id', (req, res) => {
    try {
        db.prepare('DELETE FROM gym_workers WHERE id = ?').run(req.params.id);
        res.send({ message: "Trabajador eliminado" });
    } catch (err) {
        res.status(500).send({ message: "Error al eliminar trabajador." });
    }
});

// --- PLANES ---
app.post('/gym/plans', (req, res) => {
    const { name, duration_days } = req.body;
    if (!name || !duration_days) return res.status(400).send({ message: "Nombre y duración obligatorios." });
    try {
        const id = uuidv4();
        const stmt = db.prepare('INSERT INTO gym_plans (id, name, duration_days, createdAt) VALUES (?, ?, ?, ?)');
        stmt.run(id, name, parseInt(duration_days), new Date().toISOString());
        res.status(201).send({ message: "Plan creado", id });
    } catch (err) {
        res.status(500).send({ message: "Error al crear plan." });
    }
});

app.get('/gym/plans', (req, res) => {
    try {
        const plans = db.prepare('SELECT * FROM gym_plans ORDER BY createdAt DESC').all();
        res.send({ plans });
    } catch (err) {
        res.status(500).send({ message: "Error al obtener planes." });
    }
});

app.delete('/gym/plans/:id', (req, res) => {
    try {
        db.prepare('DELETE FROM gym_plans WHERE id = ?').run(req.params.id);
        res.send({ message: "Plan eliminado" });
    } catch (err) {
        res.status(500).send({ message: "Error al eliminar plan." });
    }
});

// --- CLIENTES ---
app.post('/gym/clients', (req, res) => {
    const { name, last_name, phone, plan_id } = req.body;
    if (!name || !phone) return res.status(400).send({ message: "Nombre y teléfono obligatorios." });
    try {
        const id = uuidv4();
        const stmt = db.prepare('INSERT INTO gym_clients (id, name, last_name, phone, plan_id, enrollment_date) VALUES (?, ?, ?, ?, ?, ?)');
        stmt.run(id, name, last_name || '', phone, plan_id || null, new Date().toISOString());
        res.status(201).send({ message: "Cliente registrado", id });
    } catch (err) {
        res.status(500).send({ message: "Error al registrar cliente." });
    }
});

app.get('/gym/clients', (req, res) => {
    try {
        const clients = db.prepare(`
            SELECT c.*, p.name as plan_name 
            FROM gym_clients c 
            LEFT JOIN gym_plans p ON c.plan_id = p.id 
            ORDER BY c.enrollment_date DESC
        `).all();
        res.send({ clients });
    } catch (err) {
        res.status(500).send({ message: "Error al obtener clientes." });
    }
});

app.delete('/gym/clients/:id', (req, res) => {
    try {
        db.prepare('DELETE FROM gym_clients WHERE id = ?').run(req.params.id);
        res.send({ message: "Cliente eliminado" });
    } catch (err) {
        res.status(500).send({ message: "Error al eliminar cliente." });
    }
});



// ==========================================================
// MÓDULO DE RENTAS
// ==========================================================

// 1. Obtener catálogo de rentas (solo disponibles)
app.get('/api/products-rent', (req, res) => {
    try {
        const products = db.prepare("SELECT * FROM products_rent WHERE status = 'available'").all();
        res.json(products);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 2. Guardar nuevo producto de renta
app.post('/api/products-rent', (req, res) => {
    try {
        const { id, name, rental_price_day, serial_number, description, createdAt } = req.body;
        const stmt = db.prepare(`
            INSERT INTO products_rent (id, name, rental_price_day, serial_number, description, createdAt, status)
            VALUES (?, ?, ?, ?, ?, ?, 'available')
        `);
        stmt.run(id, name, rental_price_day, serial_number, description, createdAt);
        res.status(201).json({ message: "Producto de renta creado" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 3. Obtener historial de rentas (Ordenado por prioridad: Activas y Próximas a vencer)
app.get('/api/rentas', (req, res) => {
    try {
        const rentals = db.prepare(`
            SELECT r.*, 
                   COUNT(rd.id) as total_articulos
            FROM rentals r
            LEFT JOIN rentals_details rd ON r.id = rd.rentalId
            GROUP BY r.id
            ORDER BY 
                CASE WHEN r.status = 'active' THEN 1 ELSE 2 END, 
                r.date_end_plan ASC
        `).all();
        res.json(rentals);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 4. Registrar una nueva renta (Transacción Atómica)
app.post('/api/rentas', (req, res) => {
    const { 
        userId, client_name, client_id_card, client_phone, client_email, 
        date_end_plan, cartItems 
    } = req.body;

    if (!userId || !client_name || !client_id_card || !cartItems || cartItems.length === 0) {
        return res.status(400).json({ error: "Faltan datos obligatorios para la renta." });
    }

    const rentalId = uuidv4();
    const date_start = new Date().toISOString();
    const total_contract = cartItems.reduce((sum, item) => sum + (parseFloat(item.price) * item.quantity), 0);

    const processRental = db.transaction((items) => {
        db.prepare(`
            INSERT INTO rentals (id, userId, client_name, client_id_card, client_phone, client_email, date_start, date_end_plan, total_contract, status, createdAt)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?)
        `).run(rentalId, userId, client_name, client_id_card, client_phone, client_email, date_start, date_end_plan, total_contract, date_start);

        const insertDetail = db.prepare(`INSERT INTO rentals_details (rentalId, productId, quantity, price_at_moment) VALUES (?, ?, ?, ?)`);
        const updateStatus = db.prepare(`UPDATE products_rent SET status = 'rented' WHERE id = ?`);

        for (const item of items) {
            insertDetail.run(rentalId, item.id, item.quantity || 1, item.price);
            updateStatus.run(item.id);
        }
    });

    try {
        processRental(cartItems);
        res.status(201).json({ message: "Renta registrada con éxito", rentalId: rentalId });
    } catch (error) {
        res.status(500).json({ error: "Error al registrar la renta." });
    }
});

// 5. Registrar devolución (Libera productos)
app.post('/api/rentas/devolucion/:id', (req, res) => {
    const { id } = req.params;

    const processReturn = db.transaction((rentalId) => {
        const result = db.prepare(`UPDATE rentals SET status = 'completed' WHERE id = ?`).run(rentalId);
        if (result.changes === 0) throw new Error("Renta no encontrada");

        const items = db.prepare(`SELECT productId FROM rentals_details WHERE rentalId = ?`).all(rentalId);
        const updateProduct = db.prepare(`UPDATE products_rent SET status = 'available' WHERE id = ?`);
        
        for (const item of items) {
            updateProduct.run(item.productId);
        }
    });

    try {
        processReturn(id);
        res.json({ message: "Devolución procesada exitosamente." });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// INICIO DEL SERVIDOR
app.listen(3000, () => {
    console.log('Servidor escuchando en http://localhost:3000');


    console.log('Servidor de productos escuchando en puerto 3000');

    console.log('Servidor de archivos estáticos disponible en /uploads');

});
