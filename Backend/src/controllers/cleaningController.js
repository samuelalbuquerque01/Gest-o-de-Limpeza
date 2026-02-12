// src/controllers/cleaningController.js - VERSÃO CORRIGIDA DEFINITIVA
const prisma = require('../utils/database'); // ✅ SINGLETON - NUNCA new PrismaClient()!

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

// ======================================================================
// ✅ CHECKLISTS CENTRALIZADOS
// ======================================================================
const CHECKLISTS = {
  ROOM: [
    { id: "floor", label: "Aspirar/limpar chão" },
    { id: "furniture", label: "Limpar móveis" },
    { id: "trash", label: "Esvaziar lixeiras" },
    { id: "windows", label: "Limpar janelas" },
    { id: "lights", label: "Verificar lâmpadas" }
  ],
  BATHROOM: [
    { id: "toilet", label: "Limpar vaso sanitário" },
    { id: "sink", label: "Limpar pia" },
    { id: "mirror", label: "Limpar espelho" },
    { id: "floor", label: "Limpar chão" },
    { id: "soap", label: "Repor sabonete" },
    { id: "paper", label: "Repor papel" }
  ],
  KITCHEN: [
    { id: "counter", label: "Limpar bancadas" },
    { id: "sink", label: "Limpar pia" },
    { id: "appliances", label: "Limpar eletrodomésticos" },
    { id: "trash", label: "Esvaziar lixo" },
    { id: "floor", label: "Limpar chão" }
  ],
  MEETING_ROOM: [
    { id: "floor", label: "Aspirar chão" },
    { id: "table", label: "Limpar mesa" },
    { id: "chairs", label: "Limpar cadeiras" },
    { id: "trash", label: "Esvaziar lixeiras" },
    { id: "whiteboard", label: "Limpar quadro" }
  ]
};

function validateChecklist(roomType, checklist) {
  if (!checklist || typeof checklist !== 'object') {
    throw new Error('Checklist é obrigatório');
  }

  const requiredItems = CHECKLISTS[roomType] || CHECKLISTS.ROOM;
  const totalRequired = requiredItems.length;
  
  const completedItems = Object.values(checklist).filter(Boolean).length;
  
  console.log(`📋 Validação de checklist - Sala: ${roomType}, Completados: ${completedItems}/${totalRequired}`);
  
  if (completedItems < totalRequired) {
    throw new Error(`Checklist incompleto: ${completedItems}/${totalRequired} itens. Complete todos os itens obrigatórios.`);
  }
  
  const missingItems = requiredItems.filter(item => !checklist[item.id]);
  if (missingItems.length > 0) {
    const missingNames = missingItems.map(i => i.label).join(', ');
    throw new Error(`Itens não marcados: ${missingNames}`);
  }
  
  return true;
}

