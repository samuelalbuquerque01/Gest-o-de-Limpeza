const QRCode = require('qrcode');
const crypto = require('crypto');
const logger = require('../utils/logger');

class QRService {
  /**
   * Gerar QR Code para uma sala
   * @param {Object} roomData - Dados da sala
   * @returns {Promise<string>} - Base64 do QR Code
   */
  static async generateRoomQRCode(roomData) {
    try {
      const { id, name, type, location } = roomData;
      
      // Criar payload seguro
      const payload = {
        id,
        name,
        type,
        location,
        timestamp: Date.now(),
        checksum: this.generateChecksum(id, Date.now())
      };

      const qrData = JSON.stringify(payload);
      const qrCode = await QRCode.toDataURL(qrData, {
        errorCorrectionLevel: 'H',
        width: 300,
        margin: 2,
        color: {
          dark: '#1976d2',
          light: '#ffffff'
        }
      });

      logger.debug('QR Code gerado', { roomId: id });
      
      return qrCode;
    } catch (error) {
      logger.error('Erro ao gerar QR Code', error);
      throw error;
    }
  }

  /**
   * Gerar QR Code para um funcionário
   * @param {Object} userData - Dados do funcionário
   * @returns {Promise<string>} - Base64 do QR Code
   */
  static async generateUserQRCode(userData) {
    try {
      const { id, name, role } = userData;
      
      const payload = {
        id,
        name,
        role,
        timestamp: Date.now(),
        type: 'user',
        checksum: this.generateChecksum(id, Date.now())
      };

      const qrData = JSON.stringify(payload);
      const qrCode = await QRCode.toDataURL(qrData, {
        errorCorrectionLevel: 'H',
        width: 300,
        margin: 2,
        color: {
          dark: '#4caf50',
          light: '#ffffff'
        }
      });

      logger.debug('QR Code de funcionário gerado', { userId: id });
      
      return qrCode;
    } catch (error) {
      logger.error('Erro ao gerar QR Code de funcionário', error);
      throw error;
    }
  }

  /**
   * Validar checksum do QR Code
   * @param {string} id - ID do recurso
   * @param {number} timestamp - Timestamp
   * @param {string} checksum - Checksum a ser validado
   * @returns {boolean} - Se é válido
   */
  static validateChecksum(id, timestamp, checksum) {
    const expectedChecksum = this.generateChecksum(id, timestamp);
    return checksum === expectedChecksum;
  }

  /**
   * Gerar checksum para validação
   * @private
   */
  static generateChecksum(id, timestamp) {
    const secret = process.env.QR_SECRET || 'gestao-limpeza-secret';
    const data = `${id}:${timestamp}:${secret}`;
    
    return crypto
      .createHash('sha256')
      .update(data)
      .digest('hex')
      .substring(0, 16);
  }

  /**
   * Decodificar QR Code
   * @param {string} qrCode - String do QR Code
   * @returns {Object} - Dados decodificados
   */
  static decodeQRCode(qrCode) {
    try {
      // Remover prefixo data:image/png;base64, se existir
      const base64Data = qrCode.includes('base64,') 
        ? qrCode.split('base64,')[1]
        : qrCode;

      // Em um sistema real, aqui você usaria uma biblioteca de leitura de QR
      // Como estamos gerando, assumimos que o qrCode já é o payload
      return JSON.parse(Buffer.from(base64Data, 'base64').toString('utf8'));
    } catch (error) {
      logger.error('Erro ao decodificar QR Code', error);
      throw new Error('QR Code inválido');
    }
  }

  /**
   * Gerar QR Codes em lote
   * @param {Array} items - Array de itens (salas ou usuários)
   * @param {string} type - Tipo ('room' ou 'user')
   * @returns {Promise<Array>} - Array de objetos com QR Codes
   */
  static async generateBatchQRCodes(items, type = 'room') {
    try {
      const qrPromises = items.map(async (item) => {
        const qrCode = type === 'room' 
          ? await this.generateRoomQRCode(item)
          : await this.generateUserQRCode(item);

        return {
          ...item,
          qrCode,
          qrData: this.decodeQRCode(qrCode)
        };
      });

      const results = await Promise.all(qrPromises);
      
      logger.info('QR Codes gerados em lote', { 
        count: results.length,
        type 
      });
      
      return results;
    } catch (error) {
      logger.error('Erro ao gerar QR Codes em lote', error);
      throw error;
    }
  }

  /**
   * Gerar QR Code para download
   * @param {Object} data - Dados para o QR Code
   * @param {Object} options - Opções de geração
   * @returns {Promise<Buffer>} - Buffer da imagem
   */
  static async generateQRCodeBuffer(data, options = {}) {
    try {
      const {
        errorCorrectionLevel = 'H',
        width = 300,
        margin = 2,
        darkColor = '#1976d2',
        lightColor = '#ffffff'
      } = options;

      const qrData = typeof data === 'string' ? data : JSON.stringify(data);
      
      return await QRCode.toBuffer(qrData, {
        errorCorrectionLevel,
        width,
        margin,
        color: {
          dark: darkColor,
          light: lightColor
        },
        type: 'png'
      });
    } catch (error) {
      logger.error('Erro ao gerar buffer do QR Code', error);
      throw error;
    }
  }

  /**
   * Verificar validade do QR Code
   * @param {Object} qrData - Dados do QR Code
   * @returns {Object} - Resultado da validação
   */
  static validateQRCode(qrData) {
    try {
      const { id, timestamp, checksum, type } = qrData;
      
      if (!id || !timestamp || !checksum) {
        return {
          isValid: false,
          error: 'Dados do QR Code incompletos'
        };
      }

      // Verificar timestamp (não mais velho que 30 dias)
      const age = Date.now() - timestamp;
      const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 dias

      if (age > maxAge) {
        return {
          isValid: false,
          error: 'QR Code expirado',
          age
        };
      }

      // Validar checksum
      const isValidChecksum = this.validateChecksum(id, timestamp, checksum);
      
      if (!isValidChecksum) {
        return {
          isValid: false,
          error: 'QR Code inválido (checksum)'
        };
      }

      return {
        isValid: true,
        type: type || 'room',
        id,
        timestamp: new Date(timestamp)
      };
    } catch (error) {
      logger.error('Erro ao validar QR Code', error);
      return {
        isValid: false,
        error: 'Erro na validação'
      };
    }
  }
}

module.exports = QRService;