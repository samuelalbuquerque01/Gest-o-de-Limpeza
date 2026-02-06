// src/routes/cleaningRoutes.js
const express = require('express');
const router = express.Router();

const cleaningController = require('../controllers/cleaningController');
const authMiddleware = require('../middleware/authMiddleware');

// WORKER (logado): rotas "my"
router.get('/my/today', authMiddleware, cleaningController.getMyTodayCleanings);
router.get('/my/active', authMiddleware, cleaningController.getMyActiveCleaning);

// Rotas principais (precisa estar logado pra iniciar/finalizar/cancelar)
router.post('/start', authMiddleware, cleaningController.startCleaning);
router.post('/complete', authMiddleware, cleaningController.completeCleaning);
router.post('/cancel', authMiddleware, cleaningController.cancelCleaning);

// ADMIN / geral (mantive como estava)
router.get('/today', authMiddleware, cleaningController.getTodayCleanings);
router.get('/history', authMiddleware, cleaningController.getCleaningHistory);
router.get('/active', authMiddleware, cleaningController.getActiveCleanings);
router.get('/recent', authMiddleware, cleaningController.getRecentCleanings);
router.get('/stats', authMiddleware, cleaningController.getCleaningStats);

module.exports = router;
