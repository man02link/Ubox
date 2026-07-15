import express from 'express';
import cors from 'cors';
import path from 'path';
import morgan from 'morgan'; // <-- ¡FALTABA ESTE IMPORT!
import { fileURLToPath } from 'url';
import apiRoutes from './routes/apiRoutes.js';
import { errorHandler } from './middlewares/errorHandler.js';
import { env } from './config/env.js';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './config/swagger.js';
import { logger } from './config/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Configuración de middlewares globales
app.use(cors({
    origin: env.FRONTEND_URL,
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    credentials: true
}));

// Middleware de Logs Técnicos para peticiones HTTP
// Captura el flujo de red y lo envía estructurado a través de Winston
app.use(morgan(':method :url :status :res[content-length] - :response-time ms', {
    stream: { write: (message) => logger.info(message.trim()) }
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