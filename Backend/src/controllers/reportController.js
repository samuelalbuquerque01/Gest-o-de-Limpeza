// Backend/src/controllers/reportController.js
const prisma = require('../utils/database');

function toDateOrNull(v) {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

function toCsv(rows) {
  const escape = (val) => {
    const s = String(val ?? '');
    if (s.includes('"') || s.includes(',') || s.includes('\n')) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };

  const header = [
    'id',
    'status',
    'sala_nome',
    'sala_tipo',
    'sala_local',
    'funcionario_nome',
    'funcionario_email',
    'inicio',
    'fim',
    'observacoes',
  ].join(',');

  const lines = rows.map((r) =>
    [
      escape(r.id),
      escape(r.status),
      escape(r.room?.name),
      escape(r.room?.type),
      escape(r.room?.location),
      escape(r.cleaner?.name),
      escape(r.cleaner?.email),
      escape(r.startedAt),
      escape(r.completedAt),
      escape(r.notes),
    ].join(',')
  );

  return [header, ...lines].join('\n');
}

const reportController = {
  /**
   * GET /api/reports/summary
   * Retorna números para cards
   */
  getSummary: async (req, res) => {
    try {
      const now = new Date();
      const startOfDay = new Date(now);
      startOfDay.setHours(0, 0, 0, 0);

      // Conta por status
      const [pending, inProgress, completed, attention] = await Promise.all([
        prisma.cleaningRecord.count({ where: { status: 'PENDING' } }),
        prisma.cleaningRecord.count({ where: { status: 'IN_PROGRESS' } }),
        prisma.cleaningRecord.count({ where: { status: 'COMPLETED' } }),
        prisma.cleaningRecord.count({ where: { status: 'NEEDS_ATTENTION' } }),
      ]);

      const completedToday = await prisma.cleaningRecord.count({
        where: { status: 'COMPLETED', completedAt: { gte: startOfDay } },
      });

      return res.json({
        success: true,
        summary: {
          pending,
          inProgress,
          completed,
          attention,
          completedToday,
        },
      });
    } catch (error) {
      console.error('🔥 Erro em getSummary:', error);
      return res.status(500).json({ success: false, message: 'Erro ao gerar resumo' });
    }
  },

  /**
   * GET /api/reports/cleanings
   * Query:
   * - start=YYYY-MM-DD
   * - end=YYYY-MM-DD
   * - status=COMPLETED|IN_PROGRESS|PENDING|NEEDS_ATTENTION
   * - roomId
   * - cleanerId
   */
  getCleaningsReport: async (req, res) => {
    try {
      const { start, end, status, roomId, cleanerId } = req.query;

      const startDate = toDateOrNull(start);
      const endDate = toDateOrNull(end);

      // Para incluir o dia final inteiro
      let endPlus = null;
      if (endDate) {
        endPlus = new Date(endDate);
        endPlus.setHours(23, 59, 59, 999);
      }

      const where = {
        ...(status ? { status } : {}),
        ...(roomId ? { roomId } : {}),
        ...(cleanerId ? { cleanerId } : {}),
        ...(startDate || endPlus
          ? {
              completedAt: {
                ...(startDate ? { gte: startDate } : {}),
                ...(endPlus ? { lte: endPlus } : {}),
              },
            }
          : {}),
      };

      const rows = await prisma.cleaningRecord.findMany({
        where,
        include: {
          room: true,
          cleaner: { select: { id: true, name: true, email: true } },
        },
        orderBy: [{ completedAt: 'desc' }],
        take: 1000,
      });

      return res.json({ success: true, rows });
    } catch (error) {
      console.error('🔥 Erro em getCleaningsReport:', error);
      return res.status(500).json({ success: false, message: 'Erro ao gerar relatório' });
    }
  },

  /**
   * GET /api/reports/export
   * Exporta CSV (mesmos filtros do getCleaningsReport)
   */
  exportCleaningsCsv: async (req, res) => {
    try {
      const { start, end, status, roomId, cleanerId } = req.query;

      const startDate = toDateOrNull(start);
      const endDate = toDateOrNull(end);
      let endPlus = null;
      if (endDate) {
        endPlus = new Date(endDate);
        endPlus.setHours(23, 59, 59, 999);
      }

      const where = {
        ...(status ? { status } : {}),
        ...(roomId ? { roomId } : {}),
        ...(cleanerId ? { cleanerId } : {}),
        ...(startDate || endPlus
          ? {
              completedAt: {
                ...(startDate ? { gte: startDate } : {}),
                ...(endPlus ? { lte: endPlus } : {}),
              },
            }
          : {}),
      };

      const rows = await prisma.cleaningRecord.findMany({
        where,
        include: {
          room: true,
          cleaner: { select: { id: true, name: true, email: true } },
        },
        orderBy: [{ completedAt: 'desc' }],
        take: 5000,
      });

      const csv = toCsv(rows);

      const fileName = `relatorio-limpezas-${new Date().toISOString().slice(0, 10)}.csv`;

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      return res.status(200).send(csv);
    } catch (error) {
      console.error('🔥 Erro em exportCleaningsCsv:', error);
      return res.status(500).json({ success: false, message: 'Erro ao exportar CSV' });
    }
  },
};

module.exports = reportController;
