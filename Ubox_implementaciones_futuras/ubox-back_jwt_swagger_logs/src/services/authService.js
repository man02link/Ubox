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

        // 1. GENERAR ACCESS TOKEN (Duración corta - Usando la variable raíz de env.js)
        // Convertimos el número de milisegundos a string si viene como tal, o por defecto '15m'
        const accessToken = jwt.sign(
            { id: user.id, username: user.username, role: user.role },
            env.JWT_SECRET, // <-- Corregido (Antes: env.jwt.secret)
            { 
                expiresIn: typeof env.jwt.accessTokenExpiration === 'number' 
                    ? `${env.jwt.accessTokenExpiration / 1000}s` 
                    : '15m' 
            }
        );

        // 2. GENERAR REFRESH TOKEN (Duración larga)
        // Agregamos username y role al payload del refresh para que cuando el controller 
        // decodifique el token en la ruta /refresh, tenga los datos listos para firmar el nuevo access
        const refreshToken = jwt.sign(
            { id: user.id, username: user.username, role: user.role }, 
            env.JWT_REFRESH_SECRET, // <-- Corregido (Antes: env.jwt.secret)
            { 
                expiresIn: typeof env.jwt.refreshTokenExpiration === 'number' 
                    ? `${env.jwt.refreshTokenExpiration / 1000}s` 
                    : '7d' 
            } 
        );

        // 3. GUARDAR EL REFRESH TOKEN EN LA BASE DE DATOS
        await authDao.updateRefreshToken(user.id, refreshToken);

        // 4. RETORNAR AMBOS TOKENS AL CONTROLADOR
        return {
            id: user.id,
            username: user.username,
            name: user.name,
            role: user.role,
            accessToken: accessToken, 
            refreshToken: refreshToken 
        };
    }
};