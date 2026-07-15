import app from './app.js';
import { env } from './config/env.js';

app.listen(env.PORT, () => {
    console.log(`🚀 Servidor ejecutándose en http://localhost:${env.PORT}`);
    console.log(`📦 Almacén de archivos estáticos disponible en /uploads`);
});