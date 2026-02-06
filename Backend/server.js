// server.js - VERSÃO COMPLETA (corrigida de verdade)
require('dotenv').config();
const config = require('./config');
const app = require('./src/app'); // seu app.js (rotas)
const logger = require('./src/utils/logger');

// ✅ Use o Prisma singleton do seu projeto (não crie outro PrismaClient)
const prisma = require('./src/utils/database');

console.log('='.repeat(60));
console.log('🚀 INICIANDO SISTEMA DE GESTÃO DE LIMPEZA');
console.log('='.repeat(60));

/**
 * Função para iniciar o servidor
 */
async function startServer() {
  try {
    console.log('📝 Configurações carregadas:');
    console.log(`- Porta: ${config.app.port}`);
    console.log(`- Ambiente: ${config.nodeEnv}`);
    console.log(`- Banco de dados: ${config.database.url ? 'Configurado' : 'Não configurado'}`);

    // Conectar ao banco de dados
    await prisma.$connect();
    console.log('✅ Conectado ao banco de dados PostgreSQL');

    // Verificar conexão com banco
    try {
      const userCount = await prisma.user.count();
      console.log(`✅ Banco OK: ${userCount} usuários encontrados`);
    } catch (dbError) {
      console.error('❌ Erro no banco de dados:', dbError.message);
      console.log('📋 Execute as migrações: npx prisma migrate dev --name init');
    }

    // Iniciar servidor
    const PORT = config.app.port;
    const server = app.listen(PORT, 'localhost', () => {
      console.log('\n' + '='.repeat(60));
      console.log('🎉 BACKEND INICIADO COM SUCESSO!');
      console.log('='.repeat(60));
      console.log(`📡 URL: http://localhost:${PORT}`);
      console.log(`🩺 Health Check: http://localhost:${PORT}/api/health`);
      console.log(`👥 Cleaners: http://localhost:${PORT}/api/cleaners`);
      console.log(`🚪 Rooms: http://localhost:${PORT}/api/rooms/available`);
      console.log(`🧹 Start Cleaning: POST http://localhost:${PORT}/api/cleaning/start`);
      console.log(`✅ Complete Cleaning: POST http://localhost:${PORT}/api/cleaning/complete`);
      console.log(`📊 Cleaning History: GET http://localhost:${PORT}/api/cleaning/history`);
      console.log(`🔐 Admin Login: POST http://localhost:${PORT}/api/auth/login`);
      console.log('='.repeat(60));
      console.log('⚙️  Para parar: Ctrl+C');
      console.log('='.repeat(60));

      // Testar rotas automaticamente (1x, sem TIMEOUT fantasma)
      setTimeout(() => {
        console.log('\n🔍 Testando rotas principais...');
        testRoutes(PORT);
      }, 800);
    });

    // Graceful shutdown
    const shutdown = async () => {
      console.log('\n📴 Recebido sinal de desligamento...');

      server.close(async () => {
        console.log('✅ Servidor HTTP encerrado');

        try {
          await prisma.$disconnect();
          console.log('✅ Conexão com banco de dados encerrada');
        } catch (e) {
          console.error('⚠️ Erro ao desconectar Prisma:', e.message);
        }

        console.log('👋 Sistema encerrado com sucesso');
        process.exit(0);
      });

      // Forçar encerramento após 10 segundos
      setTimeout(() => {
        console.error('❌ Timeout no graceful shutdown, forçando encerramento');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);

    process.on('uncaughtException', (error) => {
      console.error('❌ Erro não capturado:', error.message);
      console.error('Stack:', error.stack);
      shutdown();
    });

    process.on('unhandledRejection', (reason) => {
      console.error('❌ Promise rejeitada não tratada:', reason);
      shutdown();
    });
  } catch (error) {
    console.error('❌ Falha ao iniciar servidor:', error.message);
    console.error('Stack:', error.stack);

    try {
      await prisma.$disconnect();
    } catch (e) {}

    process.exit(1);
  }
}

/**
 * ✅ Testar rotas automaticamente (sem TIMEOUT depois do 200)
 */
function testRoutes(port) {
  const http = require('http');

  const routes = [
    { path: '/api/health', method: 'GET', name: 'Health Check' },
    { path: '/api/rooms/available', method: 'GET', name: 'Salas Disponíveis' },
    { path: '/api/cleaners', method: 'GET', name: 'Listar Funcionários' },
  ];

  let passed = 0;
  let completed = 0;
  const total = routes.length;

  const finishOne = (ok, name, status) => {
    completed += 1;
    if (ok) passed += 1;

    console.log(`   ${ok ? '✅' : '⚠️ '} ${name}: ${status}`);

    if (completed === total) {
      console.log(`\n📊 Resultado: ${passed}/${total} testes passaram`);
      if (passed === total) {
        console.log('🎉 Todas as rotas estão funcionando!');
      } else {
        console.log('⚠️  Algumas rotas podem estar com problemas');
      }
    }
  };

  routes.forEach((route) => {
    const options = {
      hostname: 'localhost',
      port,
      path: route.path,
      method: route.method,
    };

    const req = http.request(options, (res) => {
      // ✅ MUITO IMPORTANTE: consumir/fechar o response para não ficar pendurado
      res.on('data', () => {});
      res.on('end', () => {
        const ok = res.statusCode === 200;
        finishOne(ok, route.name, res.statusCode);
      });
      res.resume();
    });

    // ✅ timeout real do request
    req.setTimeout(5000, () => {
      req.destroy(new Error('TIMEOUT'));
    });

    req.on('error', (err) => {
      const code = err?.message === 'TIMEOUT' ? 'TIMEOUT' : err.code || err.message;
      finishOne(false, route.name, code);
    });

    req.end();
  });
}

// Iniciar servidor
if (require.main === module) {
  startServer();
}

module.exports = { app, prisma };
