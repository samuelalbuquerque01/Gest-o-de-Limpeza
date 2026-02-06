// Backend/src/middleware/errorMiddleware.js
module.exports = function errorMiddleware(err, req, res, next) {
  // Se já tiver headers enviados, delega pro handler padrão do Express
  if (res.headersSent) return next(err);

  const statusCode = err.statusCode || err.status || 500;

  console.error('🔥 ERRO:', err.message);
  if (process.env.NODE_ENV !== 'production') {
    console.error(err.stack);
  }

  return res.status(statusCode).json({
    success: false,
    message: err.message || 'Erro interno do servidor',
  });
};
