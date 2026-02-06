// Front/src/services/api.js
import axios from "axios";

function safeJsonParse(value) {
  try { return JSON.parse(value); } catch { return null; }
}

function getToken() {
  const t1 = localStorage.getItem("token");
  if (t1 && t1 !== "null" && t1 !== "undefined") return t1;

  const authRaw = localStorage.getItem("auth");
  const auth = authRaw ? safeJsonParse(authRaw) : null;

  const possible =
    auth?.token ||
    auth?.accessToken ||
    auth?.jwt ||
    auth?.data?.token ||
    auth?.auth?.token;

  if (possible && possible !== "null" && possible !== "undefined") return possible;

  return null;
}

const api = axios.create({
  baseURL: "/api",
  timeout: 60000,
});

api.interceptors.request.use((config) => {
  const token = getToken();
  config.headers = config.headers || {};
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const status = error?.response?.status;
    const data = error?.response?.data;

    return Promise.reject({
      success: false,
      status: status || 0,
      message: data?.message || data?.error || error?.message || "Erro ao conectar com o servidor",
      data: data || null,
    });
  }
);

export default api;
