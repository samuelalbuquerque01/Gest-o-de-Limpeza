// Backend/src/middleware/authMiddleware.js
const jwt = require('jsonwebtoken');
const config = require('../../config');
const prisma = require('../utils/database');

module.exports = async function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!token) {
      return res.status(401).json({ success: false, message: 'Token não informado' });
    }

    const secret = config.jwt?.secret || process.env.JWT_SECRET || 'dev_secret_change_me';
    const decoded = jwt.verify(token, secret);

    // decoded precisa ter userId (ou id) dependendo do teu authController
    const userId = decoded.userId || decoded.id;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Token inválido' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, role: true, status: true },
    });

    if (!user || user.status !== 'ACTIVE') {
      return res.status(401).json({ success: false, message: 'Usuário inválido ou inativo' });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Token inválido ou expirado' });
  }
};
