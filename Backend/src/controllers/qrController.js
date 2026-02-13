// src/controllers/qrController.js - VERSÃO COMPLETA ajustada
const QRCode = require('qrcode');
const prisma = require('../utils/database');
const crypto = require('crypto');

class QRController {
  /**
   *  GERAR QR CODE PARA SALA (COM URL QUE ABRE NO CELULAR)
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

      //  CORREÇÃO PRINCIPAL: URL QUE VAI DENTRO DO QR CODE
      const frontendURL = process.env.FRONTEND_URL || 'https://gest-o-de-limpeza.onrender.com';
      const qrContent = `${frontendURL}/scan?roomId=${room.id}&qr=${encodeURIComponent(qrCode)}`;
      
      console.log(`🔗 Conteúdo do QR Code (URL): ${qrContent}`);

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
          qrContent: qrContent,
          qrURL: qrContent,
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
   *  GERAR QR CODE ÚNICO
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
   *  DOWNLOAD QR CODE COM URL
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

      const frontendURL = process.env.FRONTEND_URL || 'https://gest-o-de-limpeza.onrender.com';
      const qrContent = `${frontendURL}/scan?roomId=${room.id}&qr=${encodeURIComponent(qrCode)}`;

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
   *  VALIDAR QR CODE
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

        const frontendURL = process.env.FRONTEND_URL || 'https://gest-o-de-limpeza.onrender.com';
        const qrURL = `${frontendURL}/scan?roomId=${room.id}&qr=${encodeURIComponent(qrCode)}`;

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

      return res.json({
        success: true,
        data,
        valid: true,
        message: 'QR Code válido',
        validation: {
          type: data.type,
          hasValidURL: data.url && data.url.includes('/scan'),
          timestamp: new Date().toISOString(),
          checks: {
            typeValid: data.type === 'ROOM',
            fieldsComplete: !!(data.roomId && data.roomName),
            hasValidURL: data.url && data.url.includes('/scan')
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
   *  GERAR QR CODES EM LOTE
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

          const frontendURL = process.env.FRONTEND_URL || 'https://gest-o-de-limpeza.onrender.com';
          const qrContent = `${frontendURL}/scan?roomId=${room.id}&qr=${encodeURIComponent(qrCode)}`;

          results.push({
            roomId: room.id,
            roomName: room.name,
            qrCode,
            generated,
            qrContent: qrContent,
            qrURL: qrContent,
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
   *  GERAR QR CODES FALTANTES
   */
  static async generateMissingQRCodes(req, res) {
    try {
      console.log('🔳 Gerando QR Codes faltantes para todas as salas');

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

          const frontendURL = process.env.FRONTEND_URL || 'https://gest-o-de-limpeza.onrender.com';
          const qrContent = `${frontendURL}/scan?roomId=${room.id}&qr=${encodeURIComponent(qrCode)}`;

          results.push({
            roomId: room.id,
            roomName: room.name,
            qrCode,
            qrContent: qrContent,
            qrURL: qrContent,
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
   *  RELATÓRIO DE QR CODES
   */
  static async generateQRReport(req, res) {
    try {
      console.log('📊 Gerando relatório de QR Codes');

      const rooms = await prisma.room.findMany({
        select: {
          id: true,
          name: true,
          type: true,
          location: true,
          qrCode: true,
          status: true,
          lastCleaned: true
        },
        orderBy: {
          name: 'asc'
        }
      });

      const report = {
        totalRooms: rooms.length,
        roomsWithQR: rooms.filter(r => r.qrCode && r.qrCode.trim() !== '').length,
        roomsWithoutQR: rooms.filter(r => !r.qrCode || r.qrCode.trim() === '').length,
        byType: {},
        byStatus: {},
        details: rooms.map(room => ({
          id: room.id,
          name: room.name,
          type: room.type,
          location: room.location,
          hasQRCode: !!(room.qrCode && room.qrCode.trim() !== ''),
          qrCode: room.qrCode,
          status: room.status,
          lastCleaned: room.lastCleaned,
          needsQR: !room.qrCode || room.qrCode.trim() === '',
          frontendURL: room.qrCode 
            ? `${process.env.FRONTEND_URL || 'https://gest-o-de-limpeza.onrender.com'}/scan?roomId=${room.id}&qr=${encodeURIComponent(room.qrCode)}`
            : null
        }))
      };

      // Estatísticas por tipo
      rooms.forEach(room => {
        report.byType[room.type] = (report.byType[room.type] || 0) + 1;
        report.byStatus[room.status] = (report.byStatus[room.status] || 0) + 1;
      });

      return res.json({
        success: true,
        message: 'Relatório de QR Codes gerado com sucesso',
        report,
        generatedAt: new Date().toISOString(),
        summary: {
          total: report.totalRooms,
          withQR: report.roomsWithQR,
          withoutQR: report.roomsWithoutQR,
          percentageWithQR: Math.round((report.roomsWithQR / report.totalRooms) * 100),
          urgent: report.details.filter(r => r.needsQR && r.status === 'NEEDS_ATTENTION').length
        }
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

  /**
   *  OBTER SALA POR QR CODE (FUNÇÃO FALTANTE QUE CAUSA O ERRO)
   * GET /api/rooms/qr/:qrCode
   */
  static async getRoomByQRCode(req, res) {
    try {
      const { qrCode } = req.params;
      const decodedQR = decodeURIComponent(qrCode);
      
      console.log(`🔍 Buscando sala pelo QR Code: ${decodedQR.substring(0, 30)}...`);

      const room = await prisma.room.findFirst({
        where: { 
          qrCode: decodedQR
        },
        include: {
          cleaningHistory: {
            take: 1,
            orderBy: { startedAt: 'desc' },
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true
                }
              }
            }
          }
        }
      });

      if (!room) {
        return res.status(404).json({
          success: false,
          message: 'Sala não encontrada para este QR Code'
        });
      }

      // Verificar se está sendo limpa agora
      const currentCleaning = await prisma.cleaningHistory.findFirst({
        where: {
          roomId: room.id,
          status: 'IN_PROGRESS'
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      });

      const frontendURL = process.env.FRONTEND_URL || 'https://gest-o-de-limpeza.onrender.com';
      const scanURL = `${frontendURL}/scan?roomId=${room.id}&qr=${encodeURIComponent(room.qrCode)}`;

      return res.json({
        success: true,
        data: {
          room: {
            id: room.id,
            name: room.name,
            type: room.type,
            location: room.location,
            status: room.status,
            priority: room.priority,
            qrCode: room.qrCode,
            lastCleaned: room.lastCleaned,
            createdAt: room.createdAt,
            updatedAt: room.updatedAt
          },
          isBeingCleaned: !!currentCleaning,
          currentCleaner: currentCleaning ? {
            id: currentCleaning.user.id,
            name: currentCleaning.user.name,
            email: currentCleaning.user.email,
            startedAt: currentCleaning.startedAt
          } : null,
          lastCleaning: room.cleaningHistory[0] ? {
            id: room.cleaningHistory[0].id,
            status: room.cleaningHistory[0].status,
            completedAt: room.cleaningHistory[0].completedAt,
            cleaner: room.cleaningHistory[0].user
          } : null,
          scanInfo: {
            canStartCleaning: !currentCleaning && room.status !== 'COMPLETED',
            scanURL: scanURL,
            timestamp: new Date().toISOString(),
            validation: {
              valid: true,
              type: 'ROOM_QR',
              message: 'QR Code válido para sala'
            }
          }
        }
      });
    } catch (error) {
      console.error('🔥 Erro ao buscar sala por QR Code:', error);
      return res.status(500).json({
        success: false,
        message: 'Erro ao buscar sala por QR Code',
        error: error.message
      });
    }
  }
}

//  EXPORTE CORRETO COM TODAS AS FUNÇÕES
module.exports = QRController;
