// src/controllers/roomController.js - CÓDIGO COMPLETO CORRIGIDO
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
  
  // Tenta até 10 vezes gerar um QR Code único
  for (let i = 0; i < 10; i++) {
    const rnd = crypto.randomBytes(3).toString("hex").toUpperCase(); // 6 chars
    const code = `${base}-${rnd}`;
    
    // Verifica se já existe no banco
    const exists = await prisma.room.findUnique({ 
      where: { qrCode: code } 
    });
    
    if (!exists) return code;
  }
  
  // Se não conseguir em 10 tentativas, gera com timestamp
  const timestamp = Date.now().toString(36).toUpperCase();
  return `${base}-${timestamp}`.slice(0, 50);
}

/**
 * ✅ GERAR IMAGEM DO QR CODE (FUNÇÃO AUXILIAR NOVA)
 */
async function generateQRImage(qrCode, roomData) {
  try {
    const qrData = {
      type: 'ROOM',
      roomId: roomData.id,
      roomName: roomData.name,
      roomType: roomData.type,
      location: roomData.location,
      qrCode: qrCode,
      timestamp: Date.now(),
      system: 'Neuropsicocentro Cleaning System'
    };

    const qrImage = await QRCode.toDataURL(JSON.stringify(qrData), {
      errorCorrectionLevel: 'H',
      margin: 2,
      width: 300,
      color: {
        dark: '#1976d2',
        light: '#ffffff'
      }
    });

    return qrImage;
  } catch (error) {
    console.error('🔥 Erro ao gerar imagem do QR:', error);
    return null;
  }
}

