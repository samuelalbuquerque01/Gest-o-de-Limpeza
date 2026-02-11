// src/controllers/roomController.js - VERSÃO COMPLETAMENTE CORRIGIDA
const { PrismaClient } = require("@prisma/client");
const crypto = require("crypto");
const QRCode = require('qrcode');

const prisma = new PrismaClient();

function slugify(str = "") {
  return String(str)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
    .toUpperCase();
}

async function generateUniqueQrCode({ type, name, location }) {
  const base = `QR-${slugify(type)}-${slugify(name)}-${slugify(location)}`.slice(0, 40);
  
  for (let i = 0; i < 10; i++) {
    const rnd = crypto.randomBytes(3).toString("hex").toUpperCase();
    const code = `${base}-${rnd}`;
    
    const exists = await prisma.room.findUnique({ 
      where: { qrCode: code } 
    });
    
    if (!exists) return code;
  }
  
  const timestamp = Date.now().toString(36).toUpperCase();
  return `${base}-${timestamp}`.slice(0, 50);
}

/**
 * ✅ GERAR IMAGEM DO QR CODE COM URL QUE ABRE NO CELULAR
 */
async function generateQRImage(qrCode, roomData, req) {
  try {
    const frontendURL = process.env.FRONTEND_URL || 'https://gest-o-de-limpeza.onrender.com';
    const qrContent = `${frontendURL}/scan?roomId=${roomData.id}&qr=${encodeURIComponent(qrCode)}`;
    
    const qrImage = await QRCode.toDataURL(qrContent, {
      errorCorrectionLevel: 'H',
      margin: 2,
      width: 300,
      color: {
        dark: '#1976d2',
        light: '#ffffff'
      }
    });

    return { qrImage, qrContent };
  } catch (error) {
    console.error('🔥 Erro ao gerar imagem do QR:', error);
    return null;
  }
}

const roomController = {
  // ✅ BUSCAR AMBIENTE POR ID
  getRoomById: async (req, res) => {
    try {
      const { id } = req.params;

      console.log(`🔍 Buscando sala por ID: ${id}`);

      const room = await prisma.room.findUnique({
        where: { id },
        include: {
          _count: {
            select: { cleaningRecords: true }
          }
        }
      });

      if (!room) {
        return res.status(404).json({ 
          success: false, 
          message: "Ambiente não encontrado" 
        });
      }

      const frontendURL = process.env.FRONTEND_URL || 'https://gest-o-de-limpeza.onrender.com';
      const hasQRCode = !!(room.qrCode && room.qrCode.trim() !== '');
      const qrURL = hasQRCode ? `${frontendURL}/scan?roomId=${room.id}&qr=${encodeURIComponent(room.qrCode)}` : null;

      return res.json({ 
        success: true, 
        room: {
          ...room,
          hasQRCode,
          qrStatus: hasQRCode ? 'ACTIVE' : 'MISSING',
          qrURL,
          scanUrl: hasQRCode ? `/api/rooms/qr/${encodeURIComponent(room.qrCode)}` : null,
          printUrl: `/api/qr/print/${room.id}`,
          downloadUrl: `/api/qr/download/${room.id}`
        }
      });
    } catch (error) {
      console.error("🔥 getRoomById error:", error);
      return res.status(500).json({ 
        success: false, 
        message: "Erro ao buscar ambiente",
        error: error.message 
      });
    }
  },

  // ✅ ESCANEAR QR CODE (WORKER) - VERSÃO CORRIGIDA
  scanQRCode: async (req, res) => {
    try {
      const { qrCode } = req.params;

      if (!qrCode) {
        return res.status(400).json({ 
          success: false, 
          message: 'QR Code é obrigatório' 
        });
      }

      const decodedQR = decodeURIComponent(qrCode);
      console.log(`🔍 Escaneando QR Code: ${decodedQR.substring(0, 30)}...`);

      // Buscar sala pelo QR Code
      const room = await prisma.room.findFirst({
        where: { 
          qrCode: decodedQR
        }
      });

      if (!room) {
        console.log(`❌ QR Code não encontrado: ${decodedQR}`);
        return res.status(404).json({ 
          success: false, 
          message: 'Ambiente não encontrado com este QR Code' 
        });
      }

      console.log(`✅ Sala encontrada: ${room.name} (ID: ${room.id})`);

      // Verificar se há limpeza em andamento
      const activeCleaning = await prisma.cleaningRecord.findFirst({
        where: {
          roomId: room.id,
          status: 'IN_PROGRESS'
        },
        include: {
          cleaner: {
            select: { id: true, name: true, email: true }
          }
        }
      });

      console.log(`📊 Status da sala: ${room.status}, Limpeza ativa: ${!!activeCleaning}`);

      // ✅ FORMATO CORRIGIDO - Frontend espera { success, room, isBeingCleaned, ... }
      return res.json({
        success: true,
        room: {
          id: room.id,
          name: room.name,
          type: room.type,
          location: room.location,
          status: room.status,
          qrCode: room.qrCode,
          priority: room.priority,
          lastCleaned: room.lastCleaned,
          description: room.description,
          notes: room.notes,
          createdAt: room.createdAt,
          updatedAt: room.updatedAt
        },
        isBeingCleaned: !!activeCleaning,
        currentCleaner: activeCleaning?.cleaner || null,
        activeCleaningId: activeCleaning?.id || null,
        message: activeCleaning 
          ? `Esta sala está sendo limpa por ${activeCleaning.cleaner?.name || 'um funcionário'}.` 
          : 'Sala disponível para limpeza.',
        scanInfo: {
          scannedAt: new Date().toISOString(),
          qrCode: room.qrCode,
          canStartCleaning: !activeCleaning && room.status === 'PENDING'
        }
      });
    } catch (error) {
      console.error('🔥 Erro ao escanear QR:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Erro ao processar QR Code',
        error: error.message 
      });
    }
  },

  // ✅ GERAR NOVO QR CODE PARA UMA SALA (COM URL)
  generateNewQRCode: async (req, res) => {
    try {
      const { id } = req.params;
      const { generateImage = false } = req.body;
      
      console.log(`🔳 Gerando novo QR Code para sala ID: ${id}`);

      const room = await prisma.room.findUnique({
        where: { id }
      });

      if (!room) {
        return res.status(404).json({
          success: false,
          message: 'Ambiente não encontrado'
        });
      }

      const newQRCode = await generateUniqueQrCode({
        type: room.type,
        name: room.name,
        location: room.location
      });

      console.log(`✅ Novo QR Code gerado: ${newQRCode}`);

      const updatedRoom = await prisma.room.update({
        where: { id },
        data: { qrCode: newQRCode },
      });

      let qrImage = null;
      let qrURL = null;
      if (generateImage) {
        const qrData = await generateQRImage(newQRCode, updatedRoom, req);
        qrImage = qrData?.qrImage || null;
        qrURL = qrData?.qrContent || null;
      }

      const frontendURL = process.env.FRONTEND_URL || 'https://gest-o-de-limpeza.onrender.com';
      const scanURL = `${frontendURL}/scan?roomId=${updatedRoom.id}&qr=${encodeURIComponent(newQRCode)}`;

      return res.json({
        success: true,
        message: 'Novo QR Code gerado com sucesso',
        qrCode: updatedRoom.qrCode,
        qrImage: qrImage,
        qrURL: scanURL,
        room: updatedRoom,
        scanUrl: `/api/rooms/qr/${encodeURIComponent(newQRCode)}`,
        redirectUrl: scanURL,
        downloadUrl: `/api/qr/download/${id}`,
        generatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('🔥 Erro ao gerar novo QR Code:', error);
      return res.status(500).json({
        success: false,
        message: 'Erro ao gerar novo QR Code',
        error: error.message
      });
    }
  },

  // ✅ ADMIN: listar ambientes (com filtros)
  async getRooms(req, res) {
    try {
      const { status, type, priority, q, hasQR } = req.query;

      const where = {};
      if (status && status !== "ALL") where.status = status;
      if (type && type !== "ALL") where.type = type;
      if (priority && priority !== "ALL") where.priority = priority;
      
      if (hasQR === "true") {
        where.NOT = [
          { qrCode: null },
          { qrCode: "" }
        ];
      } else if (hasQR === "false") {
        where.OR = [
          { qrCode: null },
          { qrCode: "" }
        ];
      }

      if (q) {
        const query = String(q).trim();
        where.OR = [
          { name: { contains: query, mode: "insensitive" } },
          { location: { contains: query, mode: "insensitive" } },
          { qrCode: { contains: query, mode: "insensitive" } },
          { description: { contains: query, mode: "insensitive" } },
        ];
      }

      const rooms = await prisma.room.findMany({
        where,
        orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
      });

      const frontendURL = process.env.FRONTEND_URL || 'https://gest-o-de-limpeza.onrender.com';
      const roomsWithQRInfo = rooms.map(room => ({
        ...room,
        hasQRCode: !!(room.qrCode && room.qrCode.trim() !== ''),
        qrStatus: room.qrCode && room.qrCode.trim() !== '' ? 'ACTIVE' : 'MISSING',
        scanUrl: room.qrCode ? `/api/rooms/qr/${encodeURIComponent(room.qrCode)}` : null,
        qrURL: room.qrCode ? `${frontendURL}/scan?roomId=${room.id}&qr=${encodeURIComponent(room.qrCode)}` : null
      }));

      return res.json({ 
        success: true, 
        data: roomsWithQRInfo,
        stats: {
          total: rooms.length,
          withQR: rooms.filter(r => r.qrCode && r.qrCode.trim() !== '').length,
          withoutQR: rooms.filter(r => !r.qrCode || r.qrCode.trim() === '').length
        }
      });
    } catch (error) {
      console.error("🔥 getRooms error:", error);
      return res.status(500).json({ 
        success: false, 
        message: "Erro ao listar ambientes",
        error: error.message 
      });
    }
  },

  // ✅ ADMIN: criar ambiente COM QR CODE E URL
  async createRoom(req, res) {
    try {
      const body = req.body || {};

      const name = String(body.name || "").trim();
      const type = String(body.type || "ROOM").trim();
      const location = String(body.location || "").trim();

      if (!name || !type || !location) {
        return res.status(400).json({
          success: false,
          message: "Campos obrigatórios: nome/tipo/localização",
        });
      }

      const qrCode = body.qrCode && String(body.qrCode).trim()
        ? String(body.qrCode).trim()
        : await generateUniqueQrCode({ type, name, location });

      console.log(`✅ Criando sala "${name}" com QR Code: ${qrCode}`);

      const data = {
        name,
        type,
        location,
        description: body.description ? String(body.description) : null,
        qrCode,
        status: body.status ? String(body.status) : "PENDING",
        priority: body.priority ? String(body.priority) : "MEDIUM",
        notes: body.notes ? String(body.notes) : null,
        lastCleaned: body.lastCleaned ? new Date(body.lastCleaned) : null,
        nextCleaning: body.nextCleaning ? new Date(body.nextCleaning) : null,
      };

      const room = await prisma.room.create({ data });
      
      const qrData = await generateQRImage(qrCode, room, req);
      
      const frontendURL = process.env.FRONTEND_URL || 'https://gest-o-de-limpeza.onrender.com';
      const scanURL = `${frontendURL}/scan?roomId=${room.id}&qr=${encodeURIComponent(qrCode)}`;

      console.log(`✅ Sala criada com sucesso: ${room.name} (ID: ${room.id})`);
      console.log(`✅ QR Code URL: ${scanURL}`);

      return res.status(201).json({
        success: true,
        message: "Ambiente criado com sucesso",
        room,
        qrCode: room.qrCode,
        qrImage: qrData?.qrImage || null,
        qrURL: scanURL,
        scanUrl: `/scan?roomId=${room.id}&qr=${encodeURIComponent(room.qrCode)}`,
        generatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error("🔥 createRoom error:", error);

      if (String(error?.code) === "P2002") {
        return res.status(409).json({
          success: false,
          message: "Já existe um ambiente com esse QR Code",
        });
      }

      return res.status(500).json({ 
        success: false, 
        message: "Erro ao criar ambiente",
        error: error.message 
      });
    }
  },

  // ✅ ADMIN: atualizar ambiente
  async updateRoom(req, res) {
    try {
      const { id } = req.params;
      const body = req.body || {};

      console.log(`✏️  Atualizando sala ID: ${id}`);

      const data = {
        name: body.name !== undefined ? String(body.name).trim() : undefined,
        type: body.type !== undefined ? String(body.type).trim() : undefined,
        location: body.location !== undefined ? String(body.location).trim() : undefined,
        description: body.description !== undefined ? (body.description ? String(body.description) : null) : undefined,
        priority: body.priority !== undefined ? String(body.priority) : undefined,
        notes: body.notes !== undefined ? (body.notes ? String(body.notes) : null) : undefined,
        status: body.status !== undefined ? String(body.status) : undefined,
        nextCleaning: body.nextCleaning !== undefined ? (body.nextCleaning ? new Date(body.nextCleaning) : null) : undefined,
      };

      if (body.qrCode !== undefined && String(body.qrCode).trim()) {
        data.qrCode = String(body.qrCode).trim();
      }

      if (body.generateNewQR === true) {
        const room = await prisma.room.findUnique({ where: { id } });
        if (room) {
          data.qrCode = await generateUniqueQrCode({
            type: room.type,
            name: room.name,
            location: room.location
          });
          console.log(`🔳 Novo QR Code gerado: ${data.qrCode}`);
        }
      }

      const room = await prisma.room.update({
        where: { id },
        data,
      });

      console.log(`✅ Sala atualizada: ${room.name}`);

      const frontendURL = process.env.FRONTEND_URL || 'https://gest-o-de-limpeza.onrender.com';
      const qrURL = room.qrCode ? `${frontendURL}/scan?roomId=${room.id}&qr=${encodeURIComponent(room.qrCode)}` : null;

      return res.json({ 
        success: true, 
        message: "Ambiente atualizado", 
        room,
        qrInfo: {
          hasQRCode: !!(room.qrCode && room.qrCode.trim() !== ''),
          scanUrl: room.qrCode ? `/api/rooms/qr/${encodeURIComponent(room.qrCode)}` : null,
          qrURL: qrURL
        }
      });
    } catch (error) {
      console.error("🔥 updateRoom error:", error);

      if (String(error?.code) === "P2025") {
        return res.status(404).json({ success: false, message: "Ambiente não encontrado" });
      }

      if (String(error?.code) === "P2002") {
        return res.status(409).json({ success: false, message: "QR Code já está em uso" });
      }

      return res.status(500).json({ 
        success: false, 
        message: "Erro ao atualizar ambiente",
        error: error.message 
      });
    }
  },

  // ✅ ADMIN: deletar ambiente
  async deleteRoom(req, res) {
    try {
      const { id } = req.params;

      console.log(`🗑️  Deletando sala ID: ${id}`);

      const room = await prisma.room.findUnique({
        where: { id },
        include: {
          _count: {
            select: { cleaningRecords: true }
          }
        }
      });

      if (!room) {
        return res.status(404).json({ 
          success: false, 
          message: "Ambiente não encontrado" 
        });
      }

      console.log(`⚠️  Sala "${room.name}" tem ${room._count.cleaningRecords} registros de limpeza`);

      await prisma.cleaningRecord.deleteMany({ where: { roomId: id } });
      await prisma.room.delete({ where: { id } });

      console.log(`✅ Sala "${room.name}" deletada com sucesso`);

      return res.json({ 
        success: true, 
        message: "Ambiente excluído com sucesso",
        deleted: {
          room: room.name,
          cleaningRecords: room._count.cleaningRecords,
          qrCode: room.qrCode
        }
      });
    } catch (error) {
      console.error("🔥 deleteRoom error:", error);

      if (String(error?.code) === "P2025") {
        return res.status(404).json({ success: false, message: "Ambiente não encontrado" });
      }

      return res.status(500).json({ 
        success: false, 
        message: "Erro ao excluir ambiente",
        error: error.message 
      });
    }
  },

  // ✅ WORKER (público): ambientes disponíveis pra limpar
  async getAvailableRooms(req, res) {
    try {
      const rooms = await prisma.room.findMany({
        where: { status: { in: ["PENDING", "NEEDS_ATTENTION"] } },
        orderBy: [{ priority: "desc" }, { updatedAt: "desc" }],
      });

      const frontendURL = process.env.FRONTEND_URL || 'https://gest-o-de-limpeza.onrender.com';
      const roomsWithQR = rooms.map(room => ({
        ...room,
        hasQRCode: !!(room.qrCode && room.qrCode.trim() !== ''),
        scanUrl: room.qrCode ? `/api/rooms/qr/${encodeURIComponent(room.qrCode)}` : null,
        qrURL: room.qrCode ? `${frontendURL}/scan?roomId=${room.id}&qr=${encodeURIComponent(room.qrCode)}` : null
      }));

      console.log(`📊 ${rooms.length} salas disponíveis para limpeza`);

      return res.json({ 
        success: true, 
        rooms: roomsWithQR,
        count: rooms.length
      });
    } catch (error) {
      console.error("🔥 getAvailableRooms error:", error);
      return res.status(500).json({ 
        success: false, 
        message: "Erro ao buscar ambientes disponíveis",
        error: error.message 
      });
    }
  },

  // ✅ ADMIN: stats - VERSÃO CORRIGIDA DEFINITIVA
  async getRoomStats(req, res) {
    try {
      const [total, pending, inProgress, completed, attention] = await Promise.all([
        prisma.room.count(),
        prisma.room.count({ where: { status: "PENDING" } }),
        prisma.room.count({ where: { status: "IN_PROGRESS" } }),
        prisma.room.count({ where: { status: "COMPLETED" } }),
        prisma.room.count({ where: { status: "NEEDS_ATTENTION" } }),
      ]);

      // ✅ MÉTODO SIMPLES E CONFIÁVEL - Busca todas as salas e filtra no JavaScript
      const allRooms = await prisma.room.findMany({
        select: { qrCode: true }
      });

      const withQR = allRooms.filter(r => r.qrCode && r.qrCode.trim() !== '').length;
      const withoutQR = allRooms.length - withQR;

      return res.json({
        success: true,
        stats: { 
          total, 
          pending, 
          inProgress, 
          completed, 
          attention,
          withQR,
          withoutQR,
          qrCoverage: total > 0 ? Math.round((withQR / total) * 100) : 0
        },
        generatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error("🔥 getRoomStats error:", error);
      return res.status(500).json({ 
        success: false, 
        message: "Erro ao buscar estatísticas",
        error: error.message 
      });
    }
  },

  // ✅ GERAR QR CODES PARA TODAS AS SALAS (COM URL)
  async generateAllQRCodes(req, res) {
    try {
      console.log('🔳 Iniciando geração de QR Codes para todas as salas');

      const rooms = await prisma.room.findMany({
        select: {
          id: true,
          name: true,
          type: true,
          location: true,
          qrCode: true
        }
      });

      const results = {
        generated: [],
        alreadyHave: [],
        failed: []
      };

      const frontendURL = process.env.FRONTEND_URL || 'https://gest-o-de-limpeza.onrender.com';

      for (const room of rooms) {
        try {
          if (room.qrCode && room.qrCode.trim() !== '') {
            const qrURL = `${frontendURL}/scan?roomId=${room.id}&qr=${encodeURIComponent(room.qrCode)}`;
            results.alreadyHave.push({
              id: room.id,
              name: room.name,
              qrCode: room.qrCode,
              qrURL: qrURL
            });
            continue;
          }

          const newQRCode = await generateUniqueQrCode({
            type: room.type,
            name: room.name,
            location: room.location
          });

          const qrURL = `${frontendURL}/scan?roomId=${room.id}&qr=${encodeURIComponent(newQRCode)}`;

          await prisma.room.update({
            where: { id: room.id },
            data: { qrCode: newQRCode }
          });

          results.generated.push({
            id: room.id,
            name: room.name,
            qrCode: newQRCode,
            qrURL: qrURL
          });

          console.log(`✅ QR Code gerado para ${room.name}: ${newQRCode}`);
          console.log(`🔗 URL: ${qrURL}`);
        } catch (roomError) {
          console.error(`🔥 Erro ao gerar QR para ${room.name}:`, roomError);
          results.failed.push({
            id: room.id,
            name: room.name,
            error: roomError.message
          });
        }
      }

      return res.json({
        success: true,
        message: `QR Codes gerados: ${results.generated.length} novos, ${results.alreadyHave.length} já tinham, ${results.failed.length} falhas`,
        results,
        summary: {
          totalRooms: rooms.length,
          generated: results.generated.length,
          alreadyHave: results.alreadyHave.length,
          failed: results.failed.length,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('🔥 Erro ao gerar QR Codes para todas as salas:', error);
      return res.status(500).json({
        success: false,
        message: 'Erro ao gerar QR Codes',
        error: error.message
      });
    }
  },

  // ✅ VERIFICAR QR CODE DE UMA SALA
  async getRoomQRStatus(req, res) {
    try {
      const { id } = req.params;

      const room = await prisma.room.findUnique({
        where: { id },
        select: {
          id: true,
          name: true,
          qrCode: true,
          type: true,
          location: true
        }
      });

      if (!room) {
        return res.status(404).json({
          success: false,
          message: 'Sala não encontrada'
        });
      }

      const hasQR = !!(room.qrCode && room.qrCode.trim() !== '');
      
      const frontendURL = process.env.FRONTEND_URL || 'https://gest-o-de-limpeza.onrender.com';
      const qrURL = hasQR ? `${frontendURL}/scan?roomId=${room.id}&qr=${encodeURIComponent(room.qrCode)}` : null;

      let qrData = null;
      if (hasQR) {
        qrData = {
          type: 'ROOM',
          roomId: room.id,
          roomName: room.name,
          roomType: room.type,
          location: room.location,
          qrCode: room.qrCode,
          qrURL: qrURL,
          scanUrl: `/api/rooms/qr/${encodeURIComponent(room.qrCode)}`,
          downloadUrl: `/api/qr/download/${room.id}`
        };
      }

      return res.json({
        success: true,
        data: {
          room: {
            id: room.id,
            name: room.name,
            type: room.type,
            location: room.location
          },
          qr: {
            hasQRCode: hasQR,
            code: room.qrCode,
            status: hasQR ? 'ACTIVE' : 'MISSING',
            needsGeneration: !hasQR,
            qrURL: qrURL
          },
          qrData,
          actions: {
            canGenerate: !hasQR,
            canDownload: hasQR,
            canScan: hasQR,
            canRegenerate: hasQR
          }
        }
      });
    } catch (error) {
      console.error('🔥 Erro ao verificar status do QR Code:', error);
      return res.status(500).json({
        success: false,
        message: 'Erro ao verificar QR Code',
        error: error.message
      });
    }
  }
};

module.exports = roomController;