import dotenv from 'dotenv';
dotenv.config();

export const env = {
    PORT: process.env.PORT || 3000,
    FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173',
    db: {
        user: process.env.DB_USER || 'postgres',
        host: process.env.DB_HOST || 'localhost',
        database: process.env.DB_NAME || 'Ubox',
        password: process.env.DB_PASSWORD || 'root123',
        port: parseInt(process.env.DB_PORT || '5432', 10)
    },
    // --- CONFIGURACIÓN PARA TOKENS JWT CORREGIDA ---
    JWT_SECRET: process.env.JWT_SECRET || 'mi_secreto_super_seguro_por_defecto',
    JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'mi_secreto_refresh_super_seguro_por_defecto',
    jwt: {
        accessTokenExpiration: process.env.JWT_ACCESS_TOKEN_EXPIRATION || '15m', 
        refreshTokenExpiration: process.env.JWT_REFRESH_TOKEN_EXPIRATION || '7d'
    }
};