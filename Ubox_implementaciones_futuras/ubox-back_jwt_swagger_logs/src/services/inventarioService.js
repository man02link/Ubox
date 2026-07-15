import { v4 as uuidv4 } from 'uuid';
import { inventarioDao } from '../daos/inventarioDao.js';

export const inventarioService = {
    async createProduct(dtoData) {
        const productData = {
            id: uuidv4(),
            createdAt: new Date().toISOString(),
            ...dtoData
        };
        await inventarioDao.createProduct(productData);
        return productData;
    },

    async getProductById(id) { return await inventarioDao.findById(id); },
    async getAllProducts(userId) { return await inventarioDao.findAll(userId); },
    async updateProduct(id, fields) { return await inventarioDao.update(id, fields); },
    async deleteProduct(id) { return await inventarioDao.delete(id); },

    async restockProduct(quantity, productId, userId) {
        const res = await inventarioDao.restock(parseInt(quantity), productId, userId);
        if (res.rowCount === 0) throw new Error("ForbiddenOrNotFound");
        return await inventarioDao.findById(productId);
    },

    async checkout(items, userId) {
        const saleId = uuidv4();
        const createdAt = new Date().toISOString();
        const totalPaid = await inventarioDao.executeCheckoutTransaction(saleId, userId, items, createdAt);
        return { totalPaid, saleId };
    },

    async getSales(userId) { return await inventarioDao.getSales(userId); },
    async getSalesHistory(userId) { return await inventarioDao.getSalesHistory(userId); },

    async createSupplier(data) {
        const supplier = { id: uuidv4(), createdAt: new Date().toISOString(), ...data };
        await inventarioDao.createSupplier(supplier);
        return supplier;
    },
    async getSuppliers(userId) { return await inventarioDao.findSuppliersByUser(userId); },
    async deleteSupplier(id, userId) { return await inventarioDao.deleteSupplier(id, userId); },

    async registerWorker(data) { 
        const worker = { id: uuidv4(), createdAt: new Date().toISOString(), ...data, salary: parseFloat(data.salary) || 0 };
        await inventarioDao.createWorker(worker);
        return worker;
    },
    async getWorkers() { return await inventarioDao.findAllWorkers(); },
    async deleteWorker(id) { return await inventarioDao.deleteWorker(id); },
    
    async createPlan(data) { 
        const plan = { id: uuidv4(), createdAt: new Date().toISOString(), name: data.name, duration_days: parseInt(data.duration_days) };
        await inventarioDao.createPlan(plan);
        return plan;
    },
    async getPlans() { return await inventarioDao.findAllPlans(); },
    async deletePlan(id) { return await inventarioDao.deletePlan(id); },

    async registerClient(data) { 
        const client = { id: uuidv4(), enrollment_date: new Date().toISOString(), ...data };
        await inventarioDao.createClient(client);
        return client;
    },
    async getClients() { return await inventarioDao.findAllClients(); },
    async deleteClient(id) { return await inventarioDao.deleteClient(id); }
};