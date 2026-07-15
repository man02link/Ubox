import { inventarioService } from '../services/inventarioService.js';
import { inventarioDto } from '../dtos/inventarioDto.js';

export const inventarioController = {
    async createProduct(req, res, next) {
        try {
            const cleanData = inventarioDto.toCreateProduct(req.body, req.file);
            const product = await inventarioService.createProduct(cleanData);
            res.status(201).json({ message: "Producto creado exitosamente", product });
        } catch (err) { next(err); }
    },

    async getProductById(req, res, next) {
        try {
            // Se agrega await porque el servicio ahora consulta asíncronamente a Postgres
            const product = await inventarioService.getProductById(req.params.id);
            if (!product) return res.status(404).json({ message: "Producto no encontrado." });
            res.json({ message: "Producto encontrado", product });
        } catch (err) { next(err); }
    },

    async getProducts(req, res, next) {
        try {
            const products = await inventarioService.getAllProducts(req.query.userId);
            res.json({ products });
        } catch (err) { next(err); }
    },

    async updateProduct(req, res, next) {
        try {
            const fieldsToUpdate = inventarioDto.toUpdateProduct(req.body);
            if (Object.keys(fieldsToUpdate).length === 0) return res.status(400).json({ message: "No hay campos para actualizar." });

            const info = await inventarioService.updateProduct(req.params.id, fieldsToUpdate);
            if (info.changes === 0) return res.status(404).json({ message: "Producto no encontrado." });
            res.json({ message: "Producto actualizado", updatedId: req.params.id });
        } catch (err) { next(err); }
    },

    async deleteProduct(req, res, next) {
        try {
            const info = await inventarioService.deleteProduct(req.params.id);
            if (info.changes === 0) return res.status(404).json({ message: "Producto no encontrado." });
            res.json({ message: "Producto eliminado", deletedId: req.params.id });
        } catch (err) { next(err); }
    },

    async restock(req, res, next) {
        try {
            const { productId, quantity, userId } = req.body;
            if (!productId || !quantity || !userId || quantity <= 0) return res.status(400).json({ message: "Datos inválidos o faltan datos." });

            const updatedProduct = await inventarioService.restockProduct(quantity, productId, userId);
            res.json({
                message: `Stock de ${updatedProduct.name} actualizado. Nuevo total: ${updatedProduct.quantity}`,
                newQuantity: updatedProduct.quantity
            });
        } catch (err) {
            if (err.message === "ForbiddenOrNotFound") {
                return res.status(403).json({ message: "Acceso denegado o producto no encontrado." });
            }
            next(err);
        }
    },

    async checkout(req, res, next) {
        try {
            const { items, userId } = req.body;
            if (!items || items.length === 0) return res.status(400).json({ message: "Carrito vacío." });
            if (!userId) return res.status(400).json({ message: "Usuario no identificado." });

            const result = await inventarioService.checkout(items, userId);
            res.json({ message: "Compra exitosa", total_paid: result.totalPaid, orderId: result.saleId });
        } catch (err) { res.status(400).json({ message: err.message }); }
    },

    async getSales(req, res, next) {
        try { 
            const sales = await inventarioService.getSales(req.params.userId);
            res.json({ sales }); 
        } catch (err) { next(err); }
    },

    async getSalesHistory(req, res, next) {
        try { 
            const sales = await inventarioService.getSalesHistory(req.params.userId);
            res.json({ sales }); 
        } catch (err) { next(err); }
    },

    // --- PROVEEDORES ---
    async createSupplier(req, res, next) {
        try {
            const { name, contact_name, phone, email, address, Id_user } = req.body;
            if (!name || !contact_name || !Id_user) return res.status(400).json({ message: "Campos obligatorios faltantes." });
            const supplier = await inventarioService.createSupplier({ name, contact_name, phone, email, address, Id_user });
            res.status(201).json({ message: "Proveedor creado", supplier });
        } catch (err) { next(err); }
    },
    async getSuppliers(req, res, next) {
        try {
            if (!req.query.Id_user) return res.status(400).json({ message: "Se requiere el ID de usuario." });
            const suppliers = await inventarioService.getSuppliers(req.query.Id_user);
            res.json({ message: "Proveedores obtenidos", suppliers });
        } catch (err) { next(err); }
    },
    async deleteSupplier(req, res, next) {
        try {
            if (!req.body.Id_user) return res.status(400).json({ message: "Identificación necesaria." });
            const info = await inventarioService.deleteSupplier(req.params.id, req.body.Id_user);
            if (info.changes === 0) return res.status(403).json({ message: "No permitido o no encontrado." });
            res.json({ message: "Proveedor eliminado" });
        } catch (err) { next(err); }
    },

    // --- GIMNASIO ---
    async registerWorker(req, res, next) {
        try {
            if (!req.body.name || !req.body.phone) return res.status(400).json({ message: "Datos requeridos faltantes." });
            const result = await inventarioService.registerWorker(req.body);
            res.status(201).json({ message: "Trabajador registrado", id: result.id });
        } catch (err) { next(err); }
    },
    async getWorkers(req, res, next) { 
        try { 
            const workers = await inventarioService.getWorkers();
            res.json({ workers }); 
        } catch (err) { next(err); } 
    },
    async deleteWorker(req, res, next) { 
        try { 
            await inventarioService.deleteWorker(req.params.id); 
            res.json({ message: "Trabajador eliminado" }); 
        } catch (err) { next(err); } 
    },

    async createPlan(req, res, next) {
        try {
            if (!req.body.name || !req.body.duration_days) return res.status(400).json({ message: "Datos faltantes." });
            const result = await inventarioService.createPlan(req.body);
            res.status(201).json({ message: "Plan creado", id: result.id });
        } catch (err) { next(err); }
    },
    async getPlans(req, res, next) { 
        try { 
            const plans = await inventarioService.getPlans();
            res.json({ plans }); 
        } catch (err) { next(err); } 
    },
    async deletePlan(req, res, next) { 
        try { 
            await inventarioService.deletePlan(req.params.id); 
            res.json({ message: "Plan eliminado" }); 
        } catch (err) { next(err); } 
    },

    async registerClient(req, res, next) {
        try {
            if (!req.body.name || !req.body.phone) return res.status(400).json({ message: "Datos faltantes." });
            const result = await inventarioService.registerClient(req.body);
            res.status(201).json({ message: "Cliente registrado", id: result.id });
        } catch (err) { next(err); }
    },
    async getClients(req, res, next) { 
        try { 
            const clients = await inventarioService.getClients();
            res.json({ clients }); 
        } catch (err) { next(err); } 
    },
    async deleteClient(req, res, next) { 
        try { 
            await inventarioService.deleteClient(req.params.id); 
            res.json({ message: "Cliente eliminado" }); 
        } catch (err) { next(err); } 
    }
};