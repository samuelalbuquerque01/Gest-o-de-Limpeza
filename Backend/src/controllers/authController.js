// src/controllers/authController.js
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const prisma = require("../utils/database"); // ajuste se seu path for diferente
const config = (() => {
  try {
    // se você tiver config/index.js ou config.js
    // senão, isso não quebra
    // eslint-disable-next-line global-require
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
  // =========================================================
  // ✅ ADMIN LOGIN
  // POST /api/auth/login
  // body: { email, password }
  // =========================================================
  loginAdmin: async (req, res) => {
    try {
      const { email, password } = req.body || {};

      console.log(`🔐 Tentativa de login ADMIN: ${email}`);

      const result = await validateLogin(email, password);

      if (result.badRequest) {
        console.log("❌ ADMIN: campos obrigatórios faltando");
        return res.status(400).json({ success: false, message: result.message });
      }

      if (result.unauthorized) {
        console.log("❌ ADMIN: credenciais inválidas");
        return res.status(401).json({ success: false, message: result.message });
      }

      const user = result.user;

      if (user.role !== "ADMIN") {
        console.log(`❌ ADMIN: sem permissão (${user.email} - ${user.role})`);
        return res.status(403).json({ success: false, message: "Sem permissão de administrador" });
      }

      if (user.status && user.status !== "ACTIVE") {
        console.log(`❌ ADMIN: usuário inativo (${user.email})`);
        return res.status(403).json({ success: false, message: "Usuário inativo" });
      }

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

  // =========================================================
  // ✅ WORKER LOGIN
  // POST /api/auth/worker/login
  // body pode ser: { email, password } OU { identifier, password }
  // =========================================================
  loginWorker: async (req, res) => {
    try {
      const { email, identifier, password } = req.body || {};
      const loginEmail = email || identifier;

      console.log(`🧹 Tentativa de login WORKER: ${loginEmail}`);

      const result = await validateLogin(loginEmail, password);

      if (result.badRequest) {
        console.log("❌ WORKER: campos obrigatórios faltando");
        return res.status(400).json({ success: false, message: result.message });
      }

      if (result.unauthorized) {
        console.log("❌ WORKER: credenciais inválidas");
        return res.status(401).json({ success: false, message: result.message });
      }

      const user = result.user;

      // ✅ funcionário pode ser CLEANER ou SUPERVISOR (ajuste se quiser)
      if (!["CLEANER", "SUPERVISOR"].includes(user.role)) {
        console.log(`❌ WORKER: sem permissão (${user.email} - ${user.role})`);
        return res.status(403).json({ success: false, message: "Usuário não é funcionário" });
      }

      if (user.status !== "ACTIVE") {
        console.log(`❌ WORKER: funcionário inativo (${user.email})`);
        return res.status(403).json({ success: false, message: "Funcionário inativo" });
      }

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

  // =========================================================
  // ✅ ME (perfil)
  // GET /api/auth/me
  // header: Authorization: Bearer <token>
  // =========================================================
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
};

module.exports = authController;
