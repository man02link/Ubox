export const errorHandler = (err, req, res, next) => {
    console.error("❌ Error Capturado:", err.message);
    res.status(500).json({
        message: "Ocurrió un error interno en el servidor",
        error: err.message
    });
};