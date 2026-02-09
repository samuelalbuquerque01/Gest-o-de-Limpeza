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
    console.error(
      `   Dica: confira module.exports em ${name}.js (tem que ser "module.exports = router")`
    );
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
// CORS (Render-proof)
// - libera localhost (dev)
// - libera seu domínio do Render
// - libera qualquer *.onrender.com (se trocar subdomínio depois)
// - não joga erro 500 (retorna cb(null, false) em vez de throw)
// =======================
const allowedOrigins = new Set([
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:5173',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3001',
  'http://127.0.0.1:5173',

  // ✅ seu domínio atual
  'https://gest-o-de-limpeza.onrender.com',
]);

app.use(
  cors({
    origin(origin, cb) {
      // postman/curl/same-origin podem não mandar Origin
      if (!origin) return cb(null, true);

      const normalized = origin.endsWith('/') ? origin.slice(0, -1) : origin;

      // ✅ libera seu domínio
      if (allowedOrigins.has(normalized)) return cb(null, true);

      // ✅ libera qualquer subdomínio Render
      if (normalized.endsWith('.onrender.com')) return cb(null, true);

      console.log('❌ CORS bloqueou origin:', origin);

      // ✅ NÃO estoura 500
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
// ✅ ROTAS DE REDIRECIONAMENTO QR CODE (ADICIONADAS)
// =======================

// ✅ Rota de redirecionamento para QR Code
app.get('/qr/redirect', async (req, res) => {
  try {
    const { code, roomId } = req.query;
    
    if (!code && !roomId) {
      return res.status(400).send('Código QR ou ID da sala é obrigatório');
    }

    // Redirecionar para a página de escaneamento do frontend
    const frontendURL = process.env.FRONTEND_URL || 'http://localhost:3000';
    
    if (code) {
      // Se tem código, redireciona para /scan com o código
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

// ✅ Rota para QR Code simples (apenas dados)
app.get('/qr/code/:code', async (req, res) => {
  try {
    const { code } = req.params;
    
    if (!code) {
      return res.status(400).json({ error: 'Código QR é obrigatório' });
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
      return res.status(404).json({ error: 'Sala não encontrada' });
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
      select: { id: true, name: true, type: true, location: true, qrCode: true },
    });

    if (!room) return res.status(404).send('Sala não encontrada');

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
              <div style="font-size: 16px; font-weight: bold; color: #1976d2;">SISTEMA DE GESTÃO DE LIMPEZA</div>
            </div>
            
            <div class="room-name">${room.name}</div>
            <div class="room-info">${room.type} • ${room.location}</div>
            
            <div class="qr-code-container">
              <div id="qrcode"></div>
            </div>
            
            <div class="qr-code">${room.qrCode || 'QR CODE NÃO GERADO'}</div>
            
            <div class="qr-url">
              <strong>URL:</strong> ${qrURL}
            </div>
            
            <div class="instructions">
              <strong>INSTRUÇÕES:</strong><br>
              1. Cole este QR Code na porta da sala<br>
              2. Funcionários escaneiam com o celular<br>
              3. A aplicação abre automaticamente<br>
              4. Inicie a limpeza diretamente pelo sistema
            </div>
            
            <div class="footer">
              Gerado em: ${new Date().toLocaleDateString('pt-BR')}<br>
              Sistema Neuropsicocentro • ID: ${room.id}
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
              🖨️ Imprimir QR Code
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
              ❌ Fechar
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
            
            // Auto-print após 1 segundo (opcional)
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
    console.error('Erro ao gerar página de impressão:', error);
    res.status(500).send('Erro ao gerar página de impressão');
  }
});

// ✅ Rota para gerar QR Code para impressão (melhor formatação)
app.get('/api/qr/print/:roomId', async (req, res) => {
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
        status: true,
        priority: true,
        lastCleaned: true
      },
    });

    if (!room) return res.status(404).send('Sala não encontrada');

    // Base URL para o QR Code
    const baseURL = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
    const qrURL = `${baseURL}/scan?qr=${encodeURIComponent(room.qrCode || '')}&roomId=${roomId}`;

    const html = `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>QR Code - ${room.name}</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          body {
            font-family: 'Segoe UI', Arial, sans-serif;
            background: #f8f9fa;
            color: #333;
            line-height: 1.6;
            padding: 20px;
            min-height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
          }
          
          .print-page {
            width: 210mm;
            min-height: 297mm;
            background: white;
            border-radius: 12px;
            box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);
            padding: 40px;
            position: relative;
          }
          
          .header {
            text-align: center;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 2px solid #eaeaea;
          }
          
          .clinic-title {
            font-size: 14px;
            color: #666;
            letter-spacing: 1px;
            margin-bottom: 5px;
            text-transform: uppercase;
          }
          
          .system-title {
            font-size: 20px;
            font-weight: 800;
            color: #1976d2;
            margin-bottom: 10px;
            letter-spacing: 0.5px;
          }
          
          .room-header {
            text-align: center;
            margin: 30px 0;
          }
          
          .room-name {
            font-size: 32px;
            font-weight: 900;
            color: #1565c0;
            margin-bottom: 10px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          
          .room-details {
            display: flex;
            justify-content: center;
            gap: 20px;
            margin-bottom: 30px;
            flex-wrap: wrap;
          }
          
          .detail-item {
            background: #f0f7ff;
            padding: 8px 20px;
            border-radius: 25px;
            font-size: 14px;
            font-weight: 600;
            color: #1976d2;
            border: 1px solid #d1e3ff;
            display: flex;
            align-items: center;
            gap: 6px;
          }
          
          .detail-item .badge {
            background: #1976d2;
            color: white;
            padding: 2px 8px;
            border-radius: 12px;
            font-size: 11px;
            font-weight: 700;
          }
          
          .qr-section {
            text-align: center;
            margin: 40px 0;
            padding: 30px;
            background: #f8fafc;
            border-radius: 10px;
            border: 1px solid #e2e8f0;
          }
          
          .qr-container {
            display: inline-block;
            padding: 20px;
            background: white;
            border-radius: 10px;
            border: 2px solid #e2e8f0;
            margin-bottom: 20px;
          }
          
          .qr-code-text {
            font-family: 'Courier New', monospace;
            font-size: 13px;
            color: #2d3748;
            background: #edf2f7;
            padding: 12px;
            border-radius: 6px;
            margin: 20px auto;
            max-width: 80%;
            word-break: break-all;
            text-align: center;
            border: 1px solid #cbd5e0;
          }
          
          .qr-url {
            font-size: 12px;
            color: #1976d2;
            background: #ebf8ff;
            padding: 10px 15px;
            border-radius: 6px;
            margin: 15px auto;
            max-width: 90%;
            word-break: break-all;
            border: 1px dashed #90cdf4;
          }
          
          .instructions {
            margin-top: 40px;
            padding: 25px;
            background: #f7fafc;
            border-radius: 8px;
            border-left: 4px solid #1976d2;
          }
          
          .instructions h3 {
            color: #1976d2;
            margin-bottom: 15px;
            font-size: 18px;
          }
          
          .instructions ol {
            margin-left: 20px;
            color: #4a5568;
          }
          
          .instructions li {
            margin-bottom: 8px;
            font-size: 14px;
          }
          
          .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #eaeaea;
            text-align: center;
            color: #718096;
            font-size: 12px;
          }
          
          .footer strong {
            color: #2d3748;
          }
          
          .status-badge {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 700;
            margin-left: 10px;
          }
          
          .status-PENDING { background: #fff3cd; color: #856404; }
          .status-COMPLETED { background: #d4edda; color: #155724; }
          .status-IN_PROGRESS { background: #cce5ff; color: #004085; }
          .status-NEEDS_ATTENTION { background: #f8d7da; color: #721c24; }
          
          .priority-badge {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 700;
            margin-left: 10px;
          }
          
          .priority-HIGH { background: #f8d7da; color: #721c24; }
          .priority-MEDIUM { background: #fff3cd; color: #856404; }
          .priority-LOW { background: #d4edda; color: #155724; }
          
          .last-cleaned {
            background: #e8f5e9;
            padding: 8px 15px;
            border-radius: 6px;
            font-size: 13px;
            color: #2e7d32;
            display: inline-flex;
            align-items: center;
            gap: 6px;
            margin-top: 10px;
          }
          
          @media print {
            body {
              background: white;
              padding: 0;
            }
            .print-page {
              width: 100%;
              min-height: 100vh;
              box-shadow: none;
              border-radius: 0;
              padding: 20px;
            }
            .no-print {
              display: none !important;
            }
            .qr-container {
              border: 1px solid #ccc;
            }
          }
        </style>
        <script src="https://cdn.jsdelivr.net/npm/qrcode@1.5.3/build/qrcode.min.js"></script>
      </head>
      <body>
        <div class="print-page">
          <div class="header">
            <div class="clinic-title">NEUROPSICOCENTRO</div>
            <div class="system-title">SISTEMA DE GESTÃO DE LIMPEZA</div>
          </div>
          
          <div class="room-header">
            <h1 class="room-name">${room.name}</h1>
          </div>
          
          <div class="room-details">
            <div class="detail-item">
              <span>Tipo:</span>
              <span class="badge">${room.type}</span>
            </div>
            <div class="detail-item">
              <span>Localização:</span>
              <span class="badge">${room.location}</span>
            </div>
            <div class="detail-item">
              <span>Status:</span>
              <span class="status-badge status-${room.status}">${room.status}</span>
            </div>
            <div class="detail-item">
              <span>Prioridade:</span>
              <span class="priority-badge priority-${room.priority || 'MEDIUM'}">${room.priority || 'MEDIUM'}</span>
            </div>
          </div>
          
          ${room.lastCleaned ? `
            <div style="text-align: center; margin-bottom: 20px;">
              <div class="last-cleaned">
                <span>📅 Última limpeza:</span>
                <strong>${new Date(room.lastCleaned).toLocaleDateString('pt-BR')}</strong>
              </div>
            </div>
          ` : ''}
          
          <div class="qr-section">
            <div class="qr-container">
              <div id="qrcode"></div>
            </div>
            
            <div class="qr-code-text">
              ${room.qrCode || 'QR CODE NÃO GERADO'}
            </div>
            
            <div class="qr-url">
              <strong>URL do QR Code:</strong><br>
              ${qrURL}
            </div>
          </div>
          
          <div class="instructions">
            <h3>📋 INSTRUÇÕES DE USO</h3>
            <ol>
              <li><strong>Fixação:</strong> Cole este QR Code em local visível na porta da sala</li>
              <li><strong>Escanemento:</strong> Funcionários escaneiam com a câmera do celular</li>
              <li><strong>Acesso:</strong> A aplicação abre automaticamente no navegador</li>
              <li><strong>Ação:</strong> Inicie a limpeza diretamente pelo sistema</li>
              <li><strong>Registro:</strong> O sistema registra automaticamente data e responsável</li>
            </ol>
          </div>
          
          <div class="footer">
            <div><strong>ID da Sala:</strong> ${room.id}</div>
            <div><strong>Gerado em:</strong> ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}</div>
            <div>Sistema Neuropsicocentro • Versão 1.0 • Documento de trabalho</div>
          </div>
        </div>
        
        <div class="no-print" style="
          position: fixed;
          bottom: 20px;
          left: 50%;
          transform: translateX(-50%);
          background: white;
          padding: 15px 30px;
          border-radius: 10px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.2);
          display: flex;
          gap: 15px;
          z-index: 1000;
        ">
          <button onclick="window.print()" style="
            padding: 12px 24px;
            background: #1976d2;
            color: white;
            border: none;
            border-radius: 6px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 8px;
          ">
            🖨️ Imprimir QR Code
          </button>
          <button onclick="window.close()" style="
            padding: 12px 24px;
            background: #757575;
            color: white;
            border: none;
            border-radius: 6px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 8px;
          ">
            ❌ Fechar Janela
          </button>
        </div>
        
        <script>
          // Gerar QR Code com URL
          const qrURL = "${qrURL}";
          
          QRCode.toCanvas(document.getElementById('qrcode'), qrURL, {
            width: 280,
            height: 280,
            margin: 1,
            color: {
              dark: '#1976d2',
              light: '#ffffff'
            }
          }, function(error) {
            if (error) {
              console.error('Erro ao gerar QR Code:', error);
              document.getElementById('qrcode').innerHTML = 
                '<div style="color: #e53e3e; padding: 20px; background: #fed7d7; border-radius: 6px;">Erro ao gerar QR Code. Recarregue a página.</div>';
            }
          });
          
          // Auto-print opcional
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
    console.error('Erro ao gerar QR Code para impressão:', error);
    res.status(500).send('Erro ao gerar QR Code para impressão');
  }
});

// =======================
// ✅ SERVIR FRONTEND (React build)
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