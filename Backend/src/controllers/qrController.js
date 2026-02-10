// src/controllers/qrController.js - VERSÃO CORRIGIDA COMPLETA
const QRCode = require('qrcode');
const prisma = require('../utils/database');
const crypto = require('crypto');

class QRController {
  /**
   * ✅ GERAR QR CODE PARA SALA (COM URL DE REDIRECIONAMENTO)
   * POST /api/qr/generate/:roomId
   */
  static async generateQRCode(req, res) {
    try {
      const { roomId } = req.params;
      const { size = 300, format = 'png' } = req.body;

      console.log(`🔳 Gerando QR Code para sala: ${roomId}`);

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

      // ✅ URL QUE SERÁ ABERTA NO CELULAR (importante!)
      let baseURL = process.env.APP_URL;
      if (!baseURL) {
        baseURL = `${req.protocol}://${req.get('host')}`;
      }
      
      const qrURL = `${baseURL}/qr/redirect?code=${encodeURIComponent(qrCode)}&roomId=${room.id}`;
      
      // ✅ O conteúdo do QR Code é APENAS a URL (para abrir automaticamente)
      const qrContent = qrURL;

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
          qrData: {
            type: 'ROOM',
            roomId: room.id,
            roomName: room.name,
            roomType: room.type,
            location: room.location,
            qrCode: qrCode,
            url: qrURL
          },
          qrContent: qrContent,
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
   * ✅ DOWNLOAD QR CODE COM URL
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

      let qrCode = room.qrCode;
      if (!qrCode) {
        qrCode = this.generateUniqueQRCode(room);
      }

      // ✅ URL DE REDIRECIONAMENTO
      const baseURL = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
      const qrURL = `${baseURL}/qr/redirect?code=${encodeURIComponent(qrCode)}&roomId=${room.id}`;

      // ✅ O QR Code contém APENAS a URL
      const qrContent = qrURL;

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
        const qrURL = `${baseURL}/qr/redirect?code=${encodeURIComponent(qrCode)}&roomId=${room.id}`;

        data = {
          type: 'ROOM',
          roomId: room.id,
          roomName: room.name,
          roomType: room.type,
          location: room.location,
          status: room.status,
          qrCode: room.qrCode,
          url: qrURL,
          valid: true,
          message: 'QR Code válido para sala'
        };
      }

      // Verificar se tem URL de redirecionamento
      const hasValidURL = data.url && data.url.includes('/qr/redirect');

      return res.json({
        success: true,
        data,
        valid: true,
        message: 'QR Code válido',
        validation: {
          type: data.type,
          hasValidURL: hasValidURL,
          timestamp: new Date().toISOString(),
          checks: {
            typeValid: data.type === 'ROOM',
            fieldsComplete: !!(data.roomId && data.roomName),
            hasValidURL: hasValidURL
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

  // ===========================================================================
  // ✅ FUNÇÕES ADICIONAIS PARA COMPATIBILIDADE COM ROTAS
  // ===========================================================================

  /**
   * ✅ GERAR QR CODE PARA FUNCIONÁRIO (PLACEHOLDER)
   * POST /api/qr/generate-user/:userId
   */
  static async generateUserQRCode(req, res) {
    try {
      const { userId } = req.params;
      
      // Buscar usuário no banco
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
          message: 'Funcionário não encontrado'
        });
      }

      // Gerar QR Code para funcionário
      const userData = {
        type: 'USER',
        userId: user.id,
        userName: user.name,
        userRole: user.role,
        timestamp: Date.now(),
        action: 'CHECK_IN'
      };

      const baseURL = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
      const qrContent = JSON.stringify(userData);
      
      const qrImage = await QRCode.toDataURL(qrContent, {
        errorCorrectionLevel: 'H',
        margin: 2,
        width: 300,
        color: {
          dark: '#4caf50',
          light: '#ffffff'
        }
      });

      return res.json({
        success: true,
        message: 'QR Code do funcionário gerado com sucesso',
        user,
        qrImage,
        qrData: userData,
        generatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('🔥 Erro ao gerar QR Code de funcionário:', error);
      return res.status(500).json({
        success: false,
        message: 'Erro ao gerar QR Code de funcionário',
        error: error.message
      });
    }
  }

  /**
   * ✅ BAIXAR QR CODE DE FUNCIONÁRIO (PLACEHOLDER)
   * GET /api/qr/download-user/:userId
   */
  static async downloadUserQRCode(req, res) {
    try {
      const { userId } = req.params;
      
      // Buscar usuário no banco
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
          message: 'Funcionário não encontrado'
        });
      }

      // Gerar dados para QR Code
      const userData = {
        type: 'USER',
        userId: user.id,
        userName: user.name,
        userRole: user.role,
        timestamp: Date.now()
      };

      const qrContent = JSON.stringify(userData);
      const fileName = `QR-${user.name.replace(/\s+/g, '-')}-${user.id}`;

      const pngBuffer = await QRCode.toBuffer(qrContent, {
        errorCorrectionLevel: 'H',
        margin: 2,
        width: 300,
        color: {
          dark: '#4caf50',
          light: '#ffffff'
        }
      });

      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}.png"`);
      return res.send(pngBuffer);
    } catch (error) {
      console.error('🔥 Erro ao baixar QR Code de funcionário:', error);
      return res.status(500).json({
        success: false,
        message: 'Erro ao baixar QR Code de funcionário',
        error: error.message
      });
    }
  }

