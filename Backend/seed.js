// Backend/src/seed.js
const bcrypt = require('bcryptjs');
const prisma = require('./utils/database');

async function main() {
  console.log('🌱 Rodando seed...');

  // ADMIN
  const adminEmail = 'admin@limpeza.com';
  const adminPassword = await bcrypt.hash('senha123', 10);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      name: 'Administrador',
      role: 'ADMIN',
      status: 'ACTIVE',
      password: adminPassword,
    },
    create: {
      email: adminEmail,
      name: 'Administrador',
      role: 'ADMIN',
      status: 'ACTIVE',
      password: adminPassword,
    },
  });

  console.log('✅ Admin OK:', admin.email);

  // WORKER (CLEANER)
  const workerEmail = 'funcionario@limpeza.com';
  const workerPassword = await bcrypt.hash('123456', 10);

  const worker = await prisma.user.upsert({
    where: { email: workerEmail },
    update: {
      name: 'Funcionário Teste',
      role: 'CLEANER',      // ou 'SUPERVISOR'
      status: 'ACTIVE',
      password: workerPassword,
    },
    create: {
      email: workerEmail,
      name: 'Funcionário Teste',
      role: 'CLEANER',
      status: 'ACTIVE',
      password: workerPassword,
    },
  });

  console.log('✅ Worker OK:', worker.email, '-', worker.role);

  console.log('🎉 Seed finalizado com sucesso!');
}

main()
  .catch((e) => {
    console.error('❌ Erro no seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
