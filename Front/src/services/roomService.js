// src/services/roomService.js
import api from "./api";

const toArray = (v) => (Array.isArray(v) ? v : v ? [v] : []);

function normalizeRoom(room = {}) {
  return {
    id: room.id,
    name: room.name,
    type: room.type,
    location: room.location,
    description: room.description ?? null,
    qrCode: room.qrCode ?? room.qr_code ?? null,
    status: room.status ?? "PENDING",
    priority: room.priority ?? "MEDIUM",
    notes: room.notes ?? null,
    lastCleaned: room.lastCleaned ?? room.last_cleaned ?? null,
    nextCleaning: room.nextCleaning ?? room.next_cleaning ?? null,
    createdAt: room.createdAt ?? null,
    updatedAt: room.updatedAt ?? null,
  };
}

const roomService = {
  async getRooms(params = {}) {
    try {
      const res = await api.get("/rooms", { params });
      const list = toArray(res?.data || res?.rooms || []);
      return { success: !!res?.success, data: list.map(normalizeRoom), error: res?.message || null };
    } catch (err) {
      return { success: false, data: [], error: err?.message || "Erro ao listar salas" };
    }
  },

  async getRoomStats() {
    try {
      const res = await api.get("/rooms/stats");
      return { success: !!res?.success, stats: res?.stats || {}, error: res?.message || null };
    } catch (err) {
      return { success: false, stats: {}, error: err?.message || "Erro ao buscar estatísticas" };
    }
  },

  async createRoom(roomData) {
    try {
      const res = await api.post("/rooms", roomData);
      return { success: !!res?.success, room: normalizeRoom(res?.room), error: res?.message || null };
    } catch (err) {
      return { success: false, room: null, error: err?.message || "Erro ao criar sala" };
    }
  },

  async updateRoom(id, roomData) {
    try {
      const res = await api.put(`/rooms/${id}`, roomData);
      return { success: !!res?.success, room: normalizeRoom(res?.room), error: res?.message || null };
    } catch (err) {
      return { success: false, room: null, error: err?.message || "Erro ao atualizar sala" };
    }
  },

  async deleteRoom(id) {
    try {
      const res = await api.delete(`/rooms/${id}`);
      return { success: !!res?.success, message: res?.message || "OK", error: null };
    } catch (err) {
      return { success: false, message: null, error: err?.message || "Erro ao deletar sala" };
    }
  },

  async getAvailableRooms() {
    try {
      const res = await api.get("/rooms/available");
      const list = toArray(res?.rooms || res?.data || []);
      return { success: !!res?.success, rooms: list.map(normalizeRoom), error: res?.message || null };
    } catch (err) {
      return { success: false, rooms: [], error: err?.message || "Erro ao buscar salas disponíveis" };
    }
  },

  async getRoomById(id) {
    try {
      const res = await api.get(`/rooms/${id}`);
      return { success: !!res?.success, room: normalizeRoom(res?.room || res?.data), error: res?.message || null };
    } catch (err) {
      return { success: false, room: null, error: err?.message || "Erro ao buscar sala" };
    }
  },

  // ✅ NOVA FUNÇÃO: Buscar sala pelo QR Code
  async findRoomByQRCode(qrCode) {
    try {
      const res = await api.get(`/rooms/qr/${encodeURIComponent(qrCode)}`);
      return { 
        success: !!res?.success, 
        data: {
          room: normalizeRoom(res?.room),
          isBeingCleaned: res?.isBeingCleaned || false,
          currentCleaner: res?.currentCleaner || null,
        }, 
        error: res?.message || null 
      };
    } catch (err) {
      return { success: false, data: null, error: err?.message || "Erro ao buscar sala por QR Code" };
    }
  },

  // ✅ Função para gerar QR Code para impressão
  async generateQRCodeForRoom(roomId) {
    try {
      const res = await api.post(`/rooms/${roomId}/generate-qr`);
      return { success: !!res?.success, qrCode: res?.qrCode, error: res?.message || null };
    } catch (err) {
      return { success: false, qrCode: null, error: err?.message || "Erro ao gerar QR Code" };
    }
  },
};

export default roomService;