// database.js
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  log: ['warn', 'error'], // bem mais leve que query/info
});

module.exports = prisma;
