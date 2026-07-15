import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

export const verifyToken = (req, res, next) => {
    // 1. Extraer el header Authorization
    const authHeader = req.headers['authorization'];
    
    // El formato es "Bearer TOKEN", así que separamos por el espacio
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: "Acceso denegado. No se proporcionó un token." });
    }

    try {
        // 2. Verificar si el token es válido y no ha expirado
        const decoded = jwt.verify(token, env.jwt.secret);
        
        // 3. Inyectar los datos del usuario en la petición (req) para usarlo en los controladores
        req.user = decoded; 
        
        next(); // Continuar al controlador de la ruta
    } catch (error) {
        return res.status(403).json({ message: "Token inválido o expirado." });
    }
};