// src/controllers/qrController.js
const QRCode = require('qrcode');
const prisma = require('../utils/database');
const crypto = require('crypto');

class QRController {
  /**
   * ✅ GERAR QR CODE PARA SALA
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

      // Dados para o QR Code
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
        system: 'Neuropsicocentro Cleaning'
      };

      // Gerar QR Code como imagem
      let qrImage;
      if (format === 'svg') {
        qrImage = await QRCode.toString(JSON.stringify(qrData), {
          type: 'svg',
          margin: 2,
          width: parseInt(size),
          color: {
            dark: '#1976d2',
            light: '#ffffff'
          }
        });
      } else {
        qrImage = await QRCode.toDataURL(JSON.stringify(qrData), {
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
          downloadUrl: `/api/qr/download/${roomId}?format=${format}&size=${size}`,
          scanUrl: `/rooms/qr/${encodeURIComponent(qrCode)}`,
          scanInstructions: 'Use o aplicativo para escanear e iniciar limpeza',
          generatedAt: new Date().toISOString()
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

      console.log(`⬇️  Baixando QR Code para sala: ${roomId}, formato: ${format}`);

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

      const qrData = {
        type: 'ROOM',
        roomId: room.id,
        roomName: room.name,
        roomType: room.type,
        location: room.location,
        qrCode: qrCode,
        timestamp: Date.now(),
        system: 'Neuropsicocentro'
      };

      const fileName = `QR-${room.name.replace(/\s+/g, '-')}-${room.id}-${Date.now()}`;

      if (format === 'svg') {
        const svg = await QRCode.toString(JSON.stringify(qrData), {
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
        console.log(`✅ SVG gerado para ${room.name}`);
        return res.send(svg);
      } else {
        const pngBuffer = await QRCode.toBuffer(JSON.stringify(qrData), {
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
        console.log(`✅ PNG gerado para ${room.name}`);
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

            const qrData = {
              type: 'ROOM',
              roomId: room.id,
              roomName: room.name,
              roomType: room.type,
              location: room.location,
              qrCode: qrCode,
              timestamp: Date.now()
            };

            let qrImage;
            if (format === 'svg') {
              qrImage = await QRCode.toString(JSON.stringify(qrData), {
                type: 'svg',
                margin: 1,
                width: parseInt(size),
                color: {
                  dark: '#1976d2',
                  light: '#ffffff'
                }
              });
            } else {
              qrImage = await QRCode.toDataURL(JSON.stringify(qrData), {
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
              qrData,
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

      const qrData = {
        type: 'USER',
        userId: user.id,
        userName: user.name,
        userEmail: user.email,
        userRole: user.role,
        userStatus: user.status,
        timestamp: Date.now(),
        checksum: crypto
          .createHash('md5')
          .update(`${user.id}:${user.email}:${Date.now()}`)
          .digest('hex'),
        system: 'Neuropsicocentro Staff'
      };

      const qrImage = await QRCode.toDataURL(JSON.stringify(qrData), {
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

      console.log(`⬇️  Baixando QR Code para usuário: ${userId}`);

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

      const qrData = {
        type: 'USER',
        userId: user.id,
        userName: user.name,
        userRole: user.role,
        timestamp: Date.now(),
        system: 'Neuropsicocentro Staff'
      };

      const fileName = `QR-USER-${user.name.replace(/\s+/g, '-')}-${user.id}`;

      const pngBuffer = await QRCode.toBuffer(JSON.stringify(qrData), {
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
      console.log(`✅ QR Code de usuário baixado: ${user.name}`);
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
}

module.exports = QRController;