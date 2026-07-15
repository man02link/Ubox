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
    // --- NUEVA CONFIGURACIÓN PARA TOKENS JWT ---
    jwt: {
        secret: process.env.JWT_SECRET || 'mi_secreto_super_seguro_por_defecto',
        accessTokenExpiration: process.env.JWT_ACCESS_TOKEN_EXPIRATION || '8h', // Si prefieres string como '8h' o '15m'
        refreshTokenExpiration: process.env.JWT_REFRESH_TOKEN_EXPIRATION || '7d'
    }
};