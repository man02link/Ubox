import swaggerJsdoc from 'swagger-jsdoc';
import { env } from './env.js';

const options = {
    definition: {
        openapi: '3.0.0',
        info: {
          title: 'U-Box API Documentation',
          version: '1.0.0',
          description: 'Documentación oficial de los módulos de Inventario, Rentas y Gimnasio para la plataforma U-Box.',
        },
        servers: [
          {
            url: `http://localhost:${env.PORT || 3000}`,
            description: 'Servidor Local de Desarrollo',
          },
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                },
            },
        },
        // 🔒 ESTA ES LA PIEZA FALTANTE:
        // Vincula el esquema "bearerAuth" globalmente a la documentación
        security: [
            {
                bearerAuth: [], // Indica que, por defecto, las rutas usan este candado
            },
        ],
    },
    apis: ['./src/routes/*.js', './src/controllers/*.js'], 
};

export const swaggerSpec = swaggerJsdoc(options);