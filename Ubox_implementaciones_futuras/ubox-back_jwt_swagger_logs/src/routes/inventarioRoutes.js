import { Router } from 'express';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { inventarioController } from '../controllers/inventarioController.js';

const router = Router();

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename: (req, file, cb) => cb(null, uuidv4() + path.extname(file.originalname))
});
const upload = multer({ storage });

/**
 * @openapi
 * /api/products:
 *   post:
 *     summary: Crear un nuevo producto con imagen opcional
 *     tags:
 *       - Inventario (Productos)
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - id
 *               - name
 *               - price
 *               - quantity
 *             properties:
 *               id:
 *                 type: string
 *               name:
 *                 type: string
 *               price:
 *                 type: number
 *               quantity:
 *                 type: integer
 *               brand:
 *                 type: string
 *               Id_suppliers:
 *                 type: string
 *               userId:
 *                 type: string
 *               Descripcion:
 *                 type: string
 *               product_image:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Producto creado exitosamente.
 *   get:
 *     summary: Obtener todos los productos
 *     tags:
 *       - Inventario (Productos)
 *     parameters:
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *         description: ID opcional del usuario para filtrar su propio inventario
 *     responses:
 *       200:
 *         description: Lista de productos devuelta correctamente.
 */
router.post('/products', upload.single('product_image'), inventarioController.createProduct);
router.get('/products', inventarioController.getProducts);

/**
 * @openapi
 * /api/products/{id}:
 *   get:
 *     summary: Obtener un producto por ID
 *     tags:
 *       - Inventario (Productos)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Producto encontrado.
 *       404:
 *         description: Producto no encontrado.
 *   patch:
 *     summary: Actualizar campos específicos de un producto
 *     tags:
 *       - Inventario (Productos)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Producto actualizado con éxito.
 *       404:
 *         description: Producto no encontrado.
 *   delete:
 *     summary: Eliminar un producto por ID
 *     tags:
 *       - Inventario (Productos)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Producto eliminado.
 *       404:
 *         description: Producto no encontrado.
 */
router.get('/products/:id', inventarioController.getProductById);
router.patch('/products/:id', inventarioController.updateProduct);
router.delete('/products/:id', inventarioController.deleteProduct);

/**
 * @openapi
 * /api/restock:
 *   post:
 *     summary: Incrementar el stock de un producto existente
 *     tags:
 *       - Comercial (Ventas e Historial)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - productId
 *               - quantity
 *               - userId
 *             properties:
 *               productId:
 *                 type: string
 *               quantity:
 *                 type: integer
 *               userId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Stock reabastecido.
 */
router.post('/restock', inventarioController.restock);

/**
 * @openapi
 * /api/checkout:
 *   post:
 *     summary: Procesar una venta del carrito de compras (Transacción)
 *     tags:
 *       - Comercial (Ventas e Historial)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *               - items
 *             properties:
 *               userId:
 *                 type: string
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     name:
 *                       type: string
 *                     price:
 *                       type: number
 *                     quantity:
 *                       type: integer
 *     responses:
 *       200:
 *         description: Checkout procesado exitosamente.
 *       400:
 *         description: Error en la transacción o stock insuficiente.
 */
router.post('/checkout', inventarioController.checkout);

/**
 * @openapi
 * /api/sales/{userId}:
 *   get:
 *     summary: Obtener el resumen de ventas globales de un usuario
 *     tags:
 *       - Comercial (Ventas e Historial)
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Listado de ventas obtenido.
 */
router.get('/sales/:userId', inventarioController.getSales);

/**
 * @openapi
 * /api/sales-history/{userId}:
 *   get:
 *     summary: Obtener historial detallado de ventas agregadas por productos
 *     tags:
 *       - Comercial (Ventas e Historial)
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Historial detallado recuperado correctamente.
 */
router.get('/sales-history/:userId', inventarioController.getSalesHistory);

