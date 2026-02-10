// src/controllers/qrController.js - VERSÃO CORRIGIDA
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
}

module.exports = QRController;