// src/controllers/qrController.js - CÓDIGO 100% CORRIGIDO
const QRCode = require('qrcode');
const prisma = require('../utils/database');
const crypto = require('crypto');

class QRController {
  /**
   * ✅ GERAR QR CODE PARA SALA (COM URL QUE ABRE NO CELULAR)
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

      // ✅✅✅ CORREÇÃO PRINCIPAL: URL QUE VAI DENTRO DO QR CODE
      // O QR Code deve conter UMA URL, não JSON!
      const frontendURL = process.env.FRONTEND_URL || 'https://gest-o-de-limpeza.onrender.com';
      
      // ✅ CONTEÚDO DO QR CODE: APENAS A URL (isso faz o celular abrir)
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
          qrContent: qrContent, // ✅ URL que está dentro do QR
          qrURL: qrContent, // ✅ Mesma URL
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

      // ✅ URL QUE VAI DENTRO DO QR CODE
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
   * ✅ VALIDAR QR CODE
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

        // ✅ URL PARA ABRIR NO CELULAR
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
          url: qrURL, // ✅ URL para abrir no celular
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
   * ✅ GERAR QR CODE PARA FUNCIONÁRIO
   */
  static async generateUserQRCode(req, res) {
    try {
      const { userId } = req.params;
      
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

      // ✅ QR Code com URL para check-in do funcionário
      const frontendURL = process.env.FRONTEND_URL || 'https://gest-o-de-limpeza.onrender.com';
      const qrContent = `${frontendURL}/worker/checkin?userId=${user.id}&name=${encodeURIComponent(user.name)}`;
      
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
        qrContent: qrContent,
        qrURL: qrContent,
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
   * ✅ GERAR QR CODES EM LOTE
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

          // ✅ URL para o QR Code
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
   * ✅ GERAR QR CODES FALTANTES
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

          // ✅ URL para o QR Code
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
}

module.exports = QRController;