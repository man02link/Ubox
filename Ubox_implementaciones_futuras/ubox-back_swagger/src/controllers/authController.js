import { authService } from '../services/authService.js';

export const authController = {
    async register(req, res, next) {
        const { username, password } = req.body;
        if (!username || !password) return res.status(400).json({ message: "Usuario y contraseña son obligatorios." });

        try {
            await authService.register(req.body);
            res.status(201).json({ message: "Usuario registrado exitosamente" });
        } catch (err) {
            if (err.message === "UserAlreadyExists") return res.status(400).json({ message: "El nombre de usuario ya está en uso." });
            next(err);
        }
    },

    async login(req, res, next) {
        const { username, password } = req.body;
        if (!username || !password) return res.status(400).json({ message: "Credenciales incompletas." });

        try {
            const userData = await authService.login(username, password);
            // Al responder, userData ya traerá el objeto con el token incluido dentro de "user"
            res.json({ message: "Login exitoso", user: userData });
        } catch (err) {
            if (err.message === "InvalidCredentials") return res.status(401).json({ message: "Usuario o contraseña incorrectos." });
            next(err);
        }
    }
};