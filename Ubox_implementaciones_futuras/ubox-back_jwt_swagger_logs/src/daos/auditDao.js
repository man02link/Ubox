import users_bbdd from '../config/db.js';

export const auditDao = {
    async registerLog(logData) {
        const query = `
            INSERT INTO audit_logs (id, usuario_id, accion, tabla_afectada, detalle, registro_referencia_id, fecha, ip_address)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8);
        `;
        
        const values = [
            logData.id,
            logData.usuario_id,
            logData.accion,
            logData.tabla_afectada,
            logData.detalle,
            logData.registro_referencia_id,
            logData.fecha,
            logData.ip_address
        ];

        await users_bbdd.query(query, values);
    }
};