/**
 * @openapi
 * /api/suppliers:
 *   post:
 *     summary: Registrar un nuevo proveedor
 *     tags:
 *       - Proveedores
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - contact_name
 *               - Id_user
 *             properties:
 *               id:
 *                 type: string
 *               name:
 *                 type: string
 *               contact_name:
 *                 type: string
 *               phone:
 *                 type: string
 *               email:
 *                 type: string
 *               address:
 *                 type: string
 *               Id_user:
 *                 type: string
 *     responses:
 *       201:
 *         description: Proveedor registrado de manera exitosa.
 *   get:
 *     summary: Listar todos los proveedores vinculados a un usuario
 *     tags:
 *       - Proveedores
 *     parameters:
 *       - in: query
 *         name: Id_user
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Lista de proveedores devuelta.
 */
router.post('/suppliers', inventarioController.createSupplier);
router.get('/suppliers', inventarioController.getSuppliers);

/**
 * @openapi
 * /api/suppliers/{id}:
 *   delete:
 *     summary: Eliminar un proveedor por ID
 *     tags:
 *       - Proveedores
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - Id_user
 *             properties:
 *               Id_user:
 *                 type: string
 *     responses:
 *       200:
 *         description: Proveedor eliminado correctamente.
 */
router.delete('/suppliers/:id', inventarioController.deleteSupplier);

/**
 * @openapi
 * /api/gym/workers:
 *   post:
 *     summary: Registrar un nuevo trabajador del GYM
 *     tags:
 *       - Módulo Gimnasio
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - phone
 *             properties:
 *               name:
 *                 type: string
 *               phone:
 *                 type: string
 *     responses:
 *       201:
 *         description: Trabajador registrado.
 *   get:
 *     summary: Obtener la lista completa de trabajadores
 *     tags:
 *       - Módulo Gimnasio
 *     responses:
 *       200:
 *         description: Listado devuelto con éxito.
 */
router.post('/gym/workers', inventarioController.registerWorker);
router.get('/gym/workers', inventarioController.getWorkers);

/**
 * @openapi
 * /api/gym/workers/{id}:
 *   delete:
 *     summary: Desvincular un trabajador por ID
 *     tags:
 *       - Módulo Gimnasio
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Trabajador eliminado.
 */
router.delete('/gym/workers/:id', inventarioController.deleteWorker);

/**
 * @openapi
 * /api/gym/plans:
 *   post:
 *     summary: Crear un plan de suscripción para el gimnasio
 *     tags:
 *       - Módulo Gimnasio
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - duration_days
 *             properties:
 *               name:
 *                 type: string
 *               duration_days:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Plan de suscripción creado.
 *   get:
 *     summary: Obtener todos los planes disponibles
 *     tags:
 *       - Módulo Gimnasio
 *     responses:
 *       200:
 *         description: Colección de planes retornada.
 */
router.post('/gym/plans', inventarioController.createPlan);
router.get('/gym/plans', inventarioController.getPlans);

/**
 * @openapi
 * /api/gym/plans/{id}:
 *   delete:
 *     summary: Eliminar un plan específico por ID
 *     tags:
 *       - Módulo Gimnasio
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Plan removido.
 */
router.delete('/gym/plans/:id', inventarioController.deletePlan);

/**
 * @openapi
 * /api/gym/clients:
 *   post:
 *     summary: Matricular un nuevo cliente al gimnasio
 *     tags:
 *       - Módulo Gimnasio
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - phone
 *             properties:
 *               name:
 *                 type: string
 *               phone:
 *                 type: string
 *     responses:
 *       201:
 *         description: Cliente inscrito exitosamente.
 *   get:
 *     summary: Listar todos los clientes
 *     tags:
 *       - Módulo Gimnasio
 *     responses:
 *       200:
 *         description: Clientes obtenidos.
 */
router.post('/gym/clients', inventarioController.registerClient);
router.get('/gym/clients', inventarioController.getClients);

/**
 * @openapi
 * /api/gym/clients/{id}:
 *   delete:
 *     summary: Dar de baja a un cliente por ID
 *     tags:
 *       - Módulo Gimnasio
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Cliente eliminado correctamente.
 */
router.delete('/gym/clients/:id', inventarioController.deleteClient);

export default router;