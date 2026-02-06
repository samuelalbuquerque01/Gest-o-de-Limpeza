// src/routes/roomRoutes.js
const express = require("express");
const router = express.Router();

const roomController = require("../controllers/roomController");
const authMiddleware = require("../middleware/authMiddleware");

function requireAdmin(req, res, next) {
  if (req.user?.role !== "ADMIN") {
    return res.status(403).json({ success: false, message: "Acesso negado" });
  }
  next();
}

// ✅ ROTA PÚBLICA: Escanear QR Code (qualquer um pode escanear)
router.get("/qr/:qrCode", roomController.scanQRCode);

// ✅ ROTA ADMIN: Gerar novo QR Code para uma sala
router.post("/:id/generate-qr", authMiddleware, requireAdmin, roomController.generateNewQRCode);

// ✅ ROTA ADMIN: Verificar status do QR Code
router.get("/:id/qr-status", authMiddleware, requireAdmin, roomController.getRoomQRStatus);

// ✅ ROTA ADMIN: Gerar QR Codes para todas as salas
router.post("/generate-all-qr", authMiddleware, requireAdmin, roomController.generateAllQRCodes);

// ✅ WORKER/PUBLIC: ambientes disponíveis
router.get("/available", roomController.getAvailableRooms);

// ✅ ADMIN: stats (TEM QUE VIR ANTES DO "/:id")
router.get("/stats", authMiddleware, requireAdmin, roomController.getRoomStats);

// ✅ PUBLIC (worker e admin): pegar por id
router.get("/:id", roomController.getRoomById);

// ✅ ADMIN: listar + CRUD
router.get("/", authMiddleware, requireAdmin, roomController.getRooms);
router.post("/", authMiddleware, requireAdmin, roomController.createRoom);
router.put("/:id", authMiddleware, requireAdmin, roomController.updateRoom);
router.delete("/:id", authMiddleware, requireAdmin, roomController.deleteRoom);

module.exports = router;