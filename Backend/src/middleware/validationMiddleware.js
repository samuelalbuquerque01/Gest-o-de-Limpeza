// Backend/src/middleware/validationMiddleware.js
const validateLogin = (req, res, next) => {
  console.log('🔍 Validando login...');
  const { email, password } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: 'Email e senha são obrigatórios',
    });
  }

  next();
};

const validateWorkerLogin = (req, res, next) => {
  console.log('🔍 Validando login worker...');
  const { identifier, password } = req.body || {};

  if (!identifier || !password) {
    return res.status(400).json({
      success: false,
      message: 'Identificador e senha são obrigatórios',
    });
  }

  next();
};

module.exports = {
  validateLogin,
  validateWorkerLogin,
};
