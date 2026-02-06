// src/controllers/cleaningController.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

const cleaningController = {
  /**
   * Iniciar limpeza (CLEANER logado)
   * - usa cleanerId do token se não vier no body
   */
  startCleaning: async (req, res) => {
    try {
      const { roomId } = req.body;
      const cleanerId = req.body.cleanerId || req.user?.id;

      console.log('🧹 Iniciando limpeza:', { roomId, cleanerId });

      // ✅ CORREÇÃO: Remova o tratamento de roomId como objeto
      if (!roomId) {
        return res.status(400).json({ success: false, message: 'ID da sala é obrigatório' });
      }
      if (!cleanerId) {
        return res.status(401).json({ success: false, message: 'Usuário não autenticado' });
      }

      // Verificar se funcionário existe e está ativo
      const cleaner = await prisma.user.findFirst({
        where: { id: cleanerId, role: 'CLEANER', status: 'ACTIVE' },
        select: { id: true, name: true, role: true, status: true }
      });

      if (!cleaner) {
        return res.status(404).json({ success: false, message: 'Funcionário não encontrado ou inativo' });
      }

      // Verificar se sala existe
      const room = await prisma.room.findUnique({ where: { id: roomId } });
      if (!room) {
        return res.status(404).json({ success: false, message: 'Sala não encontrada' });
      }

      // Se sala já está em limpeza
      if (room.status === 'IN_PROGRESS') {
        return res.status(409).json({ success: false, message: 'Esta sala já está sendo limpa' });
      }

      // Verificar se funcionário já está limpando outra sala
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

      // Atualiza sala
      await prisma.room.update({
        where: { id: roomId },
        data: { status: 'IN_PROGRESS' }
      });

      // Cria registro
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
   * Concluir limpeza (CLEANER logado)
   * - só o dono do registro pode concluir
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

      // Se for CLEANER, só pode mexer no próprio
      if (req.user.role === 'CLEANER' && record.cleanerId !== userId) {
        return res.status(403).json({ success: false, message: 'Sem permissão para concluir esta limpeza' });
      }

      if (record.status === 'COMPLETED') {
        return res.status(409).json({ success: false, message: 'Esta limpeza já foi concluída' });
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
        record: updatedRecord
      });
    } catch (error) {
      console.error('🔥 Erro ao concluir limpeza:', error);
      return res.status(500).json({ success: false, message: 'Erro ao concluir limpeza' });
    }
  },

  /**
   * Cancelar limpeza (CLEANER logado)
   * - só o dono do registro pode cancelar
   */
  cancelCleaning: async (req, res) => {
    try {
      const { recordId } = req.body;
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
          notes: 'Limpeza cancelada pelo funcionário'
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
   * ✅ MINHAS limpezas de hoje (CLEANER logado)
   * GET /api/cleaning/my/today
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

      // formato amigável pro seu WorkerInterface
      const cleanings = records.map((r) => ({
        id: r.id,
        roomId: r.roomId,
        room: r.room, // objeto
        roomType: r.room?.type,
        location: r.room?.location,
        cleanerId: r.cleanerId,
        status: r.status,
        startedAt: r.startedAt,
        completedAt: r.completedAt,
        notes: r.notes,
        checklist: r.checklist
      }));

      return res.json({ success: true, cleanings, count: cleanings.length });
    } catch (error) {
      console.error('🔥 Erro em getMyTodayCleanings:', error);
      return res.status(500).json({ success: false, message: 'Erro ao buscar suas limpezas de hoje' });
    }
  },

  /**
   * ✅ MINHA limpeza ativa (CLEANER logado)
   * GET /api/cleaning/my/active
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
   * (mantive o seu)
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
        room: c.room, // objeto
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

  // ====== abaixo mantive do seu controller (history/active/recent/stats) ======

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