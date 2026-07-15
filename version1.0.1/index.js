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

// --- 4. Migraciones / Asegurar columnas ---
try {
    // Columnas de Productos
  
    try { db.exec(`ALTER TABLE products ADD COLUMN Id_user TEXT`); } catch (e) {}
    try { db.exec(`ALTER TABLE products ADD COLUMN Descripcion TEXT`); } catch (e) {}
    
    // Columnas de Proveedores
    try { db.exec(`ALTER TABLE suppliers ADD COLUMN Id_user TEXT`); } catch (e) {}

    

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
// 🛒 RUTA DE CHECKOUT
// ==========================================================
app.post('/checkout', (req, res) => {
    const { items } = req.body; 
    if (!items || items.length === 0) return res.status(400).send({ message: "Carrito vacío." });

    const transaction = db.transaction(() => {
        let totalPaid = 0;
        const updateStmt = db.prepare(`UPDATE products SET quantity = quantity - ? WHERE id = ? AND quantity >= ?`);

        for (const item of items) {
            const { id, quantity, price } = item;
            const info = updateStmt.run(quantity, id, quantity);
            if (info.changes === 0) throw new Error(`Stock insuficiente o producto inválido: ${id}`);
            totalPaid += price * quantity;
        }
        return { totalPaid };
    });

    try {
        const { totalPaid } = transaction(); 
        res.send({ message: "Compra exitosa", total_paid: totalPaid });
    } catch (err) {
        res.status(400).send({ message: "Error en compra: " + err.message });
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
// INICIO DEL SERVIDOR
app.listen(3000, () => {
    console.log('🚀 Servidor escuchando en http://localhost:3000');


    console.log('Servidor de productos escuchando en puerto 3000');

    console.log('Servidor de archivos estáticos disponible en /uploads');

});