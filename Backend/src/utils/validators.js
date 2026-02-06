const Joi = require('joi');

const validators = {
  // Validação de login
  login: Joi.object({
    email: Joi.string().email().required().messages({
      'string.email': 'Email inválido',
      'any.required': 'Email é obrigatório'
    }),
    password: Joi.string().min(3).required().messages({
      'string.min': 'Senha deve ter no mínimo 3 caracteres',
      'any.required': 'Senha é obrigatória'
    })
  }),

  // Validação de usuário
  user: Joi.object({
    name: Joi.string().min(2).max(100).required().messages({
      'string.min': 'Nome deve ter no mínimo 2 caracteres',
      'string.max': 'Nome deve ter no máximo 100 caracteres',
      'any.required': 'Nome é obrigatório'
    }),
    email: Joi.string().email().required().messages({
      'string.email': 'Email inválido',
      'any.required': 'Email é obrigatório'
    }),
    phone: Joi.string().pattern(/^[0-9\s\-\(\)]+$/).optional().allow('', null).messages({
      'string.pattern.base': 'Telefone deve conter apenas números, espaços, hífens e parênteses'
    }),
    role: Joi.string().valid('ADMIN', 'SUPERVISOR', 'CLEANER').optional().default('CLEANER').messages({
      'any.only': 'Cargo inválido. Use: ADMIN, SUPERVISOR ou CLEANER'
    }),
    password: Joi.string().min(3).optional().messages({
      'string.min': 'Senha deve ter no mínimo 3 caracteres'
    }),
    status: Joi.string().valid('ACTIVE', 'INACTIVE', 'ON_LEAVE').optional().default('ACTIVE')
  }),

  // Validação de sala
  room: Joi.object({
    name: Joi.string().min(2).max(100).required().messages({
      'string.min': 'Nome deve ter no mínimo 2 caracteres',
      'string.max': 'Nome deve ter no máximo 100 caracteres',
      'any.required': 'Nome é obrigatório'
    }),
    type: Joi.string().valid('ROOM', 'BATHROOM', 'KITCHEN', 'MEETING_ROOM').optional().default('ROOM').messages({
      'any.only': 'Tipo inválido. Use: ROOM, BATHROOM, KITCHEN ou MEETING_ROOM'
    }),
    location: Joi.string().min(2).max(200).required().messages({
      'string.min': 'Localização deve ter no mínimo 2 caracteres',
      'string.max': 'Localização deve ter no máximo 200 caracteres',
      'any.required': 'Localização é obrigatória'
    }),
    description: Joi.string().max(500).optional().allow('', null),
    priority: Joi.string().valid('LOW', 'MEDIUM', 'HIGH', 'URGENT').optional().default('MEDIUM'),
    notes: Joi.string().max(1000).optional().allow('', null)
  }),

  // Validação de limpeza
  cleaning: Joi.object({
    roomId: Joi.string().required().messages({
      'any.required': 'ID da sala é obrigatório'
    }),
    checklist: Joi.object().optional(),
    notes: Joi.string().max(1000).optional().allow('', null)
  }),

  // Validação de QR Code
  qrScan: Joi.object({
    qrCode: Joi.string().min(5).required().messages({
      'string.min': 'QR Code inválido',
      'any.required': 'QR Code é obrigatório'
    })
  }),

  // Validação de filtros
  filters: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    search: Joi.string().optional().allow('', null),
    status: Joi.string().optional().allow('', null),
    type: Joi.string().optional().allow('', null),
    startDate: Joi.string().optional().allow('', null),
    endDate: Joi.string().optional().allow('', null)
  }),

  // Validação de relatório
  report: Joi.object({
    type: Joi.string().valid('DAILY', 'WEEKLY', 'MONTHLY', 'CUSTOM').optional().default('DAILY'),
    period: Joi.string().optional().allow('', null),
    startDate: Joi.string().optional().allow('', null),
    endDate: Joi.string().optional().allow('', null)
  })
};

/**
 * Middleware de validação
 */
const validate = (schema, property = 'body') => {
  return (req, res, next) => {
    const { error } = schema.validate(req[property], {
      abortEarly: false,
      allowUnknown: property === 'query' || property === 'params'
    });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));

      console.log('❌ [VALIDATE] Erro de validação:', {
        route: req.originalUrl,
        errors
      });

      return res.status(400).json({
        success: false,
        message: 'Erro de validação',
        errors
      });
    }

    next();
  };
};

module.exports = {
  validators,
  validate
};