import { Router } from 'express';
import { rentasController } from '../controllers/rentasController.js';

const router = Router();

/**
 * @openapi
 * /api/products-rent:
 *   get:
 *     summary: Obtener catálogo de productos disponibles para renta
 *     tags:
 *       - Módulo de Rentas
 *     responses:
 *       200:
 *         description: Inventario disponible de renta devuelto.
 *   post:
 *     summary: Registrar un nuevo artículo específico para el pool de rentas
 *     tags:
 *       - Módulo de Rentas
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - id
 *               - name
 *               - rental_price_day
 *               - serial_number
 *             properties:
 *               id:
 *                 type: string
 *               name:
 *                 type: string
 *               rental_price_day:
 *                 type: number
 *               serial_number:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       201:
 *         description: Producto de alquiler guardado correctamente.
 */
router.get('/products-rent', rentasController.getAvailableProducts);
router.post('/products-rent', rentasController.createProductRent);

/**
 * @openapi
 * /api/rentas:
 *   get:
 *     summary: Obtener contratos de rentas
 *     tags:
 *       - Módulo de Rentas
 *     responses:
 *       200:
 *         description: Lista completa de registros de renta devuelta.
 *   post:
 *     summary: Registrar un nuevo alquiler (Transacción contractual)
 *     tags:
 *       - Módulo de Rentas
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *               - client_name
 *               - client_id_card
 *               - cartItems
 *             properties:
 *               id:
 *                 type: string
 *               userId:
 *                 type: string
 *               client_name:
 *                 type: string
 *               client_id_card:
 *                 type: string
 *               client_phone:
 *                 type: string
 *               client_email:
 *                 type: string
 *               date_start:
 *                 type: string
 *               date_end_plan:
 *                 type: string
 *               total_contract:
 *                 type: number
 *               cartItems:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     price:
 *                       type: number
 *                     quantity:
 *                       type: integer
 *     responses:
 *       201:
 *         description: Operación de alquiler registrada.
 */
router.get('/rentas', rentasController.getRentals);
router.post('/rentas', rentasController.registerRental);

/**
 * @openapi
 * /api/rentas/devolucion/{id}:
 *   post:
 *     summary: Procesar la devolución completa de una renta
 *     tags:
 *       - Módulo de Rentas
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID único de la transacción a finalizar
 *     responses:
 *       200:
 *         description: Devolución procesada con éxito.
 *       500:
 *         description: Error de consistencia al procesar la devolución.
 */
router.post('/rentas/devolucion/:id', rentasController.processReturn);

export default router;