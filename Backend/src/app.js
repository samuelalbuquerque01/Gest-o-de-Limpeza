// Backend/src/app.js
const express = require('express');
const cors = require('cors');
const path = require('path');
const QRCode = require('qrcode');

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
    console.error(`âŒ ERRO: ${name} NÃƒO Ã© middleware/Router vÃ¡lido.`);
    console.error(`   Tipo recebido: ${typeof maybeRouter}`);
    console.error(
      `   Dica: confira module.exports em ${name}.js (tem que ser "module.exports = router")`
    );
    throw new Error(`${name} invÃ¡lido (nÃ£o Ã© funÃ§Ã£o)`);
  }
  app.use(basePath, maybeRouter);
  console.log(`âœ… Rotas carregadas: ${basePath} (${name})`);
}

// =======================
// Middlewares bÃ¡sicos
// =======================
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

// =======================
// CORS (Render-proof)
// - libera localhost (dev)
// - libera seu domÃ­nio do Render
// - libera qualquer *.onrender.com (se trocar subdomÃ­nio depois)
// - nÃ£o joga erro 500 (retorna cb(null, false) em vez de throw)
// =======================
const allowedOrigins = new Set([
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:5173',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3001',
  'http://127.0.0.1:5173',

  // âœ… seu domÃ­nio atual
  'https://gest-o-de-limpeza.onrender.com',
]);

