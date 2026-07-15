import { rentasService } from '../services/rentasService.js';
import { rentasDto } from '../dtos/rentasDto.js';

export const rentasController = {
    async getAvailableProducts(req, res, next) {
        try { 
            const products = await rentasService.getAvailableProducts();
            res.json(products); 
        } catch (err) { next(err); }
    },

    async createProductRent(req, res, next) {
        try {
            await rentasService.createProductRent(req.body);
            res.status(201).json({ message: "Producto de renta creado" });
        } catch (err) { next(err); }
    },

    async getRentals(req, res, next) {
        try { 
            const rentals = await rentasService.getRentals();
            res.json(rentals); 
        } catch (err) { next(err); }
    },

    async registerRental(req, res, next) {
        try {
            const cleanData = rentasDto.toCreateRental(req.body);
            if (!cleanData.userId || !cleanData.client_name || !cleanData.client_id_card || cleanData.cartItems.length === 0) {
                return res.status(400).json({ error: "Faltan datos obligatorios para la renta." });
            }
            const rentalId = await rentasService.registerRental(cleanData);
            res.status(201).json({ message: "Renta registrada con éxito", rentalId });
        } catch (err) { 
            res.status(500).json({ error: "Error al registrar la renta." }); 
        }
    },

    async processReturn(req, res, next) {
        try {
            await rentasService.processReturn(req.params.id);
            res.json({ message: "Devolución procesada exitosamente." });
        } catch (err) { 
            res.status(500).json({ error: err.message }); 
        }
    }
};