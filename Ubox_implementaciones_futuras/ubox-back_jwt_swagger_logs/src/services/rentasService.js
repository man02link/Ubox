import { v4 as uuidv4 } from 'uuid';
import { rentasDao } from '../daos/rentasDao.js';

export const rentasService = {
    async getAvailableProducts() { return await rentasDao.findAvailableProducts(); },
    async createProductRent(data) { 
        const product = { id: uuidv4(), createdAt: new Date().toISOString(), ...data, rental_price_day: parseFloat(data.rental_price_day) };
        return await rentasDao.createProductRent(product); 
    },
    async getRentals() { return await rentasDao.findAllRentals(); },

    async registerRental(dtoData) {
        const rentalId = uuidv4();
        const date_start = new Date().toISOString();
        const total_contract = dtoData.cartItems.reduce((sum, item) => sum + (parseFloat(item.price) * (item.quantity || 1)), 0);

        const rentalData = {
            id: rentalId,
            userId: dtoData.userId,
            client_name: dtoData.client_name,
            client_id_card: dtoData.client_id_card,
            client_phone: dtoData.client_phone,
            client_email: dtoData.client_email,
            date_start,
            date_end_plan: dtoData.date_end_plan,
            total_contract
        };

        await rentasDao.executeRentalTransaction(rentalData, dtoData.cartItems);
        return rentalId;
    },

    async processReturn(id) {
        await rentasDao.executeReturnTransaction(id);
    }
};