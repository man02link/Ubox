import { v4 as uuidv4 } from 'uuid';
import { auditDao } from '../daos/auditDao.js';

export const auditService = {
    async log({ usuario_id, accion, tabla_afectada, detalle, registro_referencia_id = null, req }) {
        try {
            // Extraer la dirección IP desde la petición de Express de forma segura
            const ip_address = req ? (req.headers['x-forwarded-for'] || req.socket.remoteAddress) : '127.0.0.1';

            const newLog = {
                id: uuidv4(),
                usuario_id: usuario_id || 'ANONYMOUS', // Por si falla el login o es un registro público
                accion: accion.toUpperCase(),          // Ej: CREAR, ACTUALIZAR, LOGIN_EXITOSO
                tabla_afectada: tabla_afectada,
                detalle: detalle,
                registro_referencia_id: registro_referencia_id,
                fecha: new Date().toISOString(),      // Formato estándar UTC
                ip_address: ip_address
            };

            await auditDao.registerLog(newLog);
        } catch (error) {
            // Evitamos que un fallo en la auditoría rompa el flujo principal de la app, pero lo dejamos en la consola técnica
            console.error('❌ Error crítico al escribir en la bitácora de auditoría:', error.message);
        }
    }
};