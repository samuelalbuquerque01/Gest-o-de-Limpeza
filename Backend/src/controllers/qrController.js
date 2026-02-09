// src/controllers/qrController.js
const QRCode = require('qrcode');
const prisma = require('../utils/database');
const crypto = require('crypto');

class QRController {
  /**
   * ✅ GERAR QR CODE PARA SALA (COM URL)
   * POST /api/qr/generate/:roomId
   */
  static async generateQRCode(req, res) {
    try {
      const { roomId } = req.params;
      const { size = 300, format = 'png' } = req.body;

      console.log(`🔳 Gerando QR Code para sala: ${roomId}`);

      // Buscar sala
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
        }
      });

      if (!room) {
        return res.status(404).json({
          success: false,
          message: 'Sala não encontrada'
        });
      }

      // Se não tiver QR Code no banco, gerar um
      let qrCode = room.qrCode;
      if (!qrCode) {
        qrCode = this.generateUniqueQRCode(room);
        await prisma.room.update({
          where: { id: roomId },
          data: { qrCode }
        });
        console.log(`✅ QR Code gerado: ${qrCode}`);
      }

      // ✅ BASE URL - usar ambiente ou inferir da requisição
      let baseURL = process.env.APP_URL;
      if (!baseURL) {
        baseURL = `${req.protocol}://${req.get('host')}`;
      }
      
      // ✅ URL que será aberta no celular
      const appURL = `${baseURL}/scan?qr=${encodeURIComponent(qrCode)}&roomId=${roomId}`;
      
      // ✅ Dados para o QR Code (incluindo URLs)
      const qrData = {
        type: 'ROOM',
        roomId: room.id,
        roomName: room.name,
        roomType: room.type,
        location: room.location,
        qrCode: qrCode,
        status: room.status,
        timestamp: Date.now(),
        checksum: crypto
          .createHash('md5')
          .update(`${room.id}:${room.name}:${Date.now()}`)
          .digest('hex'),
        system: 'Neuropsicocentro Cleaning System',
        url: appURL // ✅ URL incluída aqui
      };

      // ✅ Conteúdo do QR Code - URL primeiro (para o celular abrir)
      const qrContent = `${appURL}\n\n--- DADOS DA SALA ---\n${JSON.stringify(qrData, null, 2)}`;

      // Gerar QR Code como imagem
      let qrImage;
      if (format === 'svg') {
        qrImage = await QRCode.toString(qrContent, {
          type: 'svg',
          margin: 2,
          width: parseInt(size),
          color: {
            dark: '#1976d2',
            light: '#ffffff'
          }
        });
      } else {
        qrImage = await QRCode.toDataURL(qrContent, {
          errorCorrectionLevel: 'H',
          margin: 2,
          width: parseInt(size),
          color: {
            dark: '#1976d2',
            light: '#ffffff'
          }
        });
      }

      console.log(`✅ QR Code com URL gerado para ${room.name}`);
      console.log(`🔗 URL para celular: ${appURL}`);

      return res.json({
        success: true,
        data: {
          room,
          qrCode: qrCode,
          qrImage: qrImage,
          qrData: qrData,
          urls: {
            app: appURL,
            print: `${baseURL}/api/print-qr/${roomId}`,
            redirect: `${baseURL}/qr/redirect?code=${encodeURIComponent(qrCode)}`
          },
          generatedAt: new Date().toISOString(),
          instructions: 'Escaneie no celular para abrir a aplicação'
        }
      });
    } catch (error) {
      console.error('🔥 Erro ao gerar QR Code:', error);
      return res.status(500).json({
        success: false,
        message: 'Erro ao gerar QR Code',
        error: error.message
      });
    }
  }

  /**
   * ✅ DOWNLOAD QR CODE
   * GET /api/qr/download/:roomId
   */
  static async downloadQRCode(req, res) {
    try {
      const { roomId } = req.params;
      const { format = 'png', size = 300 } = req.query;

      console.log(`⬇️ Baixando QR Code para sala: ${roomId}`);

      const room = await prisma.room.findUnique({
        where: { id: roomId },
        select: {
          id: true,
          name: true,
          type: true,
          location: true,
          qrCode: true
        }
      });

      if (!room) {
        return res.status(404).json({
          success: false,
          message: 'Sala não encontrada'
        });
      }

      // Usar QR Code existente ou gerar um
      let qrCode = room.qrCode;
      if (!qrCode) {
        qrCode = this.generateUniqueQRCode(room);
      }

      // Base URL
      const baseURL = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
      const appURL = `${baseURL}/scan?qr=${encodeURIComponent(qrCode)}&roomId=${roomId}`;

      // Conteúdo do QR Code
      const qrContent = appURL;

      const fileName = `QR-${room.name.replace(/\s+/g, '-')}-${room.id}`;

      if (format === 'svg') {
        const svg = await QRCode.toString(qrContent, {
          type: 'svg',
          margin: 2,
          width: parseInt(size),
          color: {
            dark: '#1976d2',
            light: '#ffffff'
          }
        });

        res.setHeader('Content-Type', 'image/svg+xml');
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}.svg"`);
        return res.send(svg);
      } else {
        const pngBuffer = await QRCode.toBuffer(qrContent, {
          errorCorrectionLevel: 'H',
          margin: 2,
          width: parseInt(size),
          color: {
            dark: '#1976d2',
            light: '#ffffff'
          }
        });

        res.setHeader('Content-Type', 'image/png');
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}.png"`);
        return res.send(pngBuffer);
      }
    } catch (error) {
      console.error('🔥 Erro ao baixar QR Code:', error);
      return res.status(500).json({
        success: false,
        message: 'Erro ao baixar QR Code',
        error: error.message
      });
    }
  }

  /**
   * ✅ GERAR LOTE DE QR CODES
   * POST /api/qr/generate-batch
   */
  static async generateBatchQRCodes(req, res) {
    try {
      const { roomIds = [], size = 200, format = 'png' } = req.body;

      if (!Array.isArray(roomIds) || roomIds.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Lista de IDs de sala é obrigatória'
        });
      }

      console.log(`🔳 Gerando lote de QR Codes para ${roomIds.length} salas`);

      const rooms = await prisma.room.findMany({
        where: { id: { in: roomIds } },
        select: {
          id: true,
          name: true,
          type: true,
          location: true,
          qrCode: true
        }
      });

      const results = await Promise.all(
        rooms.map(async (room) => {
          try {
            let qrCode = room.qrCode;
            if (!qrCode) {
              qrCode = this.generateUniqueQRCode(room);
              await prisma.room.update({
                where: { id: room.id },
                data: { qrCode }
              });
            }

            // Base URL
            const baseURL = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
            const appURL = `${baseURL}/scan?qr=${encodeURIComponent(qrCode)}&roomId=${room.id}`;

            let qrImage;
            if (format === 'svg') {
              qrImage = await QRCode.toString(appURL, {
                type: 'svg',
                margin: 1,
                width: parseInt(size),
                color: {
                  dark: '#1976d2',
                  light: '#ffffff'
                }
              });
            } else {
              qrImage = await QRCode.toDataURL(appURL, {
                errorCorrectionLevel: 'H',
                margin: 1,
                width: parseInt(size),
                color: {
                  dark: '#1976d2',
                  light: '#ffffff'
                }
              });
            }

            return {
              success: true,
              room: {
                id: room.id,
                name: room.name,
                type: room.type,
                location: room.location
              },
              qrCode,
              qrImage,
              downloadUrl: `/api/qr/download/${room.id}?format=${format}&size=${size}`
            };
          } catch (error) {
            console.error(`🔥 Erro ao gerar QR para sala ${room.id}:`, error);
            return {
              success: false,
              room: {
                id: room.id,
                name: room.name
              },
              error: error.message
            };
          }
        })
      );

      const successCount = results.filter(r => r.success).length;
      const failedCount = results.filter(r => !r.success).length;

      console.log(`✅ Lote concluído: ${successCount} sucessos, ${failedCount} falhas`);

      return res.json({
        success: true,
        results,
        summary: {
          total: results.length,
          success: successCount,
          failed: failedCount,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('🔥 Erro ao gerar QR Codes em lote:', error);
      return res.status(500).json({
        success: false,
        message: 'Erro ao gerar QR Codes em lote',
        error: error.message
      });
    }
  }

  /**
   * ✅ GERAR QR CODE PARA FUNCIONÁRIO
   * POST /api/qr/generate-user/:userId
   */
  static async generateUserQRCode(req, res) {
    try {
      const { userId } = req.params;
      const { size = 300 } = req.body;

      console.log(`👤 Gerando QR Code para usuário: ${userId}`);

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          status: true
        }
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Usuário não encontrado'
        });
      }

      const baseURL = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
      const userURL = `${baseURL}/user/${userId}/profile`;

      const qrData = {
        type: 'USER',
        userId: user.id,
        userName: user.name,
        userEmail: user.email,
        userRole: user.role,
        userStatus: user.status,
        timestamp: Date.now(),
        url: userURL
      };

      const qrContent = userURL;

      const qrImage = await QRCode.toDataURL(qrContent, {
        errorCorrectionLevel: 'H',
        margin: 2,
        width: parseInt(size),
        color: {
          dark: '#4caf50',
          light: '#ffffff'
        }
      });

      console.log(`✅ QR Code de usuário gerado para ${user.name}`);

      return res.json({
        success: true,
        data: {
          user,
          qrImage,
          qrData,
          downloadUrl: `/api/qr/download-user/${userId}?size=${size}`,
          generatedAt: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('🔥 Erro ao gerar QR Code de usuário:', error);
      return res.status(500).json({
        success: false,
        message: 'Erro ao gerar QR Code de usuário',
        error: error.message
      });
    }
  }

  /**
   * ✅ DOWNLOAD QR CODE DE USUÁRIO
   * GET /api/qr/download-user/:userId
   */
  static async downloadUserQRCode(req, res) {
    try {
      const { userId } = req.params;
      const { size = 300 } = req.query;

      console.log(`⬇️ Baixando QR Code para usuário: ${userId}`);

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          email: true,
          role: true
        }
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Usuário não encontrado'
        });
      }

      const baseURL = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
      const userURL = `${baseURL}/user/${userId}/profile`;

      const qrContent = userURL;

      const fileName = `QR-USER-${user.name.replace(/\s+/g, '-')}-${user.id}`;

      const pngBuffer = await QRCode.toBuffer(qrContent, {
        errorCorrectionLevel: 'H',
        margin: 2,
        width: parseInt(size),
        color: {
          dark: '#4caf50',
          light: '#ffffff'
        }
      });

      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}.png"`);
      return res.send(pngBuffer);
    } catch (error) {
      console.error('🔥 Erro ao baixar QR Code de usuário:', error);
      return res.status(500).json({
        success: false,
        message: 'Erro ao baixar QR Code de usuário'
      });
    }
  }

  /**
   * ✅ VALIDAR QR CODE
   * POST /api/qr/validate
   */
  static async validateQRCode(req, res) {
    try {
      const { qrCode, qrData } = req.body;

      console.log(`🔍 Validando QR Code: ${qrCode ? qrCode.substring(0, 20) + '...' : 'dados fornecidos'}`);

      if (!qrCode && !qrData) {
        return res.status(400).json({
          success: false,
          message: 'QR Code ou dados são obrigatórios'
        });
      }

      let data;
      if (qrData) {
        try {
          data = typeof qrData === 'string' ? JSON.parse(qrData) : qrData;
        } catch (parseError) {
          return res.status(400).json({
            success: false,
            message: 'Dados do QR Code inválidos'
          });
        }
      } else {
        // Buscar sala pelo QR Code
        const room = await prisma.room.findFirst({
          where: { qrCode },
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
          return res.status(404).json({
            success: false,
            message: 'QR Code não encontrado no sistema'
          });
        }

        data = {
          type: 'ROOM',
          roomId: room.id,
          roomName: room.name,
          roomType: room.type,
          location: room.location,
          status: room.status,
          qrCode: room.qrCode,
          valid: true,
          message: 'QR Code válido para sala'
        };
      }

      // Verificar tipo de QR Code
      const isValidType = data.type === 'ROOM' || data.type === 'USER';
      const hasRequiredFields = data.type === 'ROOM' 
        ? (data.roomId && data.roomName) 
        : (data.userId && data.userName);

      return res.json({
        success: true,
        data,
        valid: isValidType && hasRequiredFields,
        message: isValidType && hasRequiredFields ? 'QR Code válido' : 'QR Code com formato inválido',
        validation: {
          type: data.type,
          timestamp: new Date().toISOString(),
          checks: {
            typeValid: isValidType,
            fieldsComplete: hasRequiredFields,
            systemMatch: data.system ? data.system.includes('Neuropsicocentro') : false
          }
        }
      });
    } catch (error) {
      console.error('🔥 Erro ao validar QR Code:', error);
      return res.status(500).json({
        success: false,
        message: 'Erro ao validar QR Code',
        error: error.message
      });
    }
  }

  /**
   * ✅ GERAR QR CODE ÚNICO
   * Método auxiliar
   */
  static generateUniqueQRCode(room) {
    const cleanName = room.name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9]/g, '-')
      .replace(/-+/g, '-')
      .toUpperCase()
      .slice(0, 30);

    const cleanType = room.type.toUpperCase().slice(0, 10);
    const cleanLocation = room.location
      .replace(/[^a-zA-Z0-9]/g, '-')
      .toUpperCase()
      .slice(0, 20);

    const random = crypto.randomBytes(4).toString('hex').toUpperCase();
    
    const qrCode = `QR-${cleanType}-${cleanName}-${cleanLocation}-${random}`
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 50);

    console.log(`🔑 QR Code gerado: ${qrCode}`);
    return qrCode;
  }

  /**
   * ✅ GERAR QR CODES PARA TODAS AS SALAS SEM QR
   * POST /api/qr/generate-missing
   */
  static async generateMissingQRCodes(req, res) {
    try {
      console.log('🔳 Gerando QR Codes para salas sem código');

      const roomsWithoutQR = await prisma.room.findMany({
        where: {
          OR: [
            { qrCode: null },
            { qrCode: '' }
          ]
        },
        select: {
          id: true,
          name: true,
          type: true,
          location: true
        }
      });

      if (roomsWithoutQR.length === 0) {
        return res.json({
          success: true,
          message: 'Todas as salas já possuem QR Code',
          generated: 0,
          rooms: []
        });
      }

      console.log(`🔳 Encontradas ${roomsWithoutQR.length} salas sem QR Code`);

      const generated = [];
      const failed = [];

      for (const room of roomsWithoutQR) {
        try {
          const qrCode = this.generateUniqueQRCode(room);
          
          await prisma.room.update({
            where: { id: room.id },
            data: { qrCode }
          });

          generated.push({
            roomId: room.id,
            roomName: room.name,
            qrCode
          });

          console.log(`✅ QR Code gerado para ${room.name}: ${qrCode}`);
        } catch (roomError) {
          console.error(`🔥 Erro ao gerar QR para ${room.name}:`, roomError);
          failed.push({
            roomId: room.id,
            roomName: room.name,
            error: roomError.message
          });
        }
      }

      return res.json({
        success: true,
        message: `QR Codes gerados: ${generated.length} sucessos, ${failed.length} falhas`,
        summary: {
          total: roomsWithoutQR.length,
          generated: generated.length,
          failed: failed.length
        },
        generated,
        failed
      });
    } catch (error) {
      console.error('🔥 Erro ao gerar QR Codes faltantes:', error);
      return res.status(500).json({
        success: false,
        message: 'Erro ao gerar QR Codes faltantes',
        error: error.message
      });
    }
  }

  /**
   * ✅ GERAR RELATÓRIO DE QR CODES
   * GET /api/qr/report
   */
  static async generateQRReport(req, res) {
    try {
      const { format = 'json' } = req.query;

      console.log('📊 Gerando relatório de QR Codes');

      const rooms = await prisma.room.findMany({
        select: {
          id: true,
          name: true,
          type: true,
          location: true,
          qrCode: true,
          status: true,
          lastCleaned: true,
          createdAt: true
        },
        orderBy: { name: 'asc' }
      });

      const stats = {
        total: rooms.length,
        withQR: rooms.filter(r => r.qrCode && r.qrCode.trim() !== '').length,
        withoutQR: rooms.filter(r => !r.qrCode || r.qrCode.trim() === '').length,
        byType: {},
        byStatus: {}
      };

      // Estatísticas por tipo
      rooms.forEach(room => {
        stats.byType[room.type] = (stats.byType[room.type] || 0) + 1;
        stats.byStatus[room.status] = (stats.byStatus[room.status] || 0) + 1;
      });

      const report = {
        metadata: {
          generatedAt: new Date().toISOString(),
          system: 'Neuropsicocentro QR Code System',
          version: '1.0'
        },
        stats,
        rooms: rooms.map(room => ({
          id: room.id,
          name: room.name,
          type: room.type,
          location: room.location,
          qrCode: room.qrCode || 'NÃO GERADO',
          hasQR: !!(room.qrCode && room.qrCode.trim() !== ''),
          status: room.status,
          lastCleaned: room.lastCleaned,
          createdAt: room.createdAt,
          scanUrl: room.qrCode ? `/rooms/qr/${encodeURIComponent(room.qrCode)}` : null
        }))
      };

      if (format === 'csv') {
        // Gerar CSV
        const csvHeader = ['ID', 'Nome', 'Tipo', 'Localização', 'QR Code', 'Status', 'Última Limpeza'];
        const csvRows = rooms.map(room => [
          room.id,
          `"${room.name}"`,
          room.type,
          `"${room.location}"`,
          room.qrCode || 'NÃO GERADO',
          room.status,
          room.lastCleaned ? new Date(room.lastCleaned).toISOString() : 'NUNCA'
        ]);

        const csvContent = [csvHeader.join(',')]
          .concat(csvRows.map(row => row.join(',')))
          .join('\n');

        const fileName = `qr-report-${new Date().toISOString().slice(0, 10)}.csv`;
        
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
        return res.send(csvContent);
      }

      return res.json({
        success: true,
        report
      });
    } catch (error) {
      console.error('🔥 Erro ao gerar relatório de QR Codes:', error);
      return res.status(500).json({
        success: false,
        message: 'Erro ao gerar relatório',
        error: error.message
      });
    }
  }

  /**
   * ✅ GERAR QR CODE PARA IMPRESSÃO (COM URL)
   * GET /api/qr/print/:roomId
   */
  static async generatePrintableQRCode(req, res) {
    try {
      const { roomId } = req.params;

      console.log(`🖨️ Gerando QR Code para impressão: ${roomId}`);

      const room = await prisma.room.findUnique({
        where: { id: roomId },
        select: {
          id: true,
          name: true,
          type: true,
          location: true,
          qrCode: true,
          status: true,
          priority: true
        }
      });

      if (!room) {
        return res.status(404).json({
          success: false,
          message: 'Sala não encontrada'
        });
      }

      let qrCode = room.qrCode;
      if (!qrCode) {
        qrCode = this.generateUniqueQRCode(room);
        await prisma.room.update({
          where: { id: roomId },
          data: { qrCode }
        });
      }

      // Base URL
      const baseURL = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
      const qrURL = `${baseURL}/scan?qr=${encodeURIComponent(qrCode)}&roomId=${roomId}`;

      // HTML para impressão
      const html = `
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>QR Code - ${room.name}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              padding: 20px;
              background: white;
              text-align: center;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              padding: 30px;
              border: 3px solid #1976d2;
              border-radius: 15px;
            }
            .header {
              margin-bottom: 20px;
            }
            .clinic-name {
              font-size: 14px;
              color: #666;
              margin-bottom: 5px;
            }
            .system-name {
              font-size: 18px;
              font-weight: bold;
              color: #1976d2;
            }
            .room-name {
              font-size: 28px;
              font-weight: bold;
              color: #1976d2;
              margin: 20px 0;
              text-transform: uppercase;
            }
            .room-info {
              display: flex;
              justify-content: center;
              gap: 15px;
              margin-bottom: 20px;
              font-size: 14px;
            }
            .room-info-item {
              padding: 5px 15px;
              background: #f5f5f5;
              border-radius: 20px;
            }
            .qr-container {
              margin: 30px auto;
              padding: 20px;
              border: 2px solid #ddd;
              border-radius: 10px;
              display: inline-block;
              background: white;
            }
            .qr-code-text {
              font-family: monospace;
              font-size: 14px;
              background: #f5f5f5;
              padding: 10px;
              border-radius: 5px;
              margin: 20px 0;
              word-break: break-all;
            }
            .qr-url {
              font-size: 12px;
              color: #1976d2;
              margin: 15px 0;
              word-break: break-all;
            }
            .instructions {
              margin-top: 25px;
              padding-top: 15px;
              border-top: 1px dashed #ddd;
              font-size: 13px;
              color: #666;
              line-height: 1.6;
            }
            .footer {
              margin-top: 20px;
              font-size: 11px;
              color: #999;
              border-top: 1px solid #eee;
              padding-top: 10px;
            }
            @media print {
              body { padding: 0; }
              .no-print { display: none; }
              .container { border: none; }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="clinic-name">NEUROPSICOCENTRO</div>
              <div class="system-name">SISTEMA DE GESTÃO DE LIMPEZA</div>
            </div>
            
            <div class="room-name">${room.name}</div>
            
            <div class="room-info">
              <div class="room-info-item">${room.type}</div>
              <div class="room-info-item">${room.location}</div>
              <div class="room-info-item">${room.status}</div>
            </div>
            
            <div class="qr-container">
              <div id="qrcode"></div>
            </div>
            
            <div class="qr-code-text">
              ${qrCode}
            </div>
            
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
              Gerado em: ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR')}<br>
              ID: ${room.id} | Sistema v1.0
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
          </div>
          
          <script src="https://cdn.jsdelivr.net/npm/qrcode@1.5.3/build/qrcode.min.js"></script>
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
                document.getElementById('qrcode').innerHTML = 
                  '<div style="color:red; padding:20px;">Erro ao gerar QR Code</div>';
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

      res.setHeader('Content-Type', 'text/html');
      res.send(html);

    } catch (error) {
      console.error('🔥 Erro ao gerar QR Code para impressão:', error);
      return res.status(500).json({
        success: false,
        message: 'Erro ao gerar QR Code para impressão',
        error: error.message
      });
    }
  }
}

module.exports = QRController;