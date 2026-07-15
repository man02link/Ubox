import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import Database from 'better-sqlite3';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcrypt'; // NECESARIO: npm install bcrypt

import { createCanvas, loadImage } from 'canvas';

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
// 2. Servir archivos estáticos del frontend
app.use(express.static(path.join(__dirname)));
app.get('/',(req,res)=>{
    res.sendFile(path.join(__dirname,'login.html'));
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


// RUTA: Generar imagen de ficha de producto
app.get('/generate-card/:id', async (req, res) => {
    const { id } = req.params;
    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(id);

    if (!product) return res.status(404).send('Producto no encontrado');

    // 1. Crear lienzo (ancho x alto)
    const canvas = createCanvas(500, 700);
    const ctx = canvas.getContext('2d');

    // 2. Fondo
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, 500, 700);

    try {
        // 3. Dibujar Imagen del Producto
        const imgPath = product.image_path 
            ? path.join(__dirname, 'uploads', product.image_path) 
            : path.join(__dirname, 'placeholder.png');
        
        const img = await loadImage(imgPath);
        ctx.drawImage(img, 50, 50, 400, 300);

        // 4. Dibujar Textos
        ctx.fillStyle = '#ffc107'; // Dorado para el título
        ctx.font = 'bold 28px sans-serif';
        ctx.fillText(product.name, 50, 400);

        ctx.fillStyle = '#ffffff';
        ctx.font = '22px sans-serif';
        ctx.fillText(`Precio: $${parseFloat(product.price).toFixed(2)}`, 50, 440);
        ctx.fillText(`Marca: ${product.brand || 'Genérico'}`, 50, 475);

        ctx.font = '16px sans-serif';
        ctx.fillStyle = '#aaaaaa';
        // Ajuste de texto para descripción larga
        const desc = product.Descripcion || 'Sin descripción disponible.';
        ctx.fillText(desc.substring(0, 50) + '...', 50, 520);

        ctx.fillStyle = '#28a745';
        ctx.fillText('UBOX - Calidad Garantizada', 150, 650);

        // 5. Enviar como Imagen
        const buffer = canvas.toBuffer('image/png');
        res.set('Content-Type', 'image/png');
        res.send(buffer);

    } catch (error) {
        console.error(error);
        res.status(500).send('Error al generar imagen');
    }
});

// INICIO DEL SERVIDOR
app.listen(3000, () => {
    console.log('🚀 Servidor escuchando en http://localhost:3000');


    console.log('Servidor de productos escuchando en puerto 3000');

    console.log('Servidor de archivos estáticos disponible en /uploads');

});