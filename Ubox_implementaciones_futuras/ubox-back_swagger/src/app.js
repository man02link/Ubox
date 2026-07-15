import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import apiRoutes from './routes/apiRoutes.js';
import { errorHandler } from './middlewares/errorHandler.js';
import { env } from './config/env.js';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './config/swagger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Configuración de middlewares globales
app.use(cors({
    origin: env.FRONTEND_URL,
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    credentials: true
}));
app.use(express.json());

// Recursos Estáticos
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
app.use(express.static(path.join(__dirname, '../')));

// --- RUTA DE LA DOCUMENTACIÓN SWAGGER ---
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Vista raíz
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../menu.html'));
});

// --- ENRUTADOR CENTRALIZADO CON PREFIJO ÚNICO ---
app.use('/api', apiRoutes);

// Manejador centralizado de Errores
app.use(errorHandler);

export default app;