  /**
   * ✅ GERAR QR CODES EM LOTE
   * POST /api/qr/generate-batch
   */
  static async generateBatchQRCodes(req, res) {
    try {
      const { roomIds = [] } = req.body;

      console.log(`🔳 Gerando QR Codes em lote para ${roomIds.length} salas`);

      const results = [];
      const errors = [];

      for (const roomId of roomIds) {
        try {
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
            errors.push({ roomId, error: 'Sala não encontrada' });
            continue;
          }

          let qrCode = room.qrCode;
          let generated = false;

          if (!qrCode || qrCode.trim() === '') {
            qrCode = this.generateUniqueQRCode(room);
            await prisma.room.update({
              where: { id: roomId },
              data: { qrCode }
            });
            generated = true;
          }

          const baseURL = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
          const qrURL = `${baseURL}/qr/redirect?code=${encodeURIComponent(qrCode)}&roomId=${room.id}`;

          results.push({
            roomId: room.id,
            roomName: room.name,
            qrCode,
            generated,
            qrURL,
            success: true
          });
        } catch (roomError) {
          errors.push({ roomId, error: roomError.message });
        }
      }

      return res.json({
        success: true,
        message: `QR Codes gerados em lote: ${results.length} sucessos, ${errors.length} erros`,
        results,
        errors,
        summary: {
          total: roomIds.length,
          successful: results.length,
          failed: errors.length
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
   * ✅ GERAR QR CODES FALTANTES
   * POST /api/qr/generate-missing
   */
  static async generateMissingQRCodes(req, res) {
    try {
      console.log('🔳 Gerando QR Codes faltantes para todas as salas');

      // Buscar salas sem QR Code
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

      console.log(`📊 ${roomsWithoutQR.length} salas sem QR Code encontradas`);

      const results = [];
      const errors = [];

      for (const room of roomsWithoutQR) {
        try {
          const qrCode = this.generateUniqueQRCode(room);
          
          await prisma.room.update({
            where: { id: room.id },
            data: { qrCode }
          });

          const baseURL = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
          const qrURL = `${baseURL}/qr/redirect?code=${encodeURIComponent(qrCode)}&roomId=${room.id}`;

          results.push({
            roomId: room.id,
            roomName: room.name,
            qrCode,
            qrURL,
            success: true
          });

          console.log(`✅ QR Code gerado para ${room.name}: ${qrCode}`);
        } catch (roomError) {
          errors.push({ roomId: room.id, roomName: room.name, error: roomError.message });
          console.error(`❌ Erro ao gerar QR para ${room.name}:`, roomError.message);
        }
      }

      return res.json({
        success: true,
        message: `QR Codes faltantes gerados: ${results.length} sucessos, ${errors.length} erros`,
        results,
        errors,
        summary: {
          totalWithoutQR: roomsWithoutQR.length,
          generated: results.length,
          failed: errors.length,
          timestamp: new Date().toISOString()
        }
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
      console.log('📊 Gerando relatório de QR Codes');

      // Contar salas com e sem QR Code
      const [totalRooms, roomsWithQR, roomsWithoutQR] = await Promise.all([
        prisma.room.count(),
        prisma.room.count({
          where: {
            AND: [
              { qrCode: { not: null } },
              { qrCode: { not: '' } }
            ]
          }
        }),
        prisma.room.count({
          where: {
            OR: [
              { qrCode: null },
              { qrCode: '' }
            ]
          }
        })
      ]);

      // Buscar algumas salas sem QR Code como exemplo
      const exampleRoomsWithoutQR = await prisma.room.findMany({
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
          location: true,
          status: true
        },
        take: 10
      });

      // Buscar salas com QR Code recentemente gerados
      const recentQRGenerated = await prisma.room.findMany({
        where: {
          AND: [
            { qrCode: { not: null } },
            { qrCode: { not: '' } },
            { updatedAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } } // Últimos 7 dias
          ]
        },
        select: {
          id: true,
          name: true,
          qrCode: true,
          updatedAt: true
        },
        orderBy: { updatedAt: 'desc' },
        take: 10
      });

      const report = {
        summary: {
          totalRooms,
          roomsWithQR,
          roomsWithoutQR,
          qrCoveragePercentage: totalRooms > 0 ? Math.round((roomsWithQR / totalRooms) * 100) : 0
        },
        analysis: {
          needsAttention: roomsWithoutQR > 0,
          recommendedAction: roomsWithoutQR > 0 ? 'Gerar QR Codes faltantes' : 'Todas as salas têm QR Code',
          priorityLevel: roomsWithoutQR > 10 ? 'HIGH' : roomsWithoutQR > 5 ? 'MEDIUM' : 'LOW'
        },
        examples: {
          withoutQR: exampleRoomsWithoutQR,
          recentlyGenerated: recentQRGenerated.map(room => ({
            ...room,
            daysAgo: Math.floor((Date.now() - new Date(room.updatedAt).getTime()) / (1000 * 60 * 60 * 24))
          }))
        },
        recommendations: [
          roomsWithoutQR > 0 ? `Gerar QR Codes para ${roomsWithoutQR} salas faltantes` : null,
          'Verificar se todos os QR Codes estão impressos e fixados',
          'Testar funcionalidade de escaneamento periodicamente'
        ].filter(Boolean),
        generatedAt: new Date().toISOString()
      };

      return res.json({
        success: true,
        message: 'Relatório de QR Codes gerado com sucesso',
        report
      });
    } catch (error) {
      console.error('🔥 Erro ao gerar relatório de QR Codes:', error);
      return res.status(500).json({
        success: false,
        message: 'Erro ao gerar relatório de QR Codes',
        error: error.message
      });
    }
  }
}

module.exports = QRController;