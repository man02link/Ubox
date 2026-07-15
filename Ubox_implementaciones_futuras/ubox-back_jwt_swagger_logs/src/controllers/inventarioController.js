import { inventarioService } from '../services/inventarioService.js';
import { inventarioDto } from '../dtos/inventarioDto.js';
import { auditService } from '../services/auditService.js'; // Bitácora de Auditoría (Postgres)
import { logger } from '../config/logger.js';               // Bitácora Técnica (Winston)

export const inventarioController = {
    // --- PRODUCTOS ---
    async createProduct(req, res, next) {
        try {
            const cleanData = inventarioDto.toCreateProduct(req.body, req.file);
            const product = await inventarioService.createProduct(cleanData);

            // 📑 AUDITORÍA: Registro de nuevo producto en almacén
            await auditService.log({
                usuario_id: req.user?.id || cleanData.userId || 'UNKNOWN_USER',
                accion: 'CREAR',
                tabla_afectada: 'products',
                detalle: `Se añadió un nuevo producto al inventario: '${cleanData.name}' con un stock inicial de ${cleanData.quantity}.`,
                registro_referencia_id: product?.id || null,
                req: req
            });

            res.status(201).json({ message: "Producto creado exitosamente", product });
        } catch (err) {
            logger.error("Error técnico al crear producto en inventario:", err);
            next(err);
        }
    },

    async getProductById(req, res, next) {
        try {
            const product = await inventarioService.getProductById(req.params.id);
            if (!product) return res.status(404).json({ message: "Producto no encontrado." });
            res.json({ message: "Producto encontrado", product });
        } catch (err) {
            logger.error(`Error técnico al buscar el producto con ID ${req.params.id}:`, err);
            next(err);
        }
    },

    async getProducts(req, res, next) {
        try {
            const products = await inventarioService.getAllProducts(req.query.userId);
            res.json({ products });
        } catch (err) {
            logger.error("Error técnico al listar productos del inventario:", err);
            next(err);
        }
    },

    async updateProduct(req, res, next) {
        const productId = req.params.id;
        try {
            const fieldsToUpdate = inventarioDto.toUpdateProduct(req.body);
            if (Object.keys(fieldsToUpdate).length === 0) return res.status(400).json({ message: "No hay campos para actualizar." });

            const info = await inventarioService.updateProduct(productId, fieldsToUpdate);
            if (info.changes === 0) return res.status(404).json({ message: "Producto no encontrado." });

            // 📑 AUDITORÍA: Actualización de propiedades del producto
            await auditService.log({
                usuario_id: req.user?.id || 'UNKNOWN_USER',
                accion: 'ACTUALIZAR',
                tabla_afectada: 'products',
                detalle: `Se modificaron propiedades del producto ID: ${productId}. Campos afectados: ${Object.keys(fieldsToUpdate).join(', ')}.`,
                registro_referencia_id: productId,
                req: req
            });

            res.json({ message: "Producto actualizado", updatedId: productId });
        } catch (err) {
            logger.error(`Error técnico al actualizar el producto ID ${productId}:`, err);
            next(err);
        }
    },

    async deleteProduct(req, res, next) {
        const productId = req.params.id;
        try {
            const info = await inventarioService.deleteProduct(productId);
            if (info.changes === 0) return res.status(404).json({ message: "Producto no encontrado." });

            // 📑 AUDITORÍA: Eliminación de producto
            await auditService.log({
                usuario_id: req.user?.id || 'UNKNOWN_USER',
                accion: 'ELIMINAR',
                tabla_afectada: 'products',
                detalle: `Se eliminó físicamente/lógicamente el producto con ID: ${productId} del inventario.`,
                registro_referencia_id: productId,
                req: req
            });

            res.json({ message: "Producto eliminado", deletedId: productId });
        } catch (err) {
            logger.error(`Error técnico al eliminar el producto ID ${productId}:`, err);
            next(err);
        }
    },

    async restock(req, res, next) {
        try {
            const { productId, quantity, userId } = req.body;
            if (!productId || !quantity || !userId || quantity <= 0) return res.status(400).json({ message: "Datos inválidos o faltan datos." });

            const updatedProduct = await inventarioService.restockProduct(quantity, productId, userId);

            // 📑 AUDITORÍA: Incremento de existencias
            await auditService.log({
                usuario_id: req.user?.id || userId,
                accion: 'ACTUALIZAR',
                tabla_afectada: 'products',
                detalle: `Reabastecimiento de stock para '${updatedProduct.name}'. Cantidad añadida: +${quantity}.`,
                registro_referencia_id: productId,
                req: req
            });

            res.json({
                message: `Stock de ${updatedProduct.name} actualizado. Nuevo total: ${updatedProduct.quantity}`,
                newQuantity: updatedProduct.quantity
            });
        } catch (err) {
            if (err.message === "ForbiddenOrNotFound") {
                return res.status(403).json({ message: "Acceso denegado o producto no encontrado." });
            }
            logger.error("Error técnico durante el proceso de restock:", err);
            next(err);
        }
    },

    async checkout(req, res, next) {
        try {
            const { items, userId } = req.body;
            if (!items || items.length === 0) return res.status(400).json({ message: "Carrito vacío." });
            if (!userId) return res.status(400).json({ message: "Usuario no identificado." });

            const result = await inventarioService.checkout(items, userId);

            // 📑 AUDITORÍA: Punto de venta / Orden procesada
            await auditService.log({
                usuario_id: req.user?.id || userId,
                accion: 'CREAR',
                tabla_afectada: 'sales',
                detalle: `Venta consolidada exitosamente. Total cobrado: $${result.totalPaid}. Artículos adquiridos: ${items.length}.`,
                registro_referencia_id: result.saleId,
                req: req
            });

            res.json({ message: "Compra exitosa", total_paid: result.totalPaid, orderId: result.saleId });
        } catch (err) {
            logger.error("Error técnico al ejecutar el checkout de productos:", err);
            res.status(400).json({ message: err.message });
        }
    },

    async getSales(req, res, next) {
        try { 
            const sales = await inventarioService.getSales(req.params.userId);
            res.json({ sales }); 
        } catch (err) { 
            logger.error("Error técnico al recuperar órdenes de venta parciales:", err);
            next(err); 
        }
    },

    async getSalesHistory(req, res, next) {
        try { 
            const sales = await inventarioService.getSalesHistory(req.params.userId);
            res.json({ sales }); 
        } catch (err) { 
            logger.error("Error técnico al consultar el historial general de ventas:", err);
            next(err); 
        }
    },

    // --- PROVEEDORES ---
    async createSupplier(req, res, next) {
        try {
            const { name, contact_name, phone, email, address, Id_user } = req.body;
            if (!name || !contact_name || !Id_user) return res.status(400).json({ message: "Campos obligatorios faltantes." });
            
            const supplier = await inventarioService.createSupplier({ name, contact_name, phone, email, address, Id_user });

            // 📑 AUDITORÍA: Alta de proveedor
            await auditService.log({
                usuario_id: req.user?.id || Id_user,
                accion: 'CREAR',
                tabla_afectada: 'suppliers',
                detalle: `Se registró un nuevo proveedor de insumos comercial: '${name}' (Contacto: ${contact_name}).`,
                registro_referencia_id: supplier?.id || null,
                req: req
            });

            res.status(201).json({ message: "Proveedor creado", supplier });
        } catch (err) { 
            logger.error("Error técnico al añadir proveedor:", err);
            next(err); 
        }
    },

    async getSuppliers(req, res, next) {
        try {
            if (!req.query.Id_user) return res.status(400).json({ message: "Se requiere el ID de usuario." });
            const suppliers = await inventarioService.getSuppliers(req.query.Id_user);
            res.json({ message: "Proveedores obtenidos", suppliers });
        } catch (err) { 
            logger.error("Error técnico al listar el catálogo de proveedores:", err);
            next(err); 
        }
    },

    async deleteSupplier(req, res, next) {
        const supplierId = req.params.id;
        try {
            if (!req.body.Id_user) return res.status(400).json({ message: "Identificación necesaria." });
            const info = await inventarioService.deleteSupplier(supplierId, req.body.Id_user);
            if (info.changes === 0) return res.status(403).json({ message: "No permitido o no encontrado." });

            // 📑 AUDITORÍA: Baja de proveedor
            await auditService.log({
                usuario_id: req.user?.id || req.body.Id_user,
                accion: 'ELIMINAR',
                tabla_afectada: 'suppliers',
                detalle: `Se dio de baja al proveedor con ID: ${supplierId}.`,
                registro_referencia_id: supplierId,
                req: req
            });

            res.json({ message: "Proveedor eliminado" });
        } catch (err) { 
            logger.error(`Error técnico al eliminar el proveedor ID ${supplierId}:`, err);
            next(err); 
        }
    },

    // --- GIMNASIO (TRABAJADORES, PLANES Y CLIENTES) ---
    async registerWorker(req, res, next) {
        try {
            if (!req.body.name || !req.body.phone) return res.status(400).json({ message: "Datos requeridos faltantes." });
            const result = await inventarioService.registerWorker(req.body);

            // 📑 AUDITORÍA: Registro de staff
            await auditService.log({
                usuario_id: req.user?.id || 'ADMIN_USER',
                accion: 'CREAR',
                tabla_afectada: 'gym_workers',
                detalle: `Se dio de alta un nuevo trabajador/entrenador en el módulo de gimnasio: '${req.body.name}'.`,
                registro_referencia_id: result.id,
                req: req
            });

            res.status(201).json({ message: "Trabajador registrado", id: result.id });
        } catch (err) { 
            logger.error("Error técnico al registrar personal del gimnasio:", err);
            next(err); 
        }
    },

    async getWorkers(req, res, next) { 
        try { 
            const workers = await inventarioService.getWorkers();
            res.json({ workers }); 
        } catch (err) { 
            logger.error("Error técnico al obtener lista de trabajadores:", err);
            next(err); 
        } 
    },

    async deleteWorker(req, res, next) { 
        const workerId = req.params.id;
        try { 
            await inventarioService.deleteWorker(workerId); 

            // 📑 AUDITORÍA: Remoción de staff
            await auditService.log({
                usuario_id: req.user?.id || 'ADMIN_USER',
                accion: 'ELIMINAR',
                tabla_afectada: 'gym_workers',
                detalle: `Se removió el expediente del trabajador ID: ${workerId}.`,
                registro_referencia_id: workerId,
                req: req
            });

            res.json({ message: "Trabajador eliminado" }); 
        } catch (err) { 
            logger.error(`Error técnico al eliminar trabajador ID ${workerId}:`, err);
            next(err); 
        } 
    },

    async createPlan(req, res, next) {
        try {
            if (!req.body.name || !req.body.duration_days) return res.status(400).json({ message: "Datos faltantes." });
            const result = await inventarioService.createPlan(req.body);

            // 📑 AUDITORÍA: Creación de oferta comercial / membresía
            await auditService.log({
                usuario_id: req.user?.id || 'ADMIN_USER',
                accion: 'CREAR',
                tabla_afectada: 'gym_plans',
                detalle: `Se estructuró una nueva membresía/plan: '${req.body.name}' con vigencia de ${req.body.duration_days} días.`,
                registro_referencia_id: result.id,
                req: req
            });

            res.status(201).json({ message: "Plan creado", id: result.id });
        } catch (err) { 
            logger.error("Error técnico al diseñar plan de suscripción:", err);
            next(err); 
        }
    },

    async getPlans(req, res, next) { 
        try { 
            const plans = await inventarioService.getPlans();
            res.json({ plans }); 
        } catch (err) { 
            logger.error("Error técnico al consultar planes vigentes:", err);
            next(err); 
        } 
    },

    async deletePlan(req, res, next) { 
        const planId = req.params.id;
        try { 
            await inventarioService.deletePlan(planId); 

            // 📑 AUDITORÍA: Retiro de plan del mercado
            await auditService.log({
                usuario_id: req.user?.id || 'ADMIN_USER',
                accion: 'ELIMINAR',
                tabla_afectada: 'gym_plans',
                detalle: `Se retiró / eliminó la oferta de suscripción ID: ${planId}.`,
                registro_referencia_id: planId,
                req: req
            });

            res.json({ message: "Plan eliminado" }); 
        } catch (err) { 
            logger.error(`Error técnico al suprimir el plan ID ${planId}:`, err);
            next(err); 
        } 
    },

    async registerClient(req, res, next) {
        try {
            if (!req.body.name || !req.body.phone) return res.status(400).json({ message: "Datos faltantes." });
            const result = await inventarioService.registerClient(req.body);

            // 📑 AUDITORÍA: Afiliación de miembro
            await auditService.log({
                usuario_id: req.user?.id || 'ADMIN_USER',
                accion: 'CREAR',
                tabla_afectada: 'gym_clients',
                detalle: `Se inscribió un nuevo socio a la sucursal: '${req.body.name}'.`,
                registro_referencia_id: result.id,
                req: req
            });

            res.status(201).json({ message: "Cliente registrado", id: result.id });
        } catch (err) { 
            logger.error("Error técnico al dar de alta un nuevo cliente de gimnasio:", err);
            next(err); 
        }
    },

    async getClients(req, res, next) { 
        try { 
            const clients = await inventarioService.getClients();
            res.json({ clients }); 
        } catch (err) { 
            logger.error("Error técnico al listar padrón de clientes:", err);
            next(err); 
        } 
    },

    async deleteClient(req, res, next) { 
        const clientId = req.params.id;
        try { 
            await inventarioService.deleteClient(clientId); 

            // 📑 AUDITORÍA: Cancelación de miembro
            await auditService.log({
                usuario_id: req.user?.id || 'ADMIN_USER',
                accion: 'ELIMINAR',
                tabla_afectada: 'gym_clients',
                detalle: `Se revocó la cuenta del cliente ID: ${clientId}.`,
                registro_referencia_id: clientId,
                req: req
            });

            res.json({ message: "Cliente eliminado" }); 
        } catch (err) { 
            logger.error(`Error técnico al eliminar cliente ID ${clientId}:`, err);
            next(err); 
        } 
    }
};