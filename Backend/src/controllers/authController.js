// Backend/src/controllers/authController.js - VERSÃO COMPLETA
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const prisma = require("../utils/database");

const config = (() => {
  try {
    return require("../../config");
  } catch {
    return {};
  }
})();

function getJwtSecret() {
  return config?.jwt?.secret || process.env.JWT_SECRET || "dev_secret_change_me";
}

function getJwtExpiresIn() {
  return config?.jwt?.expiresIn || process.env.JWT_EXPIRES_IN || "7d";
}

function normalizeEmail(email) {
  return String(email || "").toLowerCase().trim();
}

function publicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    lastLogin: user.lastLogin || null,
    phone: user.phone || null
  };
}

function signToken(user) {
  return jwt.sign(
    { userId: user.id, role: user.role },
    getJwtSecret(),
    { expiresIn: getJwtExpiresIn() }
  );
}

async function validateLogin(loginEmail, password) {
  const email = normalizeEmail(loginEmail);

  if (!email || !password) {
    return { badRequest: true, message: "Email e senha são obrigatórios" };
  }

  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    return { unauthorized: true, message: "Usuário ou senha inválidos" };
  }

  const ok = await bcrypt.compare(String(password), user.password || "");
  if (!ok) {
    return { unauthorized: true, message: "Usuário ou senha inválidos" };
  }

  return { ok: true, user };
}

const authController = {
  // ----
  //  ADMIN LOGIN
  // ----
  loginAdmin: async (req, res) => {
    try {
      const { email, password } = req.body || {};

      console.log(`🔐 Tentativa de login ADMIN: ${email}`);

      const result = await validateLogin(email, password);

      if (result.badRequest) {
        return res.status(400).json({ success: false, message: result.message });
      }

      if (result.unauthorized) {
        return res.status(401).json({ success: false, message: result.message });
      }

      const user = result.user;

      if (user.role !== "ADMIN") {
        return res.status(403).json({ success: false, message: "Sem permissão de administrador" });
      }

      if (user.status && user.status !== "ACTIVE") {
        return res.status(403).json({ success: false, message: "Usuário inativo" });
      }

      //  ATUALIZAR ÚLTIMO LOGIN
      await prisma.user.update({
        where: { id: user.id },
        data: { lastLogin: new Date() }
      });

      const token = signToken(user);

      console.log(`✅ Login ADMIN bem-sucedido: ${user.email}`);

      return res.json({
        success: true,
        message: "Login realizado com sucesso",
        token,
        user: publicUser(user),
      });
    } catch (error) {
      console.error("🔥 Erro no login ADMIN:", error);
      return res.status(500).json({ success: false, message: "Erro interno no login" });
    }
  },

  // ----
  //  WORKER LOGIN
  // ----
  loginWorker: async (req, res) => {
    try {
      const { email, identifier, password } = req.body || {};
      const loginEmail = email || identifier;

      console.log(`🧹 Tentativa de login WORKER: ${loginEmail}`);

      const result = await validateLogin(loginEmail, password);

      if (result.badRequest) {
        return res.status(400).json({ success: false, message: result.message });
      }

      if (result.unauthorized) {
        return res.status(401).json({ success: false, message: result.message });
      }

      const user = result.user;

      if (!["CLEANER", "SUPERVISOR"].includes(user.role)) {
        return res.status(403).json({ success: false, message: "Usuário não é funcionário" });
      }

      if (user.status !== "ACTIVE") {
        return res.status(403).json({ success: false, message: "Funcionário inativo" });
      }

      //  ATUALIZAR ÚLTIMO LOGIN
      await prisma.user.update({
        where: { id: user.id },
        data: { lastLogin: new Date() }
      });

      const token = signToken(user);

      console.log(`✅ Login WORKER bem-sucedido: ${user.email}`);

      return res.json({
        success: true,
        message: "Login realizado com sucesso",
        token,
        user: publicUser(user),
      });
    } catch (error) {
      console.error("🔥 Erro no login WORKER:", error);
      return res.status(500).json({ success: false, message: "Erro interno no login" });
    }
  },

  // ----
  //  ME (perfil)
  // ----
  me: async (req, res) => {
    try {
      const authHeader = req.headers.authorization || "";
      const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

      if (!token) {
        return res.status(401).json({ success: false, message: "Token não informado" });
      }

      const decoded = jwt.verify(token, getJwtSecret());
      const userId = decoded.userId;

      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        return res.status(401).json({ success: false, message: "Usuário não encontrado" });
      }

      return res.json({ success: true, user: publicUser(user) });
    } catch (error) {
      return res.status(401).json({ success: false, message: "Token inválido ou expirado" });
    }
  },

  // ----
  //  NOVO ENDPOINT - HISTÓRICO DE LOGIN DO USUÁRIO ATUAL
  // ----
  getMyLoginHistory: async (req, res) => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ success: false, message: "Usuário não autenticado" });
      }

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          email: true,
          lastLogin: true,
          createdAt: true
        }
      });

      // Buscar histórico de limpezas como atividades
      const activities = await prisma.cleaningRecord.findMany({
        where: {
          cleanerId: userId,
          startedAt: { not: null }
        },
        orderBy: { startedAt: 'desc' },
        select: {
          id: true,
          startedAt: true,
          completedAt: true,
          status: true,
          room: {
            select: { name: true, location: true }
          }
        },
        take: 50
      });

      return res.json({
        success: true,
        lastLogin: user.lastLogin,
        firstLogin: user.createdAt,
        activities: activities.map(a => ({
          id: a.id,
          type: 'cleaning',
          timestamp: a.startedAt,
          completedAt: a.completedAt,
          status: a.status,
          room: a.room.name,
          location: a.room.location
        })),
        activityCount: activities.length
      });

    } catch (error) {
      console.error("🔥 Erro ao buscar histórico de login:", error);
      return res.status(500).json({ 
        success: false, 
        message: "Erro ao buscar histórico" 
      });
    }
  }
};

module.exports = authController;