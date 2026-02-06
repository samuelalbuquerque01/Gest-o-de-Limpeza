// src/services/api.js
import axios from "axios";

function safeJsonParse(value) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function getToken() {
  // 1) token direto
  const t1 = localStorage.getItem("token");
  if (t1 && t1 !== "null" && t1 !== "undefined") return t1;

  // 2) auth object
  const authRaw = localStorage.getItem("auth");
  const auth = authRaw ? safeJsonParse(authRaw) : null;

  // tenta chaves comuns
  const possible =
    auth?.token ||
    auth?.accessToken ||
    auth?.jwt ||
    auth?.data?.token ||
    auth?.auth?.token;

  if (possible && possible !== "null" && possible !== "undefined") return possible;

  // 3) fallback (se você tiver salvo user com token dentro por algum motivo)
  const userRaw = localStorage.getItem("user");
  const user = userRaw ? safeJsonParse(userRaw) : null;
  const uToken = user?.token || user?.accessToken;
  if (uToken && uToken !== "null" && uToken !== "undefined") return uToken;

  return null;
}

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || "http://localhost:5000/api",
  timeout: 15000,
});

// ✅ request: sempre injeta Bearer token
api.interceptors.request.use(
  (config) => {
    const token = getToken();

    // garante headers sempre como objeto normal
    config.headers = config.headers || {};

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    } else {
      // se não tem token, remove pra não enviar "Bearer null"
      if (config.headers.Authorization) delete config.headers.Authorization;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// ✅ response: devolve sempre um formato consistente no reject
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const status = error?.response?.status;
    const data = error?.response?.data;

    const url = error?.config?.url;
    const method = error?.config?.method;

    console.error("❌ API Error:", {
      status,
      url,
      method,
      data,
    });

    // normaliza retorno de erro
    const normalized = {
      success: false,
      status: status || 0,
      message:
        data?.message ||
        data?.error ||
        error?.message ||
        "Erro ao conectar com o servidor",
      data: data || null,
    };

    return Promise.reject(normalized);
  }
);

export default api;
