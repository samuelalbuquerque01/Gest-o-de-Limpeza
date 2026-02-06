// src/routes/qrRoutes.js
const express = require('express');
const router = express.Router();
const QRController = require('../controllers/qrController');
const authMiddleware = require('../middleware/authMiddleware');

console.log('✅ qrRoutes.js carregado');

// ✅ Middleware de admin
function requireAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ 
      success: false, 
      message: 'Não autenticado' 
    });
  }
  
  if (req.user.role !== 'ADMIN') {
    return res.status(403).json({ 
      success: false, 
      message: 'Acesso negado. Apenas administradores podem gerar QR Codes.' 
    });
  }
  
  next();
}

// ✅ Rota pública para validação (qualquer um pode validar)
router.post('/validate', QRController.validateQRCode);

// ✅ Rota pública para escanear (já existe em roomRoutes)
// GET /rooms/qr/:qrCode

// ✅ Rotas protegidas (apenas admin)

// 1. Gerar QR Code para uma sala específica
router.post('/generate/:roomId', authMiddleware, requireAdmin, QRController.generateQRCode);

// 2. Baixar QR Code de uma sala
router.get('/download/:roomId', authMiddleware, requireAdmin, QRController.downloadQRCode);

// 3. Gerar QR Code para funcionário
router.post('/generate-user/:userId', authMiddleware, requireAdmin, QRController.generateUserQRCode);

// 4. Baixar QR Code de funcionário
router.get('/download-user/:userId', authMiddleware, requireAdmin, QRController.downloadUserQRCode);

// 5. Gerar QR Codes em lote
router.post('/generate-batch', authMiddleware, requireAdmin, QRController.generateBatchQRCodes);

// 6. Gerar QR Codes faltantes
router.post('/generate-missing', authMiddleware, requireAdmin, QRController.generateMissingQRCodes);

// 7. Relatório de QR Codes
router.get('/report', authMiddleware, requireAdmin, QRController.generateQRReport);

// ✅ Teste de saúde da rota
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'QR Code Routes estão funcionando',
    timestamp: new Date().toISOString(),
    endpoints: [
      'POST /api/qr/validate',
      'POST /api/qr/generate/:roomId',
      'GET /api/qr/download/:roomId',
      'POST /api/qr/generate-batch',
      'POST /api/qr/generate-missing',
      'GET /api/qr/report'
    ]
  });
});

module.exports = router;