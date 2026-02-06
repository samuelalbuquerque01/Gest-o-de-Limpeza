// Backend/src/app.js
const express = require('express');
const cors = require('cors');
const path = require('path');

const config = require('../config');

// Middlewares
const errorMiddleware = require('./middleware/errorMiddleware');

// Rotas
const authRoutes = require('./routes/authRoutes');
const roomRoutes = require('./routes/roomRoutes');
const cleaningRoutes = require('./routes/cleaningRoutes');
const reportRoutes = require('./routes/reportRoutes');
const userRoutes = require('./routes/userRoutes');
const qrRoutes = require('./routes/qrRoutes');

const app = express();

// =======================
// Helpers
// =======================
function safeUse(basePath, maybeRouter, name) {
  const isFn = typeof maybeRouter === 'function';
  if (!isFn) {
    console.error(`❌ ERRO: ${name} NÃO é middleware/Router válido.`);
    console.error(`   Tipo recebido: ${typeof maybeRouter}`);
    console.error(`   Dica: confira module.exports em ${name}.js (tem que ser "module.exports = router")`);
    throw new Error(`${name} inválido (não é função)`);
  }
  app.use(basePath, maybeRouter);
  console.log(`✅ Rotas carregadas: ${basePath} (${name})`);
}

// =======================
// Middlewares básicos
// =======================
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

// =======================
// CORS
// - Em produção (tudo junto), o front chama /api na mesma origem => CORS nem é necessário.
// - Em dev, libera localhost.
// =======================
const allowedOrigins = new Set([
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:5173',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3001',
  'http://127.0.0.1:5173',
]);

app.use(
  cors({
    origin(origin, cb) {
      // same-origin ou ferramentas (curl/postman) geralmente não mandam Origin
      if (!origin) return cb(null, true);

      const normalized = origin.endsWith('/') ? origin.slice(0, -1) : origin;
      if (allowedOrigins.has(normalized)) return cb(null, true);

      // Em produção (tudo junto), se vier origin diferente, bloqueia mesmo.
      console.log('❌ CORS bloqueou origin:', origin);
      return cb(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

app.options('*', cors());

// =======================
// Health
// =======================
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    status: 'ok',
    env: config.nodeEnv || process.env.NODE_ENV,
    time: new Date().toISOString(),
    services: {
      auth: 'active',
      rooms: 'active',
      cleaning: 'active',
      reports: 'active',
      users: 'active',
      qr: 'active',
    },
  });
});

// ✅ Teste de QR Code
app.get('/api/qr-test', (req, res) => {
  res.json({
    success: true,
    message: 'Sistema de QR Code está funcionando',
    endpoints: {
      scanQR: 'GET /api/rooms/qr/:qrCode',
      generateQR: 'POST /api/qr/generate/:roomId',
      generateBatch: 'POST /api/qr/generate-batch',
      validateQR: 'POST /api/qr/validate',
      downloadQR: 'GET /api/qr/download/:roomId',
      roomQR: 'POST /api/rooms/:id/generate-qr',
    },
    timestamp: new Date().toISOString(),
  });
});

// =======================
// Rotas API
// =======================
safeUse('/api/auth', authRoutes, 'authRoutes');
safeUse('/api/rooms', roomRoutes, 'roomRoutes');
safeUse('/api/cleaning', cleaningRoutes, 'cleaningRoutes');
safeUse('/api/reports', reportRoutes, 'reportRoutes');
safeUse('/api/users', userRoutes, 'userRoutes');
safeUse('/api/qr', qrRoutes, 'qrRoutes');

// ✅ Alias legado (front antigo usa /api/cleaners)
app.get('/api/cleaners', async (req, res) => {
  try {
    const prisma = require('./utils/database');
    const list = await prisma.user.findMany({
      where: { role: 'CLEANER' },
      orderBy: [{ name: 'asc' }],
      select: { id: true, name: true, email: true, role: true, status: true },
    });

    return res.json({
      success: true,
      cleaners: list,
      workers: list,
    });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Erro ao listar funcionários' });
  }
});

// ✅ Rota para imprimir QR Code (pública)
app.get('/api/print-qr/:roomId', async (req, res) => {
  try {
    const { roomId } = req.params;
    const prisma = require('./utils/database');

    const room = await prisma.room.findUnique({
      where: { id: roomId },
      select: {
        id: true,
        name: true,
        type: true,
        location: true,
        qrCode: true,
      },
    });

    if (!room) return res.status(404).send('Sala não encontrada');

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>QR Code - ${room.name}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; text-align: center; max-width: 600px; margin: 0 auto; }
            .qr-container { border: 2px solid #1976d2; padding: 20px; border-radius: 10px; margin: 20px 0; background: white; }
            .room-name { font-size: 24px; font-weight: bold; color: #1976d2; margin-bottom: 10px; }
            .room-info { color: #666; margin-bottom: 20px; }
            .qr-code { font-family: monospace; font-size: 18px; background: #f5f5f5; padding: 10px; border-radius: 5px; word-break: break-all; margin: 20px 0; }
            .instructions { font-size: 14px; color: #888; margin-top: 20px; border-top: 1px solid #eee; padding-top: 10px; }
            @media print { body { padding: 0; } .no-print { display: none; } }
          </style>
        </head>
        <body>
          <div class="qr-container">
            <div class="room-name">${room.name}</div>
            <div class="room-info">${room.type} • ${room.location}</div>
            <div class="qr-code">${room.qrCode || 'QR CODE NÃO GERADO'}</div>
            <div class="instructions">
              Escaneie este código com o aplicativo para iniciar a limpeza<br>
              Sistema Neuropsicocentro • Gerado em ${new Date().toLocaleDateString('pt-BR')}
            </div>
          </div>
          <div class="no-print" style="margin-top: 20px;">
            <button onclick="window.print()" style="padding: 10px 20px; background: #1976d2; color: white; border: none; border-radius: 5px; cursor: pointer;">
              Imprimir QR Code
            </button>
          </div>
          <script>
            window.onload = function() { setTimeout(() => window.print(), 1000); };
          </script>
        </body>
      </html>
    `;
    res.send(html);
  } catch (error) {
    res.status(500).send('Erro ao gerar página de impressão');
  }
});

// =======================
// ✅ SERVIR FRONTEND (React build)
// Coloque isso ANTES do 404 da API.
// =======================
const frontBuildPath = path.join(__dirname, '../../Front/build');
app.use(express.static(frontBuildPath));

// SPA fallback: qualquer rota que NÃO for /api vai para o index do React
app.get(/^\/(?!api).*/, (req, res) => {
  res.sendFile(path.join(frontBuildPath, 'index.html'));
});

// =======================
// 404 (somente API)
// =======================
app.use('/api', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Rota não encontrada: ${req.method} ${req.originalUrl}`,
    availableRoutes: [
      '/api/auth/login',
      '/api/auth/worker/login',
      '/api/rooms',
      '/api/rooms/qr/:qrCode',
      '/api/cleaning',
      '/api/qr/generate/:roomId',
      '/api/qr/validate',
      '/api/health',
    ],
  });
});

// Erros
app.use(errorMiddleware);

module.exports = app;
