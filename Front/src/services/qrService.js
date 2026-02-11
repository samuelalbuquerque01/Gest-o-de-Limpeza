// src/services/qrService.js - FACHADA QUE USA O CORE
import qrCore from './qrCore';

/**
 * 🎯 FACHADA DO SERVIÇO DE QR CODE
 * Mantém compatibilidade com código existente
 * MAS redireciona tudo para o qrCore
 */
const qrService = {
  // ✅ GERAÇÃO
  async generateQRCode(roomId, options = {}) {
    try {
      // Primeiro busca a sala
      const { default: api } = await import('./api');
      const roomResponse = await api.get(`/rooms/${roomId}`);
      
      if (!roomResponse?.success || !roomResponse?.room) {
        throw new Error('Sala não encontrada');
      }

      const result = await qrCore.generateViaBackend(roomId, options);
      return {
        success: result.success,
        data: {
          qrImage: result.image,
          qrContent: result.url,
          qrURL: result.url,
          qrCode: result.qrCode,
          room: result.room || roomResponse.room
        },
        error: result.error
      };
    } catch (error) {
      return {
        success: false,
        data: null,
        error: error.message
      };
    }
  },

  // ✅ DOWNLOAD
  async downloadQRCode(roomId, options = {}) {
    const roomName = options.roomName || `sala-${roomId}`;
    return qrCore.downloadQRCode(roomId, roomName, options.format);
  },

  // ✅ IMPRESSÃO
  async printQRCode(roomId) {
    return qrCore.printQRCode(roomId);
  },

  // ✅ LOTE
  async generateBatchQRCodes(roomIds) {
    return qrCore.generateBatch(roomIds);
  },

  // ✅ SCAN
  async scanRoomQRCode(qrCode) {
    return qrCore.scanQRCode(qrCode);
  },

  // ✅ VALIDAÇÃO
  async validateQRCode(qrCode) {
    return qrCore.validateQRCode(qrCode);
  },

  // ✅ NOVO QR CODE PARA SALA
  async generateNewQRCodeForRoom(roomId) {
    const result = await qrCore.generateViaBackend(roomId);
    return {
      success: result.success,
      data: {
        qrCode: result.qrCode,
        qrImage: result.image,
        room: result.room,
        scanUrl: result.url,
        downloadUrl: `/api/qr/download/${roomId}`
      },
      message: result.success ? 'QR Code gerado' : null,
      error: result.error
    };
  },

  // ✅ TODAS AS SALAS
  async generateAllQRCodes() {
    try {
      const { default: api } = await import('./api');
      const response = await api.post('/rooms/generate-all-qr');
      return {
        success: response?.success || false,
        data: response?.results || null,
        summary: response?.summary || null,
        message: response?.message || null,
        error: response?.error || null
      };
    } catch (error) {
      return {
        success: false,
        data: null,
        error: error.message
      };
    }
  },

  // ✅ FALTANTES
  async generateMissingQRCodes() {
    try {
      const { default: api } = await import('./api');
      const response = await api.post('/qr/generate-missing');
      return {
        success: response?.success || false,
        data: response?.results || null,
        summary: response?.summary || null,
        message: response?.message || null,
        error: response?.error || null
      };
    } catch (error) {
      return {
        success: false,
        data: null,
        error: error.message
      };
    }
  },

  // ✅ RELATÓRIO
  async generateQRReport(format = 'json') {
    try {
      const { default: api } = await import('./api');
      const response = await api.get('/qr/report', {
        params: { format },
        responseType: format === 'csv' ? 'text' : 'json'
      });

      if (format === 'csv') {
        const blob = new Blob([response], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `qr-report-${new Date().toISOString().slice(0, 10)}.csv`;
        link.click();
        return { success: true };
      }

      return {
        success: response?.success || false,
        data: response?.report || null,
        error: response?.message || null
      };
    } catch (error) {
      return {
        success: false,
        data: null,
        error: error.message
      };
    }
  },

  // ✅ STATUS
  async getRoomQRStatus(roomId) {
    try {
      const { default: api } = await import('./api');
      const response = await api.get(`/rooms/${roomId}/qr-status`);
      return {
        success: response?.success || false,
        data: response?.data || null,
        error: response?.message || null
      };
    } catch (error) {
      return {
        success: false,
        data: null,
        error: error.message
      };
    }
  },

  // ✅ QR CODE DE USUÁRIO
  async generateUserQRCode(userId) {
    try {
      const { default: api } = await import('./api');
      const response = await api.post(`/qr/generate-user/${userId}`);
      return {
        success: response?.success || false,
        data: response?.data || null,
        error: response?.message || null
      };
    } catch (error) {
      return {
        success: false,
        data: null,
        error: error.message
      };
    }
  },

  // ⚠️ DEPRECATED - NÃO USAR MAIS
  async generateLocalQRCode() {
    console.warn('⚠️ generateLocalQRCode está depreciado. Use generateQRCode via backend.');
    return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
  }
};

export default qrService;