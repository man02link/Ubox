import winston from 'winston';

// Definir formatos personalizados (Estructurado JSON vs Texto Limpio)
const { combine, timestamp, printf, errors, json, colorize } = winston.format;

// Formato legible para la consola de desarrollo (Equivalente a Serilog.Sinks.Console)
const consoleLogFormat = printf(({ level, message, timestamp, stack }) => {
    return `[${timestamp}] ${level}: ${stack || message}`;
});

export const logger = winston.createLogger({
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    format: combine(
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        errors({ stack: true }), // Captura automáticamente el árbol de llamadas en caso de error/excepción
        json() // Registra datos estructurados internamente (JSON)
    ),
    transports: [
        // 1. Sink de Consola: Con colores y formato limpio para desarrollo
        new winston.transports.Console({
            format: combine(
                colorize(),
                consoleLogFormat
            )
        }),
        // 2. Sink de Archivo: Guarda absolutamente todo en formato estructurado JSON (Equivalente a Serilog.Sinks.File)
        new winston.transports.File({ 
            filename: 'logs/app-technical.log',
            level: 'info'
        }),
        // Archivo exclusivo para registrar fallos catastróficos del sistema
        new winston.transports.File({ 
            filename: 'logs/exceptions.log', 
            level: 'error' 
        })
    ]
});