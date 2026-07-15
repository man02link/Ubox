import { Router } from 'express';
import authRoutes from './authRoutes.js';
import inventarioRoutes from './inventarioRoutes.js';
import rentasRoutes from './rentasRoutes.js';
import { verifyToken } from '../middlewares/authMiddleware.js';

const router = Router();

// Como app.js ya pone '/api', aquí estructuramos los sub-caminos:
router.use('/auth', authRoutes); // Esto creará: /api/auth/register y /api/auth/login
router.use(verifyToken,inventarioRoutes);    // Esto creará: /api/products, /api/suppliers, etc.
router.use(verifyToken,rentasRoutes);        // Esto creará: /api/products-rent, /api/rentas (quitamos el '/api' repetido)

export default router;