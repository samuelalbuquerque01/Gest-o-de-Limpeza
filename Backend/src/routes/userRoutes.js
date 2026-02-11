// Backend/src/routes/userRoutes.js
const express = require('express');
const router = express.Router();

const userController = require('../controllers/userController');
const authMiddleware = require('../middleware/authMiddleware');

console.log('✅ userRoutes.js carregado');

// ✅ Protege rotas administrativas
function requireAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Não autenticado' });
  }
  if (req.user.role !== 'ADMIN') {
    return res.status(403).json({ success: false, message: 'Acesso negado' });
  }
  return next();
}

// =========================================================
// ✅ Rotas que o FRONT está chamando
// base: /api/users
// =========================================================
router.get('/', authMiddleware, requireAdmin, userController.listUsers);
router.post('/', authMiddleware, requireAdmin, userController.createUser);
router.put('/:id', authMiddleware, requireAdmin, userController.updateUser);
router.delete('/:id', authMiddleware, requireAdmin, userController.deleteUser);
router.post('/:id/reset-password', authMiddleware, requireAdmin, userController.resetPassword);
router.get('/stats', authMiddleware, requireAdmin, userController.getStats);

// =========================================================
// ✅ 🚨 NOVAS ROTAS - ESTATÍSTICAS DOS FUNCIONÁRIOS
// =========================================================

// GET /api/users/:id/stats - Estatísticas de limpeza do funcionário
router.get('/:id/stats', authMiddleware, requireAdmin, userController.getWorkerStats);

// GET /api/users/:id/login-history - Histórico de login do funcionário
router.get('/:id/login-history', authMiddleware, requireAdmin, userController.getUserLoginHistory);

// GET /api/users/:id/performance - Performance detalhada do funcionário
router.get('/:id/performance', authMiddleware, requireAdmin, userController.getWorkerPerformance);

// =========================================================
// ✅ Rotas legadas (mantidas pra compatibilidade)
// base: /api/users/workers
// =========================================================
router.get('/workers', authMiddleware, requireAdmin, userController.listWorkers);
router.post('/workers', authMiddleware, requireAdmin, userController.createWorker);
router.put('/workers/:id', authMiddleware, requireAdmin, userController.updateWorker);
router.patch('/workers/:id/status', authMiddleware, requireAdmin, userController.setWorkerStatus);
router.post('/workers/:id/reset-password', authMiddleware, requireAdmin, userController.resetWorkerPassword);

module.exports = router;