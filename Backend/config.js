// config.js - VERSÃO COMPLETA E ajustada
require('dotenv').config();

console.log('🔧 Carregando configurações do sistema...');
console.log('PORT do ambiente:', process.env.PORT);
console.log('NODE_ENV:', process.env.NODE_ENV);

const config = {
  // App
  app: {
    name: process.env.APP_NAME || 'Sistema de Gestão de Limpeza',
    version: process.env.APP_VERSION || '1.0.0',
    port: parseInt(process.env.PORT) || 5000,
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3001'
  },
  
  // Environment
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // JWT
  jwt: {
    secret: process.env.JWT_SECRET || 'sua_chave_secreta_super_segura_aqui_altere_em_producao',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h'
  },
  
  // Database
  database: {
    url: process.env.DATABASE_URL || 'postgresql://postgres:1234@localhost:5432/gestao-de-limpeza?schema=public',
    poolMin: parseInt(process.env.DB_POOL_MIN) || 2,
    poolMax: parseInt(process.env.DB_POOL_MAX) || 10
  },
  
  // Rate Limit
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: parseInt(process.env.RATE_LIMIT_MAX) || 1000
  },
  
  // CORS
  cors: {
    origins: process.env.CORS_ORIGINS 
      ? process.env.CORS_ORIGINS.split(',') 
      : ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:5173']
  },
  
  // Logging - ESSA SEÇÃO É OBRIGATÓRIA PARA O logger.js FUNCIONAR
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    dir: process.env.LOG_DIR || 'logs'
  },
  
  // Security
  security: {
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS) || 10,
    requestSizeLimit: process.env.REQUEST_SIZE_LIMIT || '10mb'
  },
  
  // Default Admin
  defaultAdmin: {
    email: process.env.DEFAULT_ADMIN_EMAIL || 'admin@limpeza.com',
    password: process.env.DEFAULT_ADMIN_PASSWORD || 'senha123',
    name: process.env.DEFAULT_ADMIN_NAME || 'Administrador'
  }
};

// Debug: mostrar configurações carregadas
console.log('✅ Configurações carregadas:');
console.log(`   Porta: ${config.app.port}`);
console.log(`   Ambiente: ${config.nodeEnv}`);
console.log(`   CORS Origins: ${config.cors.origins.join(', ')}`);
console.log(`   Log Level: ${config.logging.level}`);
console.log(`   Log Dir: ${config.logging.dir}`);

module.exports = config;