const roomController = {
  // ✅ ESCANEAR QR CODE (WORKER)
  // GET /api/rooms/qr/:qrCode
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
      const room = await prisma.room.findUnique({
        where: { qrCode: decodedQR },
      });

      if (!room) {
        console.log(`❌ QR Code não encontrado: ${decodedQR}`);
        return res.status(404).json({ 
          success: false, 
          message: 'Ambiente não encontrado com este QR Code' 
        });
      }

      console.log(`✅ Sala encontrada: ${room.name} (ID: ${room.id})`);

      // Verificar se há limpeza em andamento nesta sala hoje
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const activeCleaning = await prisma.cleaningRecord.findFirst({
        where: {
          roomId: room.id,
          status: 'IN_PROGRESS',
          startedAt: {
            gte: today
          }
        },
        include: {
          cleaner: {
            select: { id: true, name: true, email: true }
          }
        }
      });

      console.log(`📊 Status da sala: ${room.status}, Limpeza ativa: ${!!activeCleaning}`);

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

  // ✅ GERAR NOVO QR CODE PARA UMA SALA
  // POST /api/rooms/:id/generate-qr
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

      // Gerar novo QR Code único
      const newQRCode = await generateUniqueQrCode({
        type: room.type,
        name: room.name,
        location: room.location
      });

      console.log(`✅ Novo QR Code gerado: ${newQRCode}`);

      // Atualizar sala com novo QR Code
      const updatedRoom = await prisma.room.update({
        where: { id },
        data: { qrCode: newQRCode },
      });

      let qrImage = null;
      if (generateImage) {
        qrImage = await generateQRImage(newQRCode, updatedRoom);
      }

      return res.json({
        success: true,
        message: 'Novo QR Code gerado com sucesso',
        qrCode: updatedRoom.qrCode,
        qrImage: qrImage,
        room: updatedRoom,
        scanUrl: `/api/rooms/qr/${encodeURIComponent(newQRCode)}`,
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
      
      // Filtrar por salas com/sem QR Code
      if (hasQR === "true") {
        where.qrCode = { not: null };
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

      // Adicionar informações sobre QR Code
      const roomsWithQRInfo = rooms.map(room => ({
        ...room,
        hasQRCode: !!(room.qrCode && room.qrCode.trim() !== ''),
        qrStatus: room.qrCode && room.qrCode.trim() !== '' ? 'ACTIVE' : 'MISSING',
        scanUrl: room.qrCode ? `/api/rooms/qr/${encodeURIComponent(room.qrCode)}` : null
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

  // ✅ PUBLIC (worker e admin): pegar ambiente por id
  async getRoomById(req, res) {
    try {
      const { id } = req.params;
      const room = await prisma.room.findUnique({ 
        where: { id },
        include: {
          cleaningRecords: {
            take: 5,
            orderBy: { createdAt: 'desc' },
            include: {
              cleaner: {
                select: { id: true, name: true }
              }
            }
          }
        }
      });
      
      if (!room) return res.status(404).json({ 
        success: false, 
        message: "Ambiente não encontrado" 
      });
      
      // Adicionar informações de QR Code
      const roomWithQRInfo = {
        ...room,
        hasQRCode: !!(room.qrCode && room.qrCode.trim() !== ''),
        qrStatus: room.qrCode && room.qrCode.trim() !== '' ? 'ACTIVE' : 'MISSING',
        scanUrl: room.qrCode ? `/api/rooms/qr/${encodeURIComponent(room.qrCode)}` : null,
        qrInfo: {
          generated: !!room.qrCode,
          code: room.qrCode,
          canGenerate: !room.qrCode
        }
      };
      
      return res.json({ 
        success: true, 
        room: roomWithQRInfo 
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

  // ✅ ADMIN: criar ambiente COM QR CODE AUTOMÁTICO E IMAGEM
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

      // ✅ Gera QR Code único automaticamente
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

      // ✅ GERA IMAGEM DO QR CODE AUTOMATICAMENTE
      const qrImage = await generateQRImage(qrCode, {
        id: room.id,
        name: room.name,
        type: room.type,
        location: room.location
      });

      console.log(`✅ Sala criada com sucesso: ${room.name} (ID: ${room.id})`);
      console.log(`✅ QR Code IMAGEM gerada: ${qrImage ? 'Sim' : 'Não'}`);

      return res.status(201).json({
        success: true,
        message: "Ambiente criado com sucesso",
        room,
        qrCode: room.qrCode,
        qrImage: qrImage, // ✅ AGORA RETORNA A IMAGEM DO QR CODE
        scanUrl: `/api/rooms/qr/${encodeURIComponent(room.qrCode)}`,
        downloadUrl: `/api/qr/download/${room.id}`,
        generatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error("🔥 createRoom error:", error);

      // Erro de QR Code duplicado
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

      // Atualiza QR Code apenas se fornecido e não vazio
      if (body.qrCode !== undefined && String(body.qrCode).trim()) {
        data.qrCode = String(body.qrCode).trim();
      }

      // Se solicitado, gerar novo QR Code
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

      return res.json({ 
        success: true, 
        message: "Ambiente atualizado", 
        room,
        qrInfo: {
          hasQRCode: !!(room.qrCode && room.qrCode.trim() !== ''),
          scanUrl: room.qrCode ? `/api/rooms/qr/${encodeURIComponent(room.qrCode)}` : null
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

      // Verificar se a sala existe
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

      // Deletar registros primeiro (pra não quebrar FK)
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

      // Adicionar informações de QR Code
      const roomsWithQR = rooms.map(room => ({
        ...room,
        hasQRCode: !!(room.qrCode && room.qrCode.trim() !== ''),
        scanUrl: room.qrCode ? `/api/rooms/qr/${encodeURIComponent(room.qrCode)}` : null
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

  // ✅ ADMIN: stats CORRIGIDO
  async getRoomStats(req, res) {
    try {
      const [total, pending, inProgress, completed, attention] = await Promise.all([
        prisma.room.count(),
        prisma.room.count({ where: { status: "PENDING" } }),
        prisma.room.count({ where: { status: "IN_PROGRESS" } }),
        prisma.room.count({ where: { status: "COMPLETED" } }),
        prisma.room.count({ where: { status: "NEEDS_ATTENTION" } }),
      ]);

      // ✅ CORREÇÃO: Conta salas COM QR Code (não nulo e não vazio)
      const withQR = await prisma.room.count({ 
        where: { 
          AND: [
            { qrCode: { not: null } },
            { qrCode: { not: "" } }
          ]
        } 
      });

      // ✅ CORREÇÃO: Conta salas SEM QR Code (nulo ou vazio)
      const withoutQR = await prisma.room.count({ 
        where: { 
          OR: [
            { qrCode: null },
            { qrCode: "" }
          ]
        } 
      });

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

  // ✅ GERAR QR CODES PARA TODAS AS SALAS (ADMIN)
  // POST /api/rooms/generate-all-qr
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

      for (const room of rooms) {
        try {
          if (room.qrCode && room.qrCode.trim() !== '') {
            results.alreadyHave.push({
              id: room.id,
              name: room.name,
              qrCode: room.qrCode
            });
            continue;
          }

          const newQRCode = await generateUniqueQrCode({
            type: room.type,
            name: room.name,
            location: room.location
          });

          await prisma.room.update({
            where: { id: room.id },
            data: { qrCode: newQRCode }
          });

          results.generated.push({
            id: room.id,
            name: room.name,
            qrCode: newQRCode
          });

          console.log(`✅ QR Code gerado para ${room.name}: ${newQRCode}`);
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
  // GET /api/rooms/:id/qr-status
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
      
      let qrData = null;
      if (hasQR) {
        qrData = {
          type: 'ROOM',
          roomId: room.id,
          roomName: room.name,
          roomType: room.type,
          location: room.location,
          qrCode: room.qrCode,
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
            needsGeneration: !hasQR
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