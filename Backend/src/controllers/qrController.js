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

      // ✅ BASE URL - IMPORTANTE: deve ter http:// ou https://
      let baseURL = process.env.APP_URL;
      if (!baseURL) {
        baseURL = `${req.protocol}://${req.get('host')}`;
      }
      
      // ✅ URL que será aberta no celular
      const qrURL = `${baseURL}/scan?qr=${encodeURIComponent(qrCode)}&roomId=${room.id}`;
      
      // ✅ Dados para o QR Code
      const qrData = {
        type: 'ROOM',
        roomId: room.id,
        roomName: room.name,
        roomType: room.type,
        location: room.location,
        qrCode: qrCode,
        status: room.status,
        timestamp: Date.now(),
        system: 'Neuropsicocentro Cleaning System',
        url: qrURL  // ✅ URL INCLUÍDA AQUI
      };

      // ✅ Conteúdo do QR Code: URL primeiro (para celular abrir automaticamente)
      const qrContent = `${qrURL}\n\n--- DADOS DA SALA ---\n${JSON.stringify(qrData, null, 2)}`;

      console.log(`🔗 URL no QR Code: ${qrURL}`);

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

      console.log(`✅ QR Code gerado com sucesso para ${room.name}`);

      return res.json({
        success: true,
        data: {
          room,
          qrCode: qrCode,
          qrImage: qrImage,
          qrData: qrData,
          qrContent: qrContent,  // ✅ Retorna o conteúdo para debug
          urls: {
            app: qrURL,
            scan: `${baseURL}/scan?qr=${encodeURIComponent(qrCode)}`,
            redirect: `${baseURL}/qr/redirect?code=${encodeURIComponent(qrCode)}`
          },
          generatedAt: new Date().toISOString(),
          instructions: 'Escaneie no celular para abrir a aplicação automaticamente'
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
   * ✅ GERAR QR CODE COM URL APENAS (para celular)
   * POST /api/qr/generate-url-only/:roomId
   */
  static async generateQRCodeUrlOnly(req, res) {
    try {
      const { roomId } = req.params;
      const { size = 300, format = 'png' } = req.body;

      console.log(`🔳 Gerando QR Code (URL apenas) para sala: ${roomId}`);

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

      let qrCode = room.qrCode;
      if (!qrCode) {
        qrCode = this.generateUniqueQRCode(room);
        await prisma.room.update({
          where: { id: roomId },
          data: { qrCode }
        });
      }

      // Base URL
      let baseURL = process.env.APP_URL;
      if (!baseURL) {
        baseURL = `${req.protocol}://${req.get('host')}`;
      }
      
      // URL que será aberta no celular
      const qrURL = `${baseURL}/scan?qr=${encodeURIComponent(qrCode)}&roomId=${room.id}`;

      console.log(`🔗 QR Code URL: ${qrURL}`);

      // Gerar QR Code APENAS com a URL
      let qrImage;
      if (format === 'svg') {
        qrImage = await QRCode.toString(qrURL, {
          type: 'svg',
          margin: 2,
          width: parseInt(size),
          color: {
            dark: '#1976d2',
            light: '#ffffff'
          }
        });
      } else {
        qrImage = await QRCode.toDataURL(qrURL, {
          errorCorrectionLevel: 'H',
          margin: 2,
          width: parseInt(size),
          color: {
            dark: '#1976d2',
            light: '#ffffff'
          }
        });
      }

      return res.json({
        success: true,
        data: {
          room,
          qrCode: qrCode,
          qrImage: qrImage,
          url: qrURL,
          content: qrURL,  // ✅ O conteúdo é APENAS a URL
          generatedAt: new Date().toISOString(),
          message: 'QR Code contém apenas URL para abrir no celular'
        }
      });
    } catch (error) {
      console.error('🔥 Erro ao gerar QR Code (URL apenas):', error);
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
      const { format = 'png', size = 300, type = 'url-only' } = req.query;

      console.log(`⬇️ Baixando QR Code para sala: ${roomId}, tipo: ${type}`);

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

      let qrCode = room.qrCode;
      if (!qrCode) {
        qrCode = this.generateUniqueQRCode(room);
      }

      // Base URL
      const baseURL = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
      const qrURL = `${baseURL}/scan?qr=${encodeURIComponent(qrCode)}&roomId=${room.id}`;

      // Conteúdo do QR Code baseado no tipo
      let qrContent;
      if (type === 'url-only') {
        qrContent = qrURL;  // Apenas URL
      } else {
        // URL + dados
        const qrData = {
          roomId: room.id,
          roomName: room.name,
          roomType: room.type,
          location: room.location,
          qrCode: qrCode,
          url: qrURL
        };
        qrContent = `${qrURL}\n\n--- DADOS ---\n${JSON.stringify(qrData, null, 2)}`;
      }

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
      const { roomIds = [], size = 200, format = 'png', type = 'url-only' } = req.body;

      if (!Array.isArray(roomIds) || roomIds.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Lista de IDs de sala é obrigatória'
        });
      }

      console.log(`🔳 Gerando lote de QR Codes para ${roomIds.length} salas, tipo: ${type}`);

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

      const baseURL = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
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

            const qrURL = `${baseURL}/scan?qr=${encodeURIComponent(qrCode)}&roomId=${room.id}`;

            // Conteúdo baseado no tipo
            let qrContent;
            if (type === 'url-only') {
              qrContent = qrURL;
            } else {
              const qrData = {
                roomId: room.id,
                roomName: room.name,
                roomType: room.type,
                location: room.location,
                qrCode: qrCode,
                url: qrURL
              };
              qrContent = `${qrURL}\n\n--- DADOS ---\n${JSON.stringify(qrData, null, 2)}`;
            }

            let qrImage;
            if (format === 'svg') {
              qrImage = await QRCode.toString(qrContent, {
                type: 'svg',
                margin: 1,
                width: parseInt(size),
                color: {
                  dark: '#1976d2',
                  light: '#ffffff'
                }
              });
            } else {
              qrImage = await QRCode.toDataURL(qrContent, {
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
              qrContent: qrContent,  // Para debug
              downloadUrl: `/api/qr/download/${room.id}?format=${format}&size=${size}&type=${type}`
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
          type: type,
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

        const baseURL = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
        const qrURL = `${baseURL}/scan?qr=${encodeURIComponent(qrCode)}&roomId=${room.id}`;

        data = {
          type: 'ROOM',
          roomId: room.id,
          roomName: room.name,
          roomType: room.type,
          location: room.location,
          status: room.status,
          qrCode: room.qrCode,
          url: qrURL,  // ✅ URL incluída
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
          hasUrl: !!data.url,  // ✅ Verifica se tem URL
          timestamp: new Date().toISOString(),
          checks: {
            typeValid: isValidType,
            fieldsComplete: hasRequiredFields,
            systemMatch: data.system ? data.system.includes('Neuropsicocentro') : false,
            hasValidUrl: data.url && data.url.startsWith('http')
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
      const baseURL = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;

      for (const room of roomsWithoutQR) {
        try {
          const qrCode = this.generateUniqueQRCode(room);
          const qrURL = `${baseURL}/scan?qr=${encodeURIComponent(qrCode)}&roomId=${room.id}`;
          
          await prisma.room.update({
            where: { id: room.id },
            data: { qrCode }
          });

          generated.push({
            roomId: room.id,
            roomName: room.name,
            qrCode,
            url: qrURL
          });

          console.log(`✅ QR Code gerado para ${room.name}: ${qrCode}`);
          console.log(`🔗 URL: ${qrURL}`);
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
   * ✅ REGENERAR TODOS OS QR CODES (ATUALIZAR COM URL)
   * POST /api/qr/regenerate-all
   */
  static async regenerateAllQRCodes(req, res) {
    try {
      console.log('🔄 Regenerando TODOS os QR Codes...');

      const rooms = await prisma.room.findMany({
        select: {
          id: true,
          name: true,
          type: true,
          location: true,
          qrCode: true
        }
      });

      if (rooms.length === 0) {
        return res.json({
          success: true,
          message: 'Nenhuma sala encontrada',
          regenerated: 0
        });
      }

      console.log(`📊 Total de salas: ${rooms.length}`);

      const results = [];
      const baseURL = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;

      for (const room of rooms) {
        try {
          const newQRCode = this.generateUniqueQRCode(room);
          const qrURL = `${baseURL}/scan?qr=${encodeURIComponent(newQRCode)}&roomId=${room.id}`;
          
          await prisma.room.update({
            where: { id: room.id },
            data: { qrCode: newQRCode }
          });

          results.push({
            success: true,
            roomId: room.id,
            roomName: room.name,
            oldQRCode: room.qrCode,
            newQRCode: newQRCode,
            url: qrURL,
            message: 'QR Code regenerado com URL'
          });

          console.log(`✅ ${room.name}: ${newQRCode}`);
          console.log(`🔗 URL: ${qrURL}`);
        } catch (roomError) {
          console.error(`🔥 Erro ao regenerar QR para ${room.name}:`, roomError);
          results.push({
            success: false,
            roomId: room.id,
            roomName: room.name,
            error: roomError.message
          });
        }
      }

      const successCount = results.filter(r => r.success).length;
      const failedCount = results.filter(r => !r.success).length;

      console.log(`🎉 Regeneração concluída: ${successCount} sucessos, ${failedCount} falhas`);

      return res.json({
        success: true,
        message: `QR Codes regenerados: ${successCount} sucessos, ${failedCount} falhas`,
        summary: {
          total: rooms.length,
          success: successCount,
          failed: failedCount,
          timestamp: new Date().toISOString()
        },
        results
      });
    } catch (error) {
      console.error('🔥 Erro ao regenerar QR Codes:', error);
      return res.status(500).json({
        success: false,
        message: 'Erro ao regenerar QR Codes',
        error: error.message
      });
    }
  }

  /**
   * ✅ VERIFICAR QR CODE DE UMA SALA
   * GET /api/qr/check/:roomId
   */
  static async checkRoomQRCode(req, res) {
    try {
      const { roomId } = req.params;

      console.log(`🔍 Verificando QR Code da sala: ${roomId}`);

      const room = await prisma.room.findUnique({
        where: { id: roomId },
        select: {
          id: true,
          name: true,
          type: true,
          location: true,
          qrCode: true,
          status: true
        }
      });

      if (!room) {
        return res.status(404).json({
          success: false,
          message: 'Sala não encontrada'
        });
      }

      const baseURL = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
      let qrURL = null;
      let qrContent = null;

      if (room.qrCode) {
        qrURL = `${baseURL}/scan?qr=${encodeURIComponent(room.qrCode)}&roomId=${room.id}`;
        
        // Verificar o que o QR Code atual contém
        const qrData = {
          type: 'ROOM',
          roomId: room.id,
          roomName: room.name,
          roomType: room.type,
          location: room.location,
          qrCode: room.qrCode,
          url: qrURL
        };
        qrContent = `${qrURL}\n\n--- DADOS ---\n${JSON.stringify(qrData, null, 2)}`;
      }

      return res.json({
        success: true,
        data: {
          room: {
            id: room.id,
            name: room.name,
            type: room.type,
            location: room.location,
            qrCode: room.qrCode,
            hasQRCode: !!room.qrCode
          },
          qrInfo: {
            url: qrURL,
            contentPreview: qrContent ? qrContent.substring(0, 200) + '...' : null,
            hasUrl: !!qrURL,
            needsRegeneration: !qrURL  // Se não tem URL, precisa regenerar
          },
          recommendations: room.qrCode && !qrURL 
            ? 'O QR Code atual não contém URL. Recomenda-se regenerar.'
            : room.qrCode 
            ? 'QR Code atual contém URL. OK para uso.'
            : 'Sala não possui QR Code. Gere um novo.'
        }
      });
    } catch (error) {
      console.error('🔥 Erro ao verificar QR Code:', error);
      return res.status(500).json({
        success: false,
        message: 'Erro ao verificar QR Code',
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

      const baseURL = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
      
      const roomsWithUrl = rooms.map(room => {
        const qrURL = room.qrCode 
          ? `${baseURL}/scan?qr=${encodeURIComponent(room.qrCode)}&roomId=${room.id}`
          : null;
        
        return {
          ...room,
          qrURL,
          hasQRCode: !!(room.qrCode && room.qrCode.trim() !== ''),
          hasUrl: !!qrURL,
          needsRegeneration: room.qrCode && !qrURL
        };
      });

      const stats = {
        total: rooms.length,
        withQR: rooms.filter(r => r.qrCode && r.qrCode.trim() !== '').length,
        withoutQR: rooms.filter(r => !r.qrCode || r.qrCode.trim() === '').length,
        withUrl: roomsWithUrl.filter(r => r.hasUrl).length,
        withoutUrl: roomsWithUrl.filter(r => !r.hasUrl && r.hasQRCode).length,
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
          version: '1.0',
          baseURL: baseURL
        },
        stats,
        rooms: roomsWithUrl,
        recommendations: {
          needsRegeneration: roomsWithUrl.filter(r => r.needsRegeneration).length > 0
            ? 'Alguns QR Codes não contêm URL. Execute /api/qr/regenerate-all para atualizar.'
            : 'Todos os QR Codes estão com URL. OK.',
          missingQRCodes: stats.withoutQR > 0
            ? `Existem ${stats.withoutQR} salas sem QR Code. Execute /api/qr/generate-missing.`
            : 'Todas as salas possuem QR Code.'
        }
      };

      if (format === 'csv') {
        // Gerar CSV
        const csvHeader = ['ID', 'Nome', 'Tipo', 'Localização', 'QR Code', 'Tem URL?', 'Status', 'Última Limpeza'];
        const csvRows = roomsWithUrl.map(room => [
          room.id,
          `"${room.name}"`,
          room.type,
          `"${room.location}"`,
          room.qrCode || 'NÃO GERADO',
          room.hasUrl ? 'SIM' : 'NÃO',
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
}

module.exports = QRController;