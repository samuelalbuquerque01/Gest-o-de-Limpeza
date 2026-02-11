// Backend/src/controllers/userController.js - VERSÃO FINAL 100% CORRIGIDA
const bcrypt = require('bcryptjs');
const prisma = require('../utils/database');

function normalizeEmail(email) {
  return String(email || '').toLowerCase().trim();
}

function safeUser(u) {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    status: u.status,
    createdAt: u.createdAt,
    updatedAt: u.updatedAt,
    lastLogin: u.lastLogin || null,
    phone: u.phone || null
  };
}

async function hashIfProvided(password) {
  if (!password) return null;
  const p = String(password);
  if (p.length < 4) {
    const err = new Error('Senha deve ter pelo menos 4 caracteres');
    err.statusCode = 400;
    throw err;
  }
  return bcrypt.hash(p, 10);
}

const userController = {
  // =========================================================
  // ✅ ROTAS PRINCIPAIS - /api/users
  // =========================================================

  // GET /api/users
  listUsers: async (req, res) => {
    try {
      const role = req.query?.role ? String(req.query.role).toUpperCase() : null;
      const where = {};
      if (role) where.role = role;

      const users = await prisma.user.findMany({
        where,
        orderBy: [{ name: 'asc' }],
      });

      return res.json({ success: true, users: users.map(safeUser) });
    } catch (error) {
      console.error('🔥 Erro ao listar usuários:', error);
      return res.status(500).json({ success: false, message: 'Erro ao listar usuários' });
    }
  },

  // POST /api/users
  createUser: async (req, res) => {
    try {
      const { name, email, password, role, status, phone } = req.body;

      if (!name || !email || !password) {
        return res.status(400).json({
          success: false,
          message: 'Nome, email e senha são obrigatórios',
        });
      }

      const emailNorm = normalizeEmail(email);
      const exists = await prisma.user.findUnique({ where: { email: emailNorm } });
      if (exists) {
        return res.status(409).json({ success: false, message: 'Email já cadastrado' });
      }

      const allowedRoles = ['ADMIN', 'CLEANER'];
      const finalRole = role ? String(role).toUpperCase() : 'CLEANER';
      if (!allowedRoles.includes(finalRole)) {
        return res.status(400).json({ success: false, message: 'Role inválida' });
      }

      const finalStatus = status ? String(status).toUpperCase() : 'ACTIVE';
      if (!['ACTIVE', 'INACTIVE'].includes(finalStatus)) {
        return res.status(400).json({ success: false, message: 'Status inválido' });
      }

      const hash = await bcrypt.hash(String(password), 10);

      const user = await prisma.user.create({
        data: {
          name: String(name).trim(),
          email: emailNorm,
          password: hash,
          role: finalRole,
          status: finalStatus,
          phone: phone || null,
        },
      });

      return res.status(201).json({ success: true, user: safeUser(user) });
    } catch (error) {
      console.error('🔥 Erro ao criar usuário:', error);
      return res.status(500).json({ success: false, message: 'Erro ao criar usuário' });
    }
  },

  // PUT /api/users/:id
  updateUser: async (req, res) => {
    try {
      const { id } = req.params;
      const { name, email, role, status, password, phone } = req.body;

      const data = {};
      if (name !== undefined) data.name = String(name).trim();
      if (email !== undefined) data.email = normalizeEmail(email);
      if (role !== undefined) data.role = String(role).toUpperCase();
      if (status !== undefined) data.status = String(status).toUpperCase();
      if (phone !== undefined) data.phone = phone || null;

      if (password) {
        data.password = await hashIfProvided(password);
      }

      if (data.role && !['ADMIN', 'CLEANER'].includes(data.role)) {
        return res.status(400).json({ success: false, message: 'Role inválida' });
      }
      if (data.status && !['ACTIVE', 'INACTIVE'].includes(data.status)) {
        return res.status(400).json({ success: false, message: 'Status inválido' });
      }

      if (data.email) {
        const exists = await prisma.user.findUnique({ where: { email: data.email } });
        if (exists && exists.id !== id) {
          return res.status(409).json({ success: false, message: 'Email já em uso' });
        }
      }

      const user = await prisma.user.update({
        where: { id },
        data,
      });

      return res.json({ success: true, user: safeUser(user) });
    } catch (error) {
      console.error('🔥 Erro ao atualizar usuário:', error);
      return res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || 'Erro ao atualizar usuário',
      });
    }
  },

  // DELETE /api/users/:id
  deleteUser: async (req, res) => {
    try {
      const { id } = req.params;

      if (req.user?.id === id) {
        return res.status(400).json({ success: false, message: 'Você não pode excluir a si mesmo' });
      }

      console.log(`🗑️ Deletando registros de limpeza do usuário ${id}`);
      await prisma.cleaningRecord.deleteMany({
        where: { cleanerId: id }
      });

      console.log(`🗑️ Deletando usuário ${id}`);
      await prisma.user.delete({ where: { id } });
      
      console.log(`✅ Usuário ${id} removido com sucesso`);
      return res.json({ 
        success: true, 
        message: 'Usuário removido com sucesso' 
      });
    } catch (error) {
      console.error('🔥 Erro ao deletar usuário:', error);
      
      if (error.code === 'P2025') {
        return res.status(404).json({ 
          success: false, 
          message: 'Usuário não encontrado' 
        });
      }
      
      return res.status(500).json({ 
        success: false, 
        message: 'Erro ao excluir usuário',
        error: error.message 
      });
    }
  },

  // POST /api/users/:id/reset-password
  resetPassword: async (req, res) => {
    try {
      const { id } = req.params;
      const newPassword = req.body?.newPassword ?? req.body?.password;

      if (!newPassword || String(newPassword).length < 4) {
        return res.status(400).json({ success: false, message: 'Nova senha inválida' });
      }

      const hash = await bcrypt.hash(String(newPassword), 10);

      await prisma.user.update({
        where: { id },
        data: { password: hash },
      });

      return res.json({ success: true, message: 'Senha redefinida com sucesso' });
    } catch (error) {
      console.error('🔥 Erro ao resetar senha:', error);
      return res.status(500).json({ success: false, message: 'Erro ao resetar senha' });
    }
  },

  // GET /api/users/stats
  getStats: async (req, res) => {
    try {
      const total = await prisma.user.count();
      const active = await prisma.user.count({ where: { status: 'ACTIVE' } });
      const inactive = await prisma.user.count({ where: { status: 'INACTIVE' } });

      const byRole = await prisma.user.groupBy({
        by: ['role'],
        _count: { role: true },
      });

      const roles = byRole.reduce((acc, r) => {
        acc[r.role] = r._count.role;
        return acc;
      }, {});

      return res.json({ success: true, stats: { total, active, inactive, roles } });
    } catch (error) {
      console.error('🔥 Erro ao gerar stats:', error);
      return res.status(500).json({ success: false, message: 'Erro ao buscar estatísticas' });
    }
  },

  // =========================================================
  // ✅ GET /api/users/:id/stats - COMPLETAMENTE CORRIGIDO!
  // =========================================================
  getWorkerStats: async (req, res) => {
    try {
      const { id } = req.params;
      
      const user = await prisma.user.findUnique({ where: { id } });
      if (!user) {
        return res.status(404).json({ success: false, message: 'Usuário não encontrado' });
      }

      const today = new Date(); today.setHours(0,0,0,0);
      const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7); weekAgo.setHours(0,0,0,0);
      const monthAgo = new Date(); monthAgo.setDate(monthAgo.getDate() - 30); monthAgo.setHours(0,0,0,0);

      const [total, todayCount, weekCount, monthCount] = await Promise.all([
        prisma.cleaningRecord.count({ 
          where: { cleanerId: id, status: 'COMPLETED' } 
        }),
        prisma.cleaningRecord.count({ 
          where: { 
            cleanerId: id, 
            status: 'COMPLETED', 
            completedAt: { gte: today } 
          } 
        }),
        prisma.cleaningRecord.count({ 
          where: { 
            cleanerId: id, 
            status: 'COMPLETED', 
            completedAt: { gte: weekAgo } 
          } 
        }),
        prisma.cleaningRecord.count({ 
          where: { 
            cleanerId: id, 
            status: 'COMPLETED', 
            completedAt: { gte: monthAgo } 
          } 
        })
      ]);

      // ✅ CORRIGIDO: not: null (NÃO DateTime!)
      const records = await prisma.cleaningRecord.findMany({
        where: {
          cleanerId: id,
          status: 'COMPLETED',
          startedAt: { not: null },
          completedAt: { not: null }
        },
        select: { startedAt: true, completedAt: true },
        take: 100
      });
      
      let avgDuration = 0;
      if (records.length > 0) {
        const totalMinutes = records.reduce((sum, r) => {
          return sum + (new Date(r.completedAt) - new Date(r.startedAt)) / (1000 * 60);
        }, 0);
        avgDuration = Math.round(totalMinutes / records.length);
      }

      const lastCleaning = await prisma.cleaningRecord.findFirst({
        where: { cleanerId: id, status: 'COMPLETED' },
        orderBy: { completedAt: 'desc' },
        select: { 
          completedAt: true, 
          room: { select: { name: true } } 
        }
      });

      return res.json({
        success: true,
        total: total || 0,
        today: todayCount || 0,
        week: weekCount || 0,
        month: monthCount || 0,
        averageTime: avgDuration,
        lastCleaning: lastCleaning || null
      });
      
    } catch (error) {
      console.error('🔥 Erro ao buscar estatísticas:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Erro ao buscar estatísticas' 
      });
    }
  },

  // =========================================================
  // ✅ GET /api/users/:id/login-history - CORRIGIDO!
  // =========================================================
  getUserLoginHistory: async (req, res) => {
    try {
      const { id } = req.params;
      
      const user = await prisma.user.findUnique({
        where: { id },
        select: { 
          lastLogin: true, 
          createdAt: true,
          name: true,
          email: true 
        }
      });

      if (!user) {
        return res.status(404).json({ success: false, message: 'Usuário não encontrado' });
      }

      // ✅ CORRIGIDO: APENAS include, SEM select!
      const cleaningHistory = await prisma.cleaningRecord.findMany({
        where: { 
          cleanerId: id, 
          startedAt: { not: null }
        },
        orderBy: { startedAt: 'desc' },
        include: {
          room: {
            select: {
              name: true,
              location: true
            }
          }
        },
        take: 20
      });

      return res.json({
        success: true,
        lastLogin: user.lastLogin,
        firstLogin: user.createdAt,
        totalLogins: user.lastLogin ? 1 : 0,
        activities: cleaningHistory.map(c => ({
          id: c.id,
          type: 'cleaning',
          timestamp: c.startedAt,
          completedAt: c.completedAt,
          status: c.status,
          room: c.room.name,
          location: c.room.location,
          duration: c.startedAt && c.completedAt 
            ? Math.round((new Date(c.completedAt) - new Date(c.startedAt)) / (1000 * 60))
            : null
        }))
      });
      
    } catch (error) {
      console.error('🔥 Erro ao buscar histórico:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Erro ao buscar histórico de login' 
      });
    }
  },

  // =========================================================
  // ✅ GET /api/users/:id/performance
  // =========================================================
  getWorkerPerformance: async (req, res) => {
    try {
      const { id } = req.params;
      
      const performance = await prisma.$queryRaw`
        SELECT 
          EXTRACT(DOW FROM "completedAt") as day_of_week,
          COUNT(*) as total,
          AVG(EXTRACT(EPOCH FROM ("completedAt" - "startedAt")) / 60) as avg_duration
        FROM "CleaningRecord"
        WHERE "cleanerId" = ${id}
          AND "status" = 'COMPLETED'
          AND "completedAt" IS NOT NULL
          AND "startedAt" IS NOT NULL
        GROUP BY EXTRACT(DOW FROM "completedAt")
        ORDER BY day_of_week
      `;

      const hourlyPerformance = await prisma.$queryRaw`
        SELECT 
          EXTRACT(HOUR FROM "startedAt") as hour,
          COUNT(*) as total,
          AVG(EXTRACT(EPOCH FROM ("completedAt" - "startedAt")) / 60) as avg_duration
        FROM "CleaningRecord"
        WHERE "cleanerId" = ${id}
          AND "status" = 'COMPLETED'
          AND "startedAt" IS NOT NULL
          AND "completedAt" IS NOT NULL
        GROUP BY EXTRACT(HOUR FROM "startedAt")
        ORDER BY hour
      `;

      return res.json({
        success: true,
        byDayOfWeek: performance,
        byHour: hourlyPerformance,
        totalRooms: performance.length
      });
      
    } catch (error) {
      console.error('🔥 Erro ao buscar performance:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Erro ao buscar performance' 
      });
    }
  },

  // =========================================================
  // ✅ ROTAS LEGADAS - /api/users/workers
  // =========================================================

  // GET /api/users/workers
  listWorkers: async (req, res) => {
    try {
      const workers = await prisma.user.findMany({
        where: { role: 'CLEANER' },
        orderBy: [{ name: 'asc' }],
      });

      return res.json({ success: true, workers: workers.map(safeUser) });
    } catch (error) {
      console.error('🔥 Erro ao listar funcionários:', error);
      return res.status(500).json({ success: false, message: 'Erro ao listar funcionários' });
    }
  },

  // POST /api/users/workers
  createWorker: async (req, res) => {
    try {
      const { name, email, password, phone } = req.body;

      if (!name || !email || !password) {
        return res.status(400).json({
          success: false,
          message: 'Nome, email e senha são obrigatórios',
        });
      }

      const emailNorm = normalizeEmail(email);
      const exists = await prisma.user.findUnique({ where: { email: emailNorm } });
      if (exists) {
        return res.status(409).json({ success: false, message: 'Email já cadastrado' });
      }

      const hash = await bcrypt.hash(String(password), 10);

      const worker = await prisma.user.create({
        data: {
          name: String(name).trim(),
          email: emailNorm,
          password: hash,
          role: 'CLEANER',
          status: 'ACTIVE',
          phone: phone || null,
        },
      });

      return res.status(201).json({ success: true, worker: safeUser(worker) });
    } catch (error) {
      console.error('🔥 Erro ao criar funcionário:', error);
      return res.status(500).json({ success: false, message: 'Erro ao criar funcionário' });
    }
  },

  // PUT /api/users/workers/:id
  updateWorker: async (req, res) => {
    try {
      const { id } = req.params;
      const { name, email, password, phone } = req.body;

      const data = {};
      if (name !== undefined) data.name = String(name).trim();
      if (email !== undefined) data.email = normalizeEmail(email);
      if (phone !== undefined) data.phone = phone || null;

      if (password) {
        data.password = await hashIfProvided(password);
      }

      if (data.email) {
        const exists = await prisma.user.findUnique({ where: { email: data.email } });
        if (exists && exists.id !== id) {
          return res.status(409).json({ success: false, message: 'Email já em uso' });
        }
      }

      const worker = await prisma.user.update({
        where: { id },
        data,
      });

      return res.json({ success: true, worker: safeUser(worker) });
    } catch (error) {
      console.error('🔥 Erro ao atualizar funcionário:', error);
      return res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || 'Erro ao atualizar funcionário',
      });
    }
  },

  // PATCH /api/users/workers/:id/status
  setWorkerStatus: async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!status || !['ACTIVE', 'INACTIVE'].includes(status)) {
        return res.status(400).json({ success: false, message: 'Status inválido' });
      }

      const worker = await prisma.user.update({
        where: { id },
        data: { status },
      });

      return res.json({ success: true, worker: safeUser(worker) });
    } catch (error) {
      console.error('🔥 Erro ao alterar status:', error);
      return res.status(500).json({ success: false, message: 'Erro ao alterar status' });
    }
  },

  // POST /api/users/workers/:id/reset-password
  resetWorkerPassword: async (req, res) => {
    try {
      const { id } = req.params;
      const newPassword = req.body?.newPassword ?? req.body?.password;

      if (!newPassword || String(newPassword).length < 4) {
        return res.status(400).json({ success: false, message: 'Nova senha inválida' });
      }

      const hash = await bcrypt.hash(String(newPassword), 10);

      await prisma.user.update({
        where: { id },
        data: { password: hash },
      });

      return res.json({ success: true, message: 'Senha redefinida com sucesso' });
    } catch (error) {
      console.error('🔥 Erro ao resetar senha:', error);
      return res.status(500).json({ success: false, message: 'Erro ao resetar senha' });
    }
  },
};

module.exports = userController;