app.use(
  cors({
    origin(origin, cb) {
      // postman/curl/same-origin podem nÃ£o mandar Origin
      if (!origin) return cb(null, true);

      const normalized = origin.endsWith('/') ? origin.slice(0, -1) : origin;

      // âœ… libera seu domÃ­nio
      if (allowedOrigins.has(normalized)) return cb(null, true);

      // âœ… libera qualquer subdomÃ­nio Render
      if (normalized.endsWith('.onrender.com')) return cb(null, true);

      console.log('âŒ CORS bloqueou origin:', origin);

      // âœ… NÃƒO estoura 500
      return cb(null, false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Preflight
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

// âœ… Teste de QR Code
app.get('/api/qr-test', (req, res) => {
  res.json({
    success: true,
    message: 'Sistema de QR Code estÃ¡ funcionando',
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
// âœ… ROTAS DE REDIRECIONAMENTO QR CODE (ADICIONADAS)
// =======================

// âœ… Rota de redirecionamento para QR Code
app.get('/qr/redirect', async (req, res) => {
  try {
    const { code, roomId } = req.query;
    
    if (!code && !roomId) {
      return res.status(400).send('CÃ³digo QR ou ID da sala Ã© obrigatÃ³rio');
    }

    // Redirecionar para a pÃ¡gina de escaneamento do frontend
    const frontendURL = process.env.FRONTEND_URL || 'http://localhost:3000';
    
    if (code) {
      // Se tem cÃ³digo, redireciona para /scan com o cÃ³digo
      return res.redirect(`${frontendURL}/scan?qr=${encodeURIComponent(code)}`);
    } else if (roomId) {
      // Se tem roomId, busca o QR Code primeiro
      const prisma = require('./utils/database');
      const room = await prisma.room.findUnique({
        where: { id: roomId },
        select: { qrCode: true }
      });
      
      if (room && room.qrCode) {
        return res.redirect(`${frontendURL}/scan?qr=${encodeURIComponent(room.qrCode)}`);
      } else {
        return res.redirect(`${frontendURL}/scan?roomId=${roomId}`);
      }
    }
  } catch (error) {
    console.error('Erro no redirecionamento:', error);
    res.redirect('/');
  }
});

// âœ… Rota para QR Code simples (apenas dados)
app.get('/qr/code/:code', async (req, res) => {
  try {
    const { code } = req.params;
    
    if (!code) {
      return res.status(400).json({ error: 'CÃ³digo QR Ã© obrigatÃ³rio' });
    }

    const prisma = require('./utils/database');
    const room = await prisma.room.findFirst({
      where: { qrCode: code },
      select: {
        id: true,
        name: true,
        type: true,
        location: true,
        status: true,
        qrCode: true
      }
    });

    if (!room) {
      return res.status(404).json({ error: 'Sala nÃ£o encontrada' });
    }

    // Retorna dados simples
    const baseURL = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
    const qrData = {
      roomId: room.id,
      roomName: room.name,
      type: room.type,
      location: room.location,
      qrCode: room.qrCode,
      url: `${baseURL}/scan?qr=${encodeURIComponent(code)}&roomId=${room.id}`,
      timestamp: Date.now()
    };

    res.json(qrData);
  } catch (error) {
    console.error('Erro ao buscar QR Code:', error);
    res.status(500).json({ error: 'Erro interno' });
  }
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

// âœ… Alias legado (front antigo usa /api/cleaners)
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
    return res.status(500).json({ success: false, message: 'Erro ao listar funcionÃ¡rios' });
  }
});

// âœ… Rota para imprimir QR Code (pÃºblica)
app.get('/api/print-qr/:roomId', async (req, res) => {
  try {
    const { roomId } = req.params;
    const prisma = require('./utils/database');

    const room = await prisma.room.findUnique({
      where: { id: roomId },
      select: { id: true, name: true, type: true, location: true, qrCode: true },
    });

    if (!room) return res.status(404).send('Sala nÃ£o encontrada');

    // Base URL para o QR Code
    const baseURL = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
    const qrURL = `${baseURL}/scan?qr=${encodeURIComponent(room.qrCode || '')}&roomId=${roomId}`;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>QR Code - ${room.name}</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              padding: 20px; 
              text-align: center; 
              max-width: 600px; 
              margin: 0 auto; 
              background: white;
            }
            .qr-container { 
              border: 2px solid #1976d2; 
              padding: 30px; 
              border-radius: 10px; 
              margin: 20px 0; 
              background: white; 
              box-shadow: 0 4px 12px rgba(0,0,0,0.1);
            }
            .room-name { 
              font-size: 24px; 
              font-weight: bold; 
              color: #1976d2; 
              margin-bottom: 10px; 
              text-transform: uppercase;
            }
            .room-info { 
              color: #666; 
              margin-bottom: 20px; 
              font-size: 16px;
            }
            .qr-code-container {
              margin: 25px 0;
              padding: 15px;
              border: 1px solid #ddd;
              border-radius: 8px;
              background: #fafafa;
              display: inline-block;
            }
            .qr-code { 
              font-family: monospace; 
              font-size: 14px; 
              background: #f5f5f5; 
              padding: 10px; 
              border-radius: 5px; 
              word-break: break-all; 
              margin: 20px 0; 
            }
            .qr-url {
              font-size: 12px;
              color: #1976d2;
              margin: 10px 0;
              word-break: break-all;
              font-family: monospace;
            }
            .instructions { 
              font-size: 14px; 
              color: #666; 
              margin-top: 25px; 
              border-top: 1px solid #eee; 
              padding-top: 15px;
              line-height: 1.6;
            }
            .footer {
              margin-top: 20px;
              font-size: 12px;
              color: #999;
              border-top: 1px solid #eee;
              padding-top: 10px;
            }
            @media print { 
              body { padding: 0; } 
              .no-print { display: none; }
              .qr-container { border: none; box-shadow: none; }
            }
          </style>
          <script src="https://cdn.jsdelivr.net/npm/qrcode@1.5.3/build/qrcode.min.js"></script>
        </head>
        <body>
          <div class="qr-container">
            <div style="margin-bottom: 20px;">
              <div style="font-size: 14px; color: #666; margin-bottom: 5px;">NEUROPSICOCENTRO</div>
              <div style="font-size: 16px; font-weight: bold; color: #1976d2;">SISTEMA DE GESTÃƒO DE LIMPEZA</div>
            </div>
            
            <div class="room-name">${room.name}</div>
            <div class="room-info">${room.type} â€¢ ${room.location}</div>
            
            <div class="qr-code-container">
              <div id="qrcode"></div>
            </div>
            
            <div class="qr-code">${room.qrCode || 'QR CODE NÃƒO GERADO'}</div>
            
            <div class="qr-url">
              <strong>URL:</strong> ${qrURL}
            </div>
            
            <div class="instructions">
              <strong>INSTRUÃ‡Ã•ES:</strong><br>
              1. Cole este QR Code na porta da sala<br>
              2. FuncionÃ¡rios escaneiam com o celular<br>
              3. A aplicaÃ§Ã£o abre automaticamente<br>
              4. Inicie a limpeza diretamente pelo sistema
            </div>
            
            <div class="footer">
              Gerado em: ${new Date().toLocaleDateString('pt-BR')}<br>
              Sistema Neuropsicocentro â€¢ ID: ${room.id}
            </div>
          </div>
          
          <div class="no-print" style="margin-top: 30px;">
            <button onclick="window.print()" style="
              padding: 12px 24px;
              background: #1976d2;
              color: white;
              border: none;
              border-radius: 5px;
              font-size: 16px;
              cursor: pointer;
              margin: 10px;
            ">
              ðŸ–¨ï¸ Imprimir QR Code
            </button>
            <button onclick="window.close()" style="
              padding: 12px 24px;
              background: #757575;
              color: white;
              border: none;
              border-radius: 5px;
              font-size: 16px;
              cursor: pointer;
              margin: 10px;
            ">
              âŒ Fechar
            </button>
          </div>
          
          <script>
            // Gerar QR Code com URL
            const qrURL = "${qrURL}";
            
            QRCode.toCanvas(document.getElementById('qrcode'), qrURL, {
              width: 250,
              height: 250,
              margin: 1,
              color: {
                dark: '#1976d2',
                light: '#ffffff'
              }
            }, function(error) {
              if (error) {
                console.error('Erro ao gerar QR Code:', error);
                document.getElementById('qrcode').innerHTML = 
                  '<div style="color:red; padding:20px;">Erro ao gerar QR Code</div>';
              }
            });
            
            // Auto-print apÃ³s 1 segundo (opcional)
            setTimeout(() => {
              if (window.location.search.includes('autoprint')) {
                window.print();
              }
            }, 1000);
          </script>
        </body>
      </html>
    `;

    res.send(html);
  } catch (error) {
    console.error('Erro ao gerar pÃ¡gina de impressÃ£o:', error);
    res.status(500).send('Erro ao gerar pÃ¡gina de impressÃ£o');
  }
});

// âœ… Rota para gerar QR Code para impressÃ£o (melhor formataÃ§Ã£o)
app.get('/api/qr/print/:roomId', async (req, res) => {
  try {
    const { roomId } = req.params;
    const prisma = require('./utils/database');

    const room = await prisma.room.findUnique({
      where: { id: roomId },
      select: { id: true, name: true, qrCode: true },
    });

    if (!room) return res.status(404).send('Sala não encontrada');

    const frontendURL = process.env.FRONTEND_URL || `${req.protocol}://${req.get('host')}`;
    const qrCode = room.qrCode || `ROOM-${room.id}`;
    const qrURL = `${frontendURL}/scan?roomId=${room.id}&qr=${encodeURIComponent(qrCode)}`;

    const qrImage = await QRCode.toDataURL(qrURL, {
      errorCorrectionLevel: 'H',
      margin: 1,
      width: 360,
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
    });

    const html = `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Impressão QR - ${room.name}</title>
        <style>
          body {
            margin: 0;
            font-family: Arial, sans-serif;
            color: #111;
            background: #fff;
            min-height: 100vh;
            display: flex;
            justify-content: flex-start;
            align-items: center;
            flex-direction: column;
            padding: 32px 16px;
          }
          .title {
            text-align: center;
            font-size: 28px;
            font-weight: 700;
            letter-spacing: 0.6px;
          }
          .subtitle {
            text-align: center;
            font-size: 22px;
            font-weight: 700;
            margin-top: 4px;
          }
          .room-name {
            margin-top: 36px;
            margin-bottom: 24px;
            font-size: 34px;
            font-weight: 800;
            text-transform: uppercase;
            text-align: center;
          }
          .qr-wrapper {
            text-align: center;
          }
          .qr-image {
            width: 360px;
            height: 360px;
            display: block;
          }
          .actions {
            margin-top: 24px;
            display: flex;
            gap: 10px;
          }
          .btn {
            border: 0;
            padding: 10px 18px;
            border-radius: 6px;
            font-size: 14px;
            cursor: pointer;
          }
          .btn-print {
            background: #111;
            color: #fff;
          }
          .btn-close {
            background: #e5e7eb;
            color: #111;
          }
          @media print {
            .no-print {
              display: none;
            }
          }
        </style>
      </head>
      <body>
        <div class="title">NEUROPSICOCENTRO</div>
        <div class="subtitle">SISTEMA DE GESTÃO DE LIMPEZA</div>
        <div class="room-name">${room.name}</div>
        <div class="qr-wrapper">
          <img class="qr-image" src="${qrImage}" alt="QR Code - ${room.name}" />
        </div>
        <div class="actions no-print">
          <button class="btn btn-print" onclick="window.print()">Imprimir</button>
          <button class="btn btn-close" onclick="window.close()">Fechar</button>
        </div>
      </body>
      </html>
    `;

    res.send(html);
  } catch (error) {
    console.error('Erro ao gerar QR Code para impressão:', error);
    res.status(500).send('Erro ao gerar QR Code para impressão');
  }
});

// =======================
// âœ… SERVIR FRONTEND (React build)
// =======================
const frontBuildPath = path.join(__dirname, '../../Front/build');
app.use(express.static(frontBuildPath));

// SPA fallback: qualquer rota que NÃƒO for /api vai para o index do React
app.get(/^\/(?!api).*/, (req, res) => {
  res.sendFile(path.join(frontBuildPath, 'index.html'));
});

// =======================
// 404 (somente API)
// =======================
app.use('/api', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Rota nÃ£o encontrada: ${req.method} ${req.originalUrl}`,
    availableRoutes: [
      '/api/auth/login',
      '/api/auth/worker/login',
      '/api/rooms',
      '/api/rooms/qr/:qrCode',
      '/api/cleaning',
      '/api/qr/generate/:roomId',
      '/api/qr/validate',
      '/api/qr/print/:roomId',
      '/api/print-qr/:roomId',
      '/qr/redirect',
      '/qr/code/:code',
      '/api/health',
    ],
  });
});

// Erros
app.use(errorMiddleware);

module.exports = app;
