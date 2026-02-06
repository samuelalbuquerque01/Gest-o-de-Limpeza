// server.js - pronto para Render (0.0.0.0 + process.env.PORT)
require('dotenv').config();

const config = require('./config');
const app = require('./src/app');
const logger = require('./src/utils/logger');

// Prisma singleton do projeto
const prisma = require('./src/utils/database');

console.log('='.repeat(60));
console.log('🚀 INICIANDO SISTEMA DE GESTÃO DE LIMPEZA');
console.log('='.repeat(60));

async function startServer() {
  try {
    const PORT = process.env.PORT || config?.app?.port || 5000;
    const HOST = '0.0.0.0';

    console.log('📝 Configurações carregadas:');
    console.log(`- Porta: ${PORT}`);
    console.log(`- Ambiente: ${process.env.NODE_ENV || config?.nodeEnv || 'development'}`);
    console.log(`- Banco de dados: ${process.env.DATABASE_URL ? 'Configurado' : 'Não configurado'}`);

    // Conectar ao banco de dados
    await prisma.$connect();
    console.log('✅ Conectado ao banco de dados PostgreSQL');

    // Verificar conexão com banco
    try {
      const userCount = await prisma.user.count();
      console.log(`✅ Banco OK: ${userCount} usuários encontrados`);
    } catch (dbError) {
      console.error('❌ Erro no banco de dados:', dbError.message);
      console.log('📋 Execute as migrações: npx prisma migrate deploy');
    }

    // Iniciar servidor (Render precisa 0.0.0.0 + PORT)
    const server = app.listen(PORT, HOST, () => {
      console.log('\n' + '='.repeat(60));
      console.log('🎉 BACKEND INICIADO COM SUCESSO!');
      console.log('='.repeat(60));
      console.log(`📡 Escutando em: http://${HOST}:${PORT}`);
      console.log(`🩺 Health Check: http://${HOST}:${PORT}/api/health`);
      console.log('='.repeat(60));

      // Testar rotas automaticamente só em DEV
      if (process.env.NODE_ENV !== 'production') {
        setTimeout(() => {
          console.log('\n🔍 Testando rotas principais...');
          testRoutes(PORT);
        }, 800);
      }
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
 * Testar rotas automaticamente (apenas DEV)
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
      if (passed === total) console.log('🎉 Todas as rotas estão funcionando!');
      else console.log('⚠️  Algumas rotas podem estar com problemas');
    }
  };

  routes.forEach((route) => {
    const options = {
      hostname: '127.0.0.1',
      port,
      path: route.path,
      method: route.method,
    };

    const req = http.request(options, (res) => {
      res.on('data', () => {});
      res.on('end', () => {
        const ok = res.statusCode === 200;
        finishOne(ok, route.name, res.statusCode);
      });
      res.resume();
    });

    req.setTimeout(5000, () => req.destroy(new Error('TIMEOUT')));

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
