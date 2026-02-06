// Backend/src/routes/reportRoutes.js
const express = require('express');
const router = express.Router();

const reportController = require('../controllers/reportController');
const authMiddleware = require('../middleware/authMiddleware');

console.log('📊 reportRoutes.js carregado');

// Resumo para dashboard / relatórios
router.get('/summary', authMiddleware, reportController.getSummary);

// Lista detalhada (com filtros)
router.get('/cleanings', authMiddleware, reportController.getCleaningsReport);

// Exportar CSV
router.get('/export', authMiddleware, reportController.exportCleaningsCsv);

module.exports = router;
