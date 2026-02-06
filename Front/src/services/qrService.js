// src/services/qrService.js
import api from "./api";

const qrService = {
  /**
   * ✅ GERAR QR CODE PARA UMA SALA
   * @param {string} roomId - ID da sala
   * @param {object} options - Opções (size, format)
   * @returns {Promise}
   */
  async generateQRCode(roomId, options = {}) {
    try {
      console.log(`🔳 Gerando QR Code para sala: ${roomId}`);
      const response = await api.post(`/qr/generate/${roomId}`, options);
      
      return {
        success: !!response?.success,
        data: response?.data || null,
        error: response?.message || null,
      };
    } catch (error) {
      console.error('🔥 Erro ao gerar QR Code:', error);
      return {
        success: false,
        data: null,
        error: error?.message || 'Erro ao gerar QR Code',
      };
    }
  },

  /**
   * ✅ BAIXAR QR CODE
   * @param {string} roomId - ID da sala
   * @param {object} options - Opções (format, size)
   */
  async downloadQRCode(roomId, options = {}) {
    try {
      const { format = 'png', size = 300 } = options;
      console.log(`⬇️  Baixando QR Code para sala: ${roomId}, formato: ${format}`);
      
      const response = await api.get(`/qr/download/${roomId}`, {
        params: { format, size },
        responseType: format === 'svg' ? 'text' : 'blob'
      });

      // Criar link para download
      const blob = format === 'svg' 
        ? new Blob([response], { type: 'image/svg+xml' })
        : response;
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      const roomName = options.roomName || `sala-${roomId}`;
      const fileName = `QR-${roomName.replace(/\s+/g, '-')}.${format}`;
      link.download = fileName;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      return { success: true };
    } catch (error) {
      console.error('🔥 Erro ao baixar QR Code:', error);
      return {
        success: false,
        error: error?.message || 'Erro ao baixar QR Code',
      };
    }
  },

  /**
   * ✅ GERAR QR CODES EM LOTE
   * @param {Array} roomIds - IDs das salas
   * @param {object} options - Opções
   * @returns {Promise}
   */
  async generateBatchQRCodes(roomIds, options = {}) {
    try {
      if (!Array.isArray(roomIds) || roomIds.length === 0) {
        return {
          success: false,
          error: 'Lista de IDs de sala é obrigatória',
        };
      }

      console.log(`🔳 Gerando lote de QR Codes para ${roomIds.length} salas`);
      const response = await api.post('/qr/generate-batch', {
        roomIds,
        ...options,
      });

      return {
        success: !!response?.success,
        data: response?.results || [],
        summary: response?.summary || null,
        error: response?.message || null,
      };
    } catch (error) {
      console.error('🔥 Erro ao gerar QR Codes em lote:', error);
      return {
        success: false,
        data: [],
        error: error?.message || 'Erro ao gerar QR Codes em lote',
      };
    }
  },

  /**
   * ✅ GERAR QR CODE PARA USUÁRIO
   * @param {string} userId - ID do usuário
   * @param {object} options - Opções
   * @returns {Promise}
   */
  async generateUserQRCode(userId, options = {}) {
    try {
      console.log(`👤 Gerando QR Code para usuário: ${userId}`);
      const response = await api.post(`/qr/generate-user/${userId}`, options);

      return {
        success: !!response?.success,
        data: response?.data || null,
        error: response?.message || null,
      };
    } catch (error) {
      console.error('🔥 Erro ao gerar QR Code de usuário:', error);
      return {
        success: false,
        data: null,
        error: error?.message || 'Erro ao gerar QR Code de usuário',
      };
    }
  },

  /**
   * ✅ VALIDAR QR CODE
   * @param {string} qrCode - Código QR
   * @param {object} qrData - Dados do QR (opcional)
   * @returns {Promise}
   */
  async validateQRCode(qrCode, qrData = null) {
    try {
      console.log(`🔍 Validando QR Code: ${qrCode ? qrCode.substring(0, 20) + '...' : 'dados fornecidos'}`);
      const response = await api.post('/qr/validate', {
        qrCode,
        qrData,
      });

      return {
        success: !!response?.success,
        data: response?.data || null,
        valid: response?.valid || false,
        message: response?.message || null,
        error: response?.error || null,
      };
    } catch (error) {
      console.error('🔥 Erro ao validar QR Code:', error);
      return {
        success: false,
        data: null,
        valid: false,
        error: error?.message || 'Erro ao validar QR Code',
      };
    }
  },

  /**
   * ✅ GERAR QR CODES FALTANTES
   * @returns {Promise}
   */
  async generateMissingQRCodes() {
    try {
      console.log('🔳 Gerando QR Codes faltantes');
      const response = await api.post('/qr/generate-missing');

      return {
        success: !!response?.success,
        data: response?.results || null,
        summary: response?.summary || null,
        message: response?.message || null,
        error: response?.error || null,
      };
    } catch (error) {
      console.error('🔥 Erro ao gerar QR Codes faltantes:', error);
      return {
        success: false,
        data: null,
        error: error?.message || 'Erro ao gerar QR Codes faltantes',
      };
    }
  },

  /**
   * ✅ GERAR RELATÓRIO DE QR CODES
   * @param {string} format - Formato (json, csv)
   * @returns {Promise}
   */
  async generateQRReport(format = 'json') {
    try {
      console.log('📊 Gerando relatório de QR Codes');
      const response = await api.get('/qr/report', {
        params: { format },
        responseType: format === 'csv' ? 'text' : 'json',
      });

      if (format === 'csv') {
        // Criar download do CSV
        const blob = new Blob([response], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `qr-report-${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);

        return { success: true };
      }

      return {
        success: !!response?.success,
        data: response?.report || null,
        error: response?.message || null,
      };
    } catch (error) {
      console.error('🔥 Erro ao gerar relatório de QR Codes:', error);
      return {
        success: false,
        data: null,
        error: error?.message || 'Erro ao gerar relatório',
      };
    }
  },

  /**
   * ✅ ESCANEAR QR CODE DA SALA
   * @param {string} qrCode - Código QR
   * @returns {Promise}
   */
  async scanRoomQRCode(qrCode) {
    try {
      if (!qrCode || qrCode.trim() === '') {
        return {
          success: false,
          error: 'QR Code é obrigatório',
        };
      }

      console.log(`🔍 Escaneando QR Code: ${qrCode.substring(0, 30)}...`);
      const response = await api.get(`/rooms/qr/${encodeURIComponent(qrCode)}`);

      return {
        success: !!response?.success,
        data: {
          room: response?.room || null,
          isBeingCleaned: response?.isBeingCleaned || false,
          currentCleaner: response?.currentCleaner || null,
          message: response?.message || null,
          scanInfo: response?.scanInfo || null,
        },
        error: response?.message || null,
      };
    } catch (error) {
      console.error('🔥 Erro ao escanear QR Code:', error);
      return {
        success: false,
        data: null,
        error: error?.message || 'Erro ao escanear QR Code',
      };
    }
  },

  /**
   * ✅ GERAR NOVO QR CODE PARA SALA
   * @param {string} roomId - ID da sala
   * @param {boolean} generateImage - Gerar imagem também
   * @returns {Promise}
   */
  async generateNewQRCodeForRoom(roomId, generateImage = false) {
    try {
      console.log(`🔳 Gerando novo QR Code para sala: ${roomId}`);
      const response = await api.post(`/rooms/${roomId}/generate-qr`, {
        generateImage,
      });

      return {
        success: !!response?.success,
        data: {
          qrCode: response?.qrCode || null,
          qrImage: response?.qrImage || null,
          room: response?.room || null,
          scanUrl: response?.scanUrl || null,
          downloadUrl: response?.downloadUrl || null,
        },
        message: response?.message || null,
        error: response?.error || null,
      };
    } catch (error) {
      console.error('🔥 Erro ao gerar novo QR Code:', error);
      return {
        success: false,
        data: null,
        error: error?.message || 'Erro ao gerar novo QR Code',
      };
    }
  },

  /**
   * ✅ GERAR QR CODES PARA TODAS AS SALAS
   * @returns {Promise}
   */
  async generateAllQRCodes() {
    try {
      console.log('🔳 Gerando QR Codes para todas as salas');
      const response = await api.post('/rooms/generate-all-qr');

      return {
        success: !!response?.success,
        data: response?.results || null,
        summary: response?.summary || null,
        message: response?.message || null,
        error: response?.error || null,
      };
    } catch (error) {
      console.error('🔥 Erro ao gerar QR Codes para todas as salas:', error);
      return {
        success: false,
        data: null,
        error: error?.message || 'Erro ao gerar QR Codes',
      };
    }
  },

  /**
   * ✅ VERIFICAR STATUS DO QR CODE DA SALA
   * @param {string} roomId - ID da sala
   * @returns {Promise}
   */
  async getRoomQRStatus(roomId) {
    try {
      console.log(`🔍 Verificando status do QR Code da sala: ${roomId}`);
      const response = await api.get(`/rooms/${roomId}/qr-status`);

      return {
        success: !!response?.success,
        data: response?.data || null,
        error: response?.message || null,
      };
    } catch (error) {
      console.error('🔥 Erro ao verificar status do QR Code:', error);
      return {
        success: false,
        data: null,
        error: error?.message || 'Erro ao verificar status do QR Code',
      };
    }
  },

  /**
   * ✅ CRIAR QR CODE PARA IMPRESSÃO
   * Abre uma nova janela com o QR Code formatado para impressão
   * @param {string} roomId - ID da sala
   * @param {object} roomData - Dados da sala (opcional)
   */
  async printQRCode(roomId, roomData = null) {
    try {
      const printUrl = `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/print-qr/${roomId}`;
      const printWindow = window.open(printUrl, '_blank', 'width=800,height=600');
      
      if (!printWindow) {
        throw new Error('Não foi possível abrir a janela de impressão. Verifique o bloqueador de pop-ups.');
      }

      return { success: true };
    } catch (error) {
      console.error('🔥 Erro ao abrir impressão do QR Code:', error);
      return {
        success: false,
        error: error?.message || 'Erro ao abrir impressão do QR Code',
      };
    }
  },

  /**
   * ✅ GERAR QR CODE LOCALMENTE (sem backend)
   * Útil para testes e desenvolvimento
   * @param {object} data - Dados para o QR Code
   * @param {object} options - Opções do QR Code
   * @returns {Promise<string>} - Data URL da imagem
   */
  async generateLocalQRCode(data, options = {}) {
    try {
      // Usar biblioteca QRCode se disponível
      if (typeof QRCode !== 'undefined') {
        const qrCode = await QRCode.toDataURL(JSON.stringify(data), {
          errorCorrectionLevel: 'H',
          margin: 2,
          width: options.size || 300,
          color: {
            dark: options.darkColor || '#1976d2',
            light: options.lightColor || '#ffffff',
          },
        });
        return qrCode;
      } else {
        // Fallback: usar API do backend
        const tempData = {
          ...data,
          localGeneration: true,
          timestamp: Date.now(),
        };
        
        const response = await api.post('/qr/validate', {
          qrData: tempData,
        });

        // Retornar um placeholder
        return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjMwMCIgdmlld0JveD0iMCAwIDMwMCAzMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjMwMCIgaGVpZ2h0PSIzMDAiIGZpbGw9IiNGRkZGRkUiLz48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjE0IiBmaWxsPSIjMTk3NmQyIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+UVItQ09ERSBQUkVTU0lWRUw8L3RleHQ+PC9zdmc+';
      }
    } catch (error) {
      console.error('🔥 Erro ao gerar QR Code local:', error);
      throw error;
    }
  }
};

export default qrService;