// src/services/qrCore.js - servico principal de QR Code
import api from './api';
import QRCode from 'qrcode';

/**
 *  SERVIÇO CENTRALIZADO DE QR CODE
 * ÚNICO lugar que deve conter lógica de QR Code
 */
class QrCoreService {
  constructor() {
    this.baseUrl = process.env.REACT_APP_FRONTEND_URL || 'https://gest-o-de-limpeza.onrender.com';
  }

  /**
   *  GERA A URL PADRÃO DO QR CODE
   * TODOS os QR Codes usam este formato
   */
  generateRoomUrl(room) {
    if (!room?.id) throw new Error('Sala inválida');
    const qrCode = room.qrCode || `QR-${room.type}-${room.id.slice(0, 4)}`;
    return `${this.baseUrl}/scan?roomId=${room.id}&qr=${encodeURIComponent(qrCode)}`;
  }

  /**
   *  GERA URL PARA CHECK-IN DE FUNCIONÁRIO
   */
  generateUserUrl(user) {
    if (!user?.id) throw new Error('Usuário inválido');
    return `${this.baseUrl}/worker/checkin?userId=${user.id}&name=${encodeURIComponent(user.name || '')}`;
  }

  /**
   *  GERA IMAGEM DO QR CODE VIA BACKEND (RECOMENDADO)
   * Usa o endpoint que já está funcionando perfeitamente
   */
  async generateViaBackend(roomId, options = {}) {
    try {
      const response = await api.post(`/qr/generate/${roomId}`, {
        size: options.size || 300,
        format: options.format || 'png',
        color: options.color || '#1976d2',
        backgroundColor: options.backgroundColor || '#ffffff',
        margin: options.margin || 2,
        errorCorrection: options.errorCorrection || 'H'
      });

      return {
        success: true,
        image: response.data?.qrImage,
        url: response.data?.qrContent || response.data?.qrURL,
        qrCode: response.data?.qrCode,
        room: response.data?.room
      };
    } catch (error) {
      console.error('❌ Erro no backend:', error);
      return {
        success: false,
        error: error?.message || 'Erro ao gerar QR Code no servidor'
      };
    }
  }

  /**
   *  GERA QR CODE LOCALMENTE (APENAS FALLBACK)
   * Usado apenas quando backend está indisponível
   */
  async generateLocal(room) {
    try {
      const url = this.generateRoomUrl(room);
      const image = await QRCode.toDataURL(url, {
        errorCorrectionLevel: 'H',
        margin: 2,
        width: 300,
        color: { dark: '#1976d2', light: '#ffffff' }
      });

      return {
        success: true,
        image,
        url,
        qrCode: room.qrCode,
        room,
        fallback: true
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   *  GERA QR CODE (AUTOMÁTICO - TENTA BACKEND, FALLBACK LOCAL)
   */
  async generateQRCode(room, options = {}) {
    // Tenta backend primeiro
    const backend = await this.generateViaBackend(room.id, options);
    if (backend.success) return backend;

    // Fallback local
    console.warn('⚠️ Usando fallback local para gerar QR Code');
    return this.generateLocal(room);
  }

  /**
   *  BAIXA QR CODE VIA BACKEND
   */
  async downloadQRCode(roomId, roomName, format = 'png') {
    try {
      const response = await api.get(`/qr/download/${roomId}`, {
        params: { format, size: 300 },
        responseType: format === 'svg' ? 'text' : 'blob'
      });

      const blob = format === 'svg' 
        ? new Blob([response], { type: 'image/svg+xml' })
        : response;
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `QR-${roomName.replace(/\s+/g, '-')}.${format}`;
      link.click();
      
      setTimeout(() => {
        window.URL.revokeObjectURL(url);
        link.remove();
      }, 100);

      return { success: true };
    } catch (error) {
      console.error('❌ Erro ao baixar:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   *  IMPRIME QR CODE
   */
  async printQRCode(roomId) {
    try {
      const resolvedRoomId = typeof roomId === 'string' ? roomId.trim() : '';
      if (!resolvedRoomId) {
        throw new Error('ID da sala inválido para impressão');
      }

      const envApiUrl =
        process.env.REACT_APP_API_URL ||
        process.env.REACT_APP_BACKEND_URL ||
        '';

      const baseFromApi =
        typeof api?.defaults?.baseURL === 'string' ? api.defaults.baseURL : '';

      const rawBase = envApiUrl || baseFromApi;
      const backendOrigin = rawBase.startsWith('http')
        ? rawBase.replace(/\/api\/?$/, '')
        : window.location.origin;

      const printUrl = `${backendOrigin}/api/qr/print/${encodeURIComponent(resolvedRoomId)}`;
      const printWindow = window.open(printUrl, '_blank', 'width=800,height=600');
      
      if (!printWindow) {
        throw new Error('Bloqueador de pop-ups detectado');
      }
      
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   *  GERA LOTE DE QR CODES
   */
  async generateBatch(roomIds) {
    try {
      const response = await api.post('/qr/generate-batch', { roomIds });
      return {
        success: response?.success || false,
        results: response?.results || [],
        summary: response?.summary || { total: roomIds.length, successful: 0, failed: 0 }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        results: [],
        summary: { total: roomIds.length, successful: 0, failed: roomIds.length }
      };
    }
  }

  /**
   *  VALIDA QR CODE
   */
  async validateQRCode(qrCode) {
    try {
      const response = await api.post('/qr/validate', { qrCode });
      return {
        valid: response?.valid || false,
        data: response?.data || null,
        message: response?.message || ''
      };
    } catch (error) {
      return { valid: false, error: error.message };
    }
  }

  /**
   *  ESCANEA QR CODE (ENDPOINT ESPECÍFICO)
   */
  async scanQRCode(qrCode) {
    try {
      const response = await api.get(`/rooms/qr/${encodeURIComponent(qrCode)}`);
      return {
        success: response?.success || false,
        room: response?.room || null,
        isBeingCleaned: response?.isBeingCleaned || false,
        currentCleaner: response?.currentCleaner || null,
        message: response?.message || ''
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        room: null
      };
    }
  }
}

//  EXPORTA INSTÂNCIA ÚNICA (SINGLETON)
const qrCore = new QrCoreService();
export default qrCore;
