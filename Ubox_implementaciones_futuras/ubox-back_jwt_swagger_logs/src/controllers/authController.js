import jwt from 'jsonwebtoken';                             // <-- Añadido para firmar/verificar tokens
import { env } from '../config/env.js';                     // <-- Añadido para acceder a los secrets
import { authService } from '../services/authService.js';
import { auditService } from '../services/auditService.js'; // Bitácora de Auditoría
import { logger } from '../config/logger.js';               // Bitácora Técnica

export const authController = {
    async register(req, res, next) {
        const { username, password } = req.body;
        if (!username || !password) return res.status(400).json({ message: "Usuario y contraseña son obligatorios." });

        try {
            await authService.register(req.body);

            // 📑 AUDITORÍA: Registro de nuevo usuario en el sistema
            await auditService.log({
                usuario_id: 'SYSTEM_REGISTRATION', 
                accion: 'CREAR',
                tabla_afectada: 'users',
                detalle: `Se registró una nueva cuenta de usuario con el username: '${username}'.`,
                req: req
            });

            res.status(201).json({ message: "Usuario registrado exitosamente" });
        } catch (err) {
            if (err.message === "UserAlreadyExists") {
                return res.status(400).json({ message: "El nombre de usuario ya está en uso." });
            }
            // ❌ LOG TÉCNICO: Error inesperado durante el registro
            logger.error(`Excepción técnica en registro del usuario ${username}:`, err);
            next(err);
        }
    }, // <-- Coma de separación obligatoria

    async login(req, res, next) {
        const { username, password } = req.body;
        if (!username || !password) return res.status(400).json({ message: "Credenciales incompletas." });

        try {
            const userData = await authService.login(username, password);
            
            // 📑 AUDITORÍA: El inicio de sesión fue exitoso
            await auditService.log({
                usuario_id: userData.id,
                accion: 'LOGIN_EXITOSO',
                tabla_afectada: 'users',
                detalle: `El usuario '${username}' ha iniciado sesión de manera correcta en el sistema.`,
                req: req
            });

            res.json({ message: "Login exitoso", user: userData });
        } catch (err) {
            if (err.message === "InvalidCredentials") {
                // Log opcional de advertencia técnica por seguridad frente a ataques de fuerza bruta
                logger.warn(`Intento de login fallido para el usuario: ${username}`);
                return res.status(401).json({ message: "Usuario o contraseña incorrectos." });
            }
            // ❌ LOG TÉCNICO: Fallo crítico de base de datos o servidor durante el login
            logger.error(`Excepción técnica en login del usuario ${username}:`, err);
            next(err);
        }
    }, // <-- ¡AQUÍ FALTABA ESTA COMA!

    async refreshToken(req, res, next) {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            return res.status(401).json({ message: "Refresh Token requerido." });
        }

        try {
            // Verificar si el Refresh Token es válido y no ha expirado
            const decoded = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET);

            // Generar un nuevo Access Token con la información del usuario
            const newAccessToken = jwt.sign(
                { id: decoded.id, username: decoded.username, role: decoded.role },
                env.JWT_SECRET,
                { expiresIn: '15m' } // Nueva vigencia corta de 15 minutos
            );

            // Responder al frontend
            res.json({ accessToken: newAccessToken });

        } catch (err) {
            // Si el refresh token también expiró o fue alterado, lanzamos advertencia técnica
            logger.warn(`Intento de refresco de token inválido o expirado.`);
            return res.status(403).json({ message: "Refresh Token inválido o expirado. Inicie sesión de nuevo." });
        }
    }
};