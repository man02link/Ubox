import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { authDao } from '../daos/authDao.js';
import { env } from '../config/env.js';

export const authService = {
    async register(userData) {
        const userExists = await authDao.findByUsername(userData.username);
        if (userExists) throw new Error("UserAlreadyExists");

        const hashedPassword = await bcrypt.hash(userData.password, 10);
        const newUser = {
            id: uuidv4(),
            username: userData.username,
            password: hashedPassword,
            name: userData.name || '',
            phone: userData.phone || '',
            email: userData.email || '',
            address: userData.address || '',
            role: userData.role || 'user',
            createdAt: new Date().toISOString()
        };

        await authDao.createUser(newUser);
    },

    async login(username, password) {
        const user = await authDao.findByUsername(username);
        if (!user) throw new Error("InvalidCredentials");

        const match = await bcrypt.compare(password, user.password);
        if (!match) throw new Error("InvalidCredentials");

        // 1. GENERAR ACCESS TOKEN (Duración corta - Ej: 15 minutos)
        // Usamos tus variables de env.js mapeadas
        const accessToken = jwt.sign(
            { id: user.id, username: user.username, role: user.role },
            env.jwt.secret,
            { expiresIn: env.jwt.accessTokenExpiration === '600000' ? '15m' : '15m' }
        );

        // 2. GENERAR REFRESH TOKEN (Duración larga - Ej: 7 días o lo configurado)
        const refreshToken = jwt.sign(
            { id: user.id }, // Solo necesitamos el ID para refrescar
            env.jwt.secret,  // Puedes usar el mismo secreto o uno diferente
            { expiresIn: '7d' } 
        );

        // 3. GUARDAR EL REFRESH TOKEN EN LA BASE DE DATOS
        await authDao.updateRefreshToken(user.id, refreshToken);

        // 4. RETORNAR AMBOS TOKENS AL CONTROLADOR
        return {
            id: user.id,
            username: user.username,
            name: user.name,
            role: user.role,
            accessToken: accessToken, // <-- Swagger usará este para "Authorize"
            refreshToken: refreshToken // <-- Tu Front en React guardará este en localStorage/Cookies
        };
    }
};