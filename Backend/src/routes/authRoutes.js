// Backend/src/routes/authRoutes.js
const express = require('express');
const router = express.Router();

const authController = require('../controllers/authController');

// Admin login
router.post('/login', authController.loginAdmin);

// Worker login
router.post('/worker/login', authController.loginWorker);

// Check auth (opcional: usado pelo front pra manter logado)
router.get('/me', authController.me);

module.exports = router;
