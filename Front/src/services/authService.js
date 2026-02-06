// src/services/authService.js
import api from "./api";

function safeParse(v) {
  try {
    return JSON.parse(v);
  } catch {
    return null;
  }
}

function saveAuth(token, user) {
  if (!token) return;
  localStorage.setItem("token", token);
  localStorage.setItem("user", JSON.stringify(user || null));
  localStorage.setItem("auth", JSON.stringify({ token, user: user || null }));
}

function clearAuth() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  localStorage.removeItem("auth");
}

const authService = {
  // ✅ usado no AuthContext
  getCurrentUser() {
    const user = safeParse(localStorage.getItem("user"));
    if (user) return user;

    const auth = safeParse(localStorage.getItem("auth"));
    if (auth?.user) return auth.user;

    return null;
  },

  getToken() {
    const t = localStorage.getItem("token");
    if (t && t !== "null" && t !== "undefined") return t;

    const auth = safeParse(localStorage.getItem("auth"));
    if (auth?.token) return auth.token;

    return null;
  },

  // ✅ ADMIN login
  async login(email, password) {
    const res = await api.post("/auth/login", { email, password });

    if (res?.success && res?.token) {
      saveAuth(res.token, res.user);
    }

    return res;
  },

  // ✅ WORKER login (envia email + identifier para compatibilidade)
  async loginWorker(identifier, password) {
    const payload = {
      identifier,           // ✅ se backend usar "identifier"
      email: identifier,    // ✅ se backend usar "email"
      password,
    };

    const res = await api.post("/auth/worker/login", payload);

    if (res?.success && res?.token) {
      saveAuth(res.token, res.user);
    }

    return res;
  },

  // ✅ valida de verdade no backend
  async checkAuth() {
    const token = this.getToken();
    if (!token) return { isAuthenticated: false, user: null };

    try {
      const res = await api.get("/auth/me");
      if (res?.success && res?.user) {
        saveAuth(token, res.user);
        return { isAuthenticated: true, user: res.user };
      }

      // se backend não retornou ok, limpa
      clearAuth();
      return { isAuthenticated: false, user: null };
    } catch (e) {
      // token inválido/expirado
      clearAuth();
      return { isAuthenticated: false, user: null };
    }
  },

  async getProfile() {
    const token = this.getToken();
    if (!token) return { success: false, message: "Sem token" };

    try {
      const res = await api.get("/auth/me");
      if (res?.success && res?.user) {
        saveAuth(token, res.user);
      }
      return res;
    } catch (e) {
      return { success: false, message: e?.message || "Erro ao buscar perfil" };
    }
  },

  async logout() {
    clearAuth();
    return { success: true };
  },
};

export default authService;