const cleaningController = {
  /**
   * Iniciar limpeza
   */
  startCleaning: async (req, res) => {
    try {
      const { roomId } = req.body;
      const cleanerId = req.body.cleanerId || req.user?.id;

      console.log('🧹 Iniciando limpeza:', { roomId, cleanerId });

      if (!roomId) {
        return res.status(400).json({ success: false, message: 'ID da sala é obrigatório' });
      }
      if (!cleanerId) {
        return res.status(401).json({ success: false, message: 'Usuário não autenticado' });
      }

      const cleaner = await prisma.user.findFirst({
        where: { id: cleanerId, role: 'CLEANER', status: 'ACTIVE' },
        select: { id: true, name: true, role: true, status: true }
      });

      if (!cleaner) {
        return res.status(404).json({ success: false, message: 'Funcionário não encontrado ou inativo' });
      }

      const room = await prisma.room.findUnique({ where: { id: roomId } });
      if (!room) {
        return res.status(404).json({ success: false, message: 'Sala não encontrada' });
      }

      if (room.status === 'IN_PROGRESS') {
        return res.status(409).json({ success: false, message: 'Esta sala já está sendo limpa' });
      }

      const activeCleaning = await prisma.cleaningRecord.findFirst({
        where: { cleanerId, status: 'IN_PROGRESS' },
        include: { room: { select: { id: true, name: true, type: true, location: true } } }
      });

      if (activeCleaning) {
        return res.status(409).json({
          success: false,
          message: 'Você já está limpando outra sala. Finalize/cancele primeiro.',
          activeCleaning
        });
      }

      await prisma.room.update({
        where: { id: roomId },
        data: { status: 'IN_PROGRESS' }
      });

      const record = await prisma.cleaningRecord.create({
        data: {
          roomId,
          cleanerId,
          status: 'IN_PROGRESS',
          startedAt: new Date()
        },
        include: {
          room: { select: { id: true, name: true, type: true, location: true } },
          cleaner: { select: { id: true, name: true } }
        }
      });

      return res.status(201).json({
        success: true,
        message: 'Limpeza iniciada com sucesso',
        record
      });
    } catch (error) {
      console.error('🔥 Erro ao iniciar limpeza:', error);
      return res.status(500).json({ success: false, message: 'Erro ao iniciar limpeza' });
    }
  },

  /**
   * Concluir limpeza
   */
  completeCleaning: async (req, res) => {
    try {
      const { recordId, checklist, notes, needsAttention } = req.body;
      const userId = req.user?.id;

      console.log('✅ Concluindo limpeza:', recordId, 'user:', userId);

      if (!recordId) {
        return res.status(400).json({ success: false, message: 'ID do registro é obrigatório' });
      }
      if (!userId) {
        return res.status(401).json({ success: false, message: 'Usuário não autenticado' });
      }

      const record = await prisma.cleaningRecord.findUnique({
        where: { id: recordId },
        include: { room: true }
      });

      if (!record) {
        return res.status(404).json({ success: false, message: 'Registro de limpeza não encontrado' });
      }

      if (req.user.role === 'CLEANER' && record.cleanerId !== userId) {
        return res.status(403).json({ success: false, message: 'Sem permissão para concluir esta limpeza' });
      }

      if (record.status === 'COMPLETED') {
        return res.status(409).json({ success: false, message: 'Esta limpeza já foi concluída' });
      }

      try {
        validateChecklist(record.room.type, checklist);
      } catch (validationError) {
        return res.status(400).json({
          success: false,
          message: validationError.message,
          required: CHECKLISTS[record.room.type] || CHECKLISTS.ROOM
        });
      }

      const completedAt = new Date();

      const updatedRecord = await prisma.cleaningRecord.update({
        where: { id: recordId },
        data: {
          status: 'COMPLETED',
          checklist: checklist || {},
          notes: notes || null,
          completedAt
        },
        include: {
          room: { select: { id: true, name: true, type: true, location: true } },
          cleaner: { select: { id: true, name: true } }
        }
      });

      await prisma.room.update({
        where: { id: record.roomId },
        data: {
          status: needsAttention ? 'NEEDS_ATTENTION' : 'PENDING',
          lastCleaned: completedAt
        }
      });

      return res.json({
        success: true,
        message: 'Limpeza concluída com sucesso',
        record: updatedRecord,
        validation: {
          completedItems: Object.values(checklist || {}).filter(Boolean).length,
          totalItems: (CHECKLISTS[record.room.type] || CHECKLISTS.ROOM).length
        }
      });
    } catch (error) {
      console.error('🔥 Erro ao concluir limpeza:', error);
      return res.status(500).json({ success: false, message: 'Erro ao concluir limpeza' });
    }
  },

  /**
   * Cancelar limpeza
   */
  cancelCleaning: async (req, res) => {
    try {
      const { recordId, notes } = req.body;
      const userId = req.user?.id;

      console.log('❌ Cancelando limpeza:', recordId, 'user:', userId);

      if (!recordId) {
        return res.status(400).json({ success: false, message: 'ID do registro é obrigatório' });
      }
      if (!userId) {
        return res.status(401).json({ success: false, message: 'Usuário não autenticado' });
      }

      const record = await prisma.cleaningRecord.findUnique({
        where: { id: recordId },
        include: { room: true }
      });

      if (!record) {
        return res.status(404).json({ success: false, message: 'Registro não encontrado' });
      }

      if (req.user.role === 'CLEANER' && record.cleanerId !== userId) {
        return res.status(403).json({ success: false, message: 'Sem permissão para cancelar esta limpeza' });
      }

      if (record.status !== 'IN_PROGRESS') {
        return res.status(400).json({ success: false, message: 'Só é possível cancelar limpezas em andamento' });
      }

      await prisma.cleaningRecord.update({
        where: { id: recordId },
        data: {
          status: 'CANCELLED',
          completedAt: new Date(),
          notes: notes || 'Limpeza cancelada pelo funcionário'
        }
      });

      await prisma.room.update({
        where: { id: record.roomId },
        data: { status: 'PENDING' }
      });

      return res.json({ success: true, message: 'Limpeza cancelada com sucesso' });
    } catch (error) {
      console.error('🔥 Erro ao cancelar limpeza:', error);
      return res.status(500).json({ success: false, message: 'Erro ao cancelar limpeza' });
    }
  },

  /**
   * MINHAS limpezas de hoje
   */
  getMyTodayCleanings: async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ success: false, message: 'Usuário não autenticado' });

      const today = startOfToday();

      const records = await prisma.cleaningRecord.findMany({
        where: {
          cleanerId: userId,
          createdAt: { gte: today },
          status: { in: ['COMPLETED', 'IN_PROGRESS', 'CANCELLED'] }
        },
        include: {
          room: { select: { id: true, name: true, type: true, location: true } }
        },
        orderBy: { createdAt: 'desc' }
      });

      const cleanings = records.map((r) => ({
        id: r.id,
        roomId: r.roomId,
        room: r.room,
        roomType: r.room?.type,
        location: r.room?.location,
        cleanerId: r.cleanerId,
        status: r.status,
        startedAt: r.startedAt,
        completedAt: r.completedAt,
        notes: r.notes,
        checklist: r.checklist,
        completionRate: r.checklist ? 
          Math.round((Object.values(r.checklist).filter(Boolean).length / 
            (CHECKLISTS[r.room?.type]?.length || CHECKLISTS.ROOM.length)) * 100) : 0
      }));

      return res.json({ success: true, cleanings, count: cleanings.length });
    } catch (error) {
      console.error('🔥 Erro em getMyTodayCleanings:', error);
      return res.status(500).json({ success: false, message: 'Erro ao buscar suas limpezas de hoje' });
    }
  },

  /**
   * MINHA limpeza ativa
   */
  getMyActiveCleaning: async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ success: false, message: 'Usuário não autenticado' });

      const active = await prisma.cleaningRecord.findFirst({
        where: { cleanerId: userId, status: 'IN_PROGRESS' },
        include: {
          room: { select: { id: true, name: true, type: true, location: true } }
        },
        orderBy: { startedAt: 'desc' }
      });

      return res.json({ success: true, active: active || null });
    } catch (error) {
      console.error('🔥 Erro em getMyActiveCleaning:', error);
      return res.status(500).json({ success: false, message: 'Erro ao buscar limpeza ativa' });
    }
  },

  /**
   * GET /api/cleaning/today
   */
  getTodayCleanings: async (req, res) => {
    try {
      const today = startOfToday();

      const cleanings = await prisma.cleaningRecord.findMany({
        where: {
          createdAt: { gte: today },
          status: { in: ['COMPLETED', 'IN_PROGRESS', 'CANCELLED'] }
        },
        include: {
          room: { select: { id: true, name: true, type: true, location: true } },
          cleaner: { select: { id: true, name: true } }
        },
        orderBy: { createdAt: 'desc' }
      });

      const formatted = cleanings.map((c) => ({
        id: c.id,
        room: c.room,
        roomType: c.room?.type,
        location: c.room?.location,
        cleaner: c.cleaner?.name,
        cleanerId: c.cleanerId,
        status: c.status,
        startedAt: c.startedAt,
        completedAt: c.completedAt
      }));

      return res.json({ success: true, cleanings: formatted, count: formatted.length });
    } catch (error) {
      console.error('🔥 Erro ao buscar limpezas de hoje:', error);
      return res.status(500).json({ success: false, message: 'Erro ao buscar limpezas' });
    }
  },

  getRecentCleanings: async (req, res) => {
    try {
      const limit = Math.min(parseInt(req.query.limit || '15', 10), 100);

      const records = await prisma.cleaningRecord.findMany({
        where: { status: 'COMPLETED' },
        include: {
          room: { select: { id: true, name: true, type: true, location: true } },
          cleaner: { select: { id: true, name: true } }
        },
        orderBy: { completedAt: 'desc' },
        take: limit
      });

      res.json({ success: true, data: records, count: records.length });
    } catch (error) {
      console.error('🔥 Erro ao buscar limpezas recentes:', error);
      res.status(500).json({ success: false, message: 'Erro ao buscar limpezas recentes' });
    }
  },

  getCleaningHistory: async (req, res) => {
    try {
      const page = parseInt(req.query.page || '1', 10);
      const limit = Math.min(parseInt(req.query.limit || '20', 10), 200);
      const skip = (page - 1) * limit;

      const status = req.query.status;
      const includeCancelled = req.query.includeCancelled === 'true';

      const where = {};
      if (!includeCancelled) where.status = { not: 'CANCELLED' };
      if (status && status !== 'ALL') where.status = status;

      const [records, total] = await Promise.all([
        prisma.cleaningRecord.findMany({
          where,
          include: {
            room: { select: { id: true, name: true, type: true, location: true } },
            cleaner: { select: { id: true, name: true } }
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit
        }),
        prisma.cleaningRecord.count({ where })
      ]);

      res.json({
        success: true,
        data: records,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) }
      });
    } catch (error) {
      console.error('🔥 Erro ao listar histórico:', error);
      res.status(500).json({ success: false, message: 'Erro ao listar histórico' });
    }
  },

  getActiveCleanings: async (req, res) => {
    try {
      const activeCleanings = await prisma.cleaningRecord.findMany({
        where: { status: 'IN_PROGRESS' },
        include: {
          room: { select: { id: true, name: true, type: true, location: true } },
          cleaner: { select: { id: true, name: true } }
        },
        orderBy: { startedAt: 'asc' }
      });

      res.json({ success: true, data: activeCleanings, count: activeCleanings.length });
    } catch (error) {
      console.error('🔥 Erro ao listar limpezas ativas:', error);
      res.status(500).json({ success: false, message: 'Erro ao listar limpezas ativas' });
    }
  },

  getCleaningStats: async (req, res) => {
    try {
      const today = startOfToday();

      const [total, completedToday, inProgress, totalCleaners] = await Promise.all([
        prisma.cleaningRecord.count(),
        prisma.cleaningRecord.count({ where: { createdAt: { gte: today }, status: 'COMPLETED' } }),
        prisma.cleaningRecord.count({ where: { status: 'IN_PROGRESS' } }),
        prisma.user.count({ where: { role: 'CLEANER', status: 'ACTIVE' } })
      ]);

      res.json({
        success: true,
        stats: {
          total,
          completedToday,
          inProgress,
          totalCleaners,
          completionRate: total > 0 ? Math.round((completedToday / total) * 100) : 0
        }
      });
    } catch (error) {
      console.error('🔥 Erro ao obter estatísticas:', error);
      res.status(500).json({ success: false, message: 'Erro ao obter estatísticas' });
    }
  }
};

module.exports = cleaningController;