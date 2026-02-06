const winston = require('winston');
const path = require('path');
const config = require('../../config');

// Definir formato personalizado
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// Criar logger
const logger = winston.createLogger({
  level: config.logging.level,
  format: logFormat,
  defaultMeta: { service: 'limpeza-api' },
  transports: [
    // Console para desenvolvimento
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(
          info => `${info.timestamp} ${info.level}: ${info.message}`
        )
      )
    }),
    // Arquivo para erros
    new winston.transports.File({
      filename: path.join(config.logging.dir, 'error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    // Arquivo para todos os logs
    new winston.transports.File({
      filename: path.join(config.logging.dir, 'combined.log'),
      maxsize: 5242880,
      maxFiles: 10
    })
  ]
});

// Criar pasta de logs se não existir
const fs = require('fs');
if (!fs.existsSync(config.logging.dir)) {
  fs.mkdirSync(config.logging.dir, { recursive: true });
}

// Funções auxiliares
const log = {
  info: (message, meta = {}) => {
    logger.info(message, meta);
  },
  
  error: (message, error = null) => {
    if (error instanceof Error) {
      logger.error(`${message}: ${error.message}`, { stack: error.stack });
    } else {
      logger.error(message, { error });
    }
  },
  
  warn: (message, meta = {}) => {
    logger.warn(message, meta);
  },
  
  debug: (message, meta = {}) => {
    logger.debug(message, meta);
  },
  
  // Log de requisições HTTP
  http: (req, res, next) => {
    const start = Date.now();
    
    res.on('finish', () => {
      const duration = Date.now() - start;
      const logMessage = `${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`;
      
      if (res.statusCode >= 400) {
        logger.warn(logMessage, {
          method: req.method,
          url: req.originalUrl,
          status: res.statusCode,
          duration,
          userAgent: req.get('user-agent'),
          ip: req.ip
        });
      } else {
        logger.info(logMessage, {
          method: req.method,
          url: req.originalUrl,
          status: res.statusCode,
          duration
        });
      }
    });
    
    next();
  }
};

module.exports = log;