// src/services/cleaningService.js
import api from "./api";

const toArray = (v) => (Array.isArray(v) ? v : v ? [v] : []);

function normalizeCleaning(c = {}) {
  return {
    id: c.id,
    roomId: c.roomId ?? c.room_id,
    cleanerId: c.cleanerId ?? c.cleaner_id,
    status: c.status,
    startedAt: c.startedAt ?? c.started_at ?? null,
    completedAt: c.completedAt ?? c.completed_at ?? null,
    createdAt: c.createdAt ?? c.created_at ?? null,
    notes: c.notes ?? null,
    checklist: c.checklist ?? {},

    room: c.room
      ? {
          id: c.room.id,
          name: c.room.name,
          type: c.room.type,
          location: c.room.location,
        }
      : null,

    cleaner: c.cleaner
      ? {
          id: c.cleaner.id,
          name: c.cleaner.name,
          email: c.cleaner.email,
        }
      : null,
  };
}

const cleaningService = {
  // ✅ CLEANER: Iniciar limpeza (envia apenas roomId como string)
  async startCleaning(roomId) {
    try {
      const res = await api.post("/cleaning/start", { roomId });
      return { 
        success: !!res?.success, 
        record: res?.record ? normalizeCleaning(res.record) : null, 
        error: res?.message || null 
      };
    } catch (err) {
      console.error('🔥 [cleaningService] Erro ao iniciar limpeza:', err);
      return { 
        success: false, 
        record: null, 
        error: err?.message || 'Erro ao iniciar limpeza' 
      };
    }
  },

  async completeCleaning(payload) {
    try {
      const res = await api.post("/cleaning/complete", payload);
      return { 
        success: !!res?.success, 
        record: res?.record ? normalizeCleaning(res.record) : null, 
        error: res?.message || null 
      };
    } catch (err) {
      console.error('🔥 [cleaningService] Erro ao completar limpeza:', err);
      return { 
        success: false, 
        record: null, 
        error: err?.message || 'Erro ao completar limpeza' 
      };
    }
  },

  async cancelCleaning(recordId) {
    try {
      const res = await api.post("/cleaning/cancel", { recordId });
      return { 
        success: !!res?.success, 
        message: res?.message || "OK", 
        error: null 
      };
    } catch (err) {
      console.error('🔥 [cleaningService] Erro ao cancelar limpeza:', err);
      return { 
        success: false, 
        message: null, 
        error: err?.message || 'Erro ao cancelar limpeza' 
      };
    }
  },

  async getMyTodayCleanings() {
    try {
      const res = await api.get("/cleaning/my/today");
      const list = toArray(res?.cleanings || res?.data || []);
      return { 
        success: !!res?.success, 
        cleanings: list.map(normalizeCleaning), 
        error: res?.message || null 
      };
    } catch (err) {
      console.error('🔥 [cleaningService] Erro ao buscar limpezas de hoje:', err);
      return { 
        success: false, 
        cleanings: [], 
        error: err?.message || 'Erro ao buscar suas limpezas de hoje' 
      };
    }
  },

  async getMyActiveCleaning() {
    try {
      const res = await api.get("/cleaning/my/active");
      return { 
        success: !!res?.success, 
        active: res?.active ? normalizeCleaning(res.active) : null, 
        error: res?.message || null 
      };
    } catch (err) {
      console.error('🔥 [cleaningService] Erro ao buscar limpeza ativa:', err);
      return { 
        success: false, 
        active: null, 
        error: err?.message || 'Erro ao buscar limpeza ativa' 
      };
    }
  },

  // ✅ ADMIN / DASHBOARD
  async getCleaningStats(period = "today") {
    try {
      const res = await api.get("/cleaning/stats", { params: { period } });

      const raw = res?.stats || {};
      // Dashboard.jsx usa stats.completed, mas backend pode mandar completedToday
      const stats = {
        ...raw,
        completed: raw.completed ?? raw.completedToday ?? 0,
      };

      return { 
        success: !!res?.success, 
        stats, 
        error: res?.message || null 
      };
    } catch (err) {
      console.error('🔥 [cleaningService] Erro ao buscar estatísticas:', err);
      return { 
        success: false, 
        stats: {}, 
        error: err?.message || 'Erro ao buscar estatísticas' 
      };
    }
  },

  async getActiveCleanings() {
    try {
      const res = await api.get("/cleaning/active");
      const list = toArray(res?.data || res?.active || res?.cleanings || []);
      return { 
        success: !!res?.success, 
        data: list.map(normalizeCleaning), 
        error: res?.message || null 
      };
    } catch (err) {
      console.error('🔥 [cleaningService] Erro ao buscar limpezas ativas:', err);
      return { 
        success: false, 
        data: [], 
        error: err?.message || 'Erro ao buscar limpezas ativas' 
      };
    }
  },

  async getRecentCleanings(limit = 15) {
    try {
      const res = await api.get("/cleaning/recent", { params: { limit } });
      const list = toArray(res?.data || res?.recent || res?.cleanings || []);
      return { 
        success: !!res?.success, 
        data: list.map(normalizeCleaning), 
        error: res?.message || null 
      };
    } catch (err) {
      console.error('🔥 [cleaningService] Erro ao buscar limpezas recentes:', err);
      return { 
        success: false, 
        data: [], 
        error: err?.message || 'Erro ao buscar limpezas recentes' 
      };
    }
  },

  async getCleaningHistory(params = {}) {
    try {
      const res = await api.get("/cleaning/history", { params });
      const list = toArray(res?.data || res?.cleanings || res?.history || []);
      return { 
        success: !!res?.success, 
        data: list.map(normalizeCleaning), 
        pagination: res?.pagination || null,
        error: res?.message || null 
      };
    } catch (err) {
      console.error('🔥 [cleaningService] Erro ao buscar histórico:', err);
      return { 
        success: false, 
        data: [], 
        pagination: null,
        error: err?.message || 'Erro ao buscar histórico' 
      };
    }
  },
};

export default cleaningService;