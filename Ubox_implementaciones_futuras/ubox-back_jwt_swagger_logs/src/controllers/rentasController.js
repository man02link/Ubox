import { rentasService } from '../services/rentasService.js';
import { rentasDto } from '../dtos/rentasDto.js';
import { auditService } from '../services/auditService.js'; // Bitácora de Auditoría
import { logger } from '../config/logger.js';               // Bitácora Técnica

export const rentasController = {
    async getAvailableProducts(req, res, next) {
        try { 
            const products = await rentasService.getAvailableProducts();
            res.json(products); 
        } catch (err) { 
            // ❌ LOG TÉCNICO: Error al leer datos del catálogo
            logger.error("Error al obtener productos disponibles para renta:", err);
            next(err); 
        }
    },

    async createProductRent(req, res, next) {
        try {
            const newProduct = await rentasService.createProductRent(req.body);
            
            // 📑 AUDITORÍA: Creación física de un producto para rentar
            await auditService.log({
                usuario_id: req.user?.id || 'ADMIN_USER',
                accion: 'CREAR',
                tabla_afectada: 'products_rent',
                detalle: `Se añadió un nuevo artículo al catálogo de rentas: '${req.body.name || 'Sin nombre'}'.`,
                registro_referencia_id: newProduct?.id || null,
                req: req
            });

            res.status(201).json({ message: "Producto de renta creado" });
        } catch (err) { 
            // ❌ LOG TÉCNICO
            logger.error("Error al crear producto de renta:", err);
            next(err); 
        }
    },

    async getRentals(req, res, next) {
        try { 
            const rentals = await rentasService.getRentals();
            res.json(rentals); 
        } catch (err) { 
            // ❌ LOG TÉCNICO
            logger.error("Error al consultar historial global de rentas:", err);
            next(err); 
        }
    },

    async registerRental(req, res, next) {
        try {
            const cleanData = rentasDto.toCreateRental(req.body);
            if (!cleanData.userId || !cleanData.client_name || !cleanData.client_id_card || cleanData.cartItems.length === 0) {
                return res.status(400).json({ error: "Faltan datos obligatorios para la renta." });
            }

            const rentalId = await rentasService.registerRental(cleanData);

            // 📑 AUDITORÍA: Registro de transacción financiera/renta
            await auditService.log({
                usuario_id: req.user?.id || cleanData.userId, 
                accion: 'CREAR',
                tabla_afectada: 'rentals',
                detalle: `Se registró una nueva renta de artículos para el cliente '${cleanData.client_name}'.`,
                registro_referencia_id: rentalId,
                req: req
            });

            res.status(201).json({ message: "Renta registrada con éxito", rentalId });
        } catch (err) { 
            // ❌ LOG TÉCNICO
            logger.error("Error crítico en el proceso de registro de renta:", err);
            res.status(500).json({ error: "Error al registrar la renta." }); 
        }
    },

    async processReturn(req, res, next) {
        const rentalId = req.params.id;
        try {
            await rentasService.processReturn(rentalId);

            // 📑 AUDITORÍA: Devolución de equipo
            await auditService.log({
                usuario_id: req.user?.id || 'OPERATOR_USER',
                accion: 'ACTUALIZAR',
                tabla_afectada: 'rentals',
                detalle: `Se procesó la devolución total y cierre del contrato de renta.`,
                registro_referencia_id: rentalId,
                req: req
            });

            res.json({ message: "Devolución procesada exitosamente." });
        } catch (err) { 
            // ❌ LOG TÉCNICO
            logger.error(`Error al procesar la devolución física de la renta ID ${rentalId}:`, err);
            res.status(500).json({ error: err.message }); 
        }
    }
};