// Backend/src/routes/userRoutes.js
const express = require('express');
const router = express.Router();

const userController = require('../controllers/userController');
const authMiddleware = require('../middleware/authMiddleware');

console.log('✅ userRoutes.js carregado');

function requireAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Não autenticado' });
  }
  if (req.user.role !== 'ADMIN') {
    return res.status(403).json({ success: false, message: 'Acesso negado' });
  }
  return next();
}

// ----
//  Rotas principais - /api/users
// ----
router.get('/', authMiddleware, requireAdmin, userController.listUsers);
router.post('/', authMiddleware, requireAdmin, userController.createUser);
router.put('/:id', authMiddleware, requireAdmin, userController.updateUser);
router.delete('/:id', authMiddleware, requireAdmin, userController.deleteUser);
router.get('/stats', authMiddleware, requireAdmin, userController.getStats);

// ----
//  Rotas novas - ESTATÍSTICAS DOS FUNCIONÁRIOS
// ----
router.get('/:id/stats', authMiddleware, requireAdmin, userController.getWorkerStats);
router.get('/:id/login-history', authMiddleware, requireAdmin, userController.getUserLoginHistory);
router.get('/:id/performance', authMiddleware, requireAdmin, userController.getWorkerPerformance);

// ----
//  Rotas legadas - /api/users/workers
// ----
router.get('/workers', authMiddleware, requireAdmin, userController.listWorkers);
router.post('/workers', authMiddleware, requireAdmin, userController.createWorker);
router.put('/workers/:id', authMiddleware, requireAdmin, userController.updateWorker);
router.patch('/workers/:id/status', authMiddleware, requireAdmin, userController.setWorkerStatus);

module.exports = router;
