
const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')
const prisma = new PrismaClient()

async function main() {
  console.log('🗑️  Limpiando base de datos...');

  // Limpiar datos en orden inverso a dependencias
  await prisma.saleItemBatchAllocation.deleteMany();
  await prisma.saleItem.deleteMany();
  await prisma.sale.deleteMany();
  await prisma.stockBatch.deleteMany();
  await prisma.productCatalog.deleteMany();
  await prisma.expense.deleteMany();
  await prisma.user.deleteMany();
  await prisma.systemConfig.deleteMany();

  console.log('🌱 Sembrando datos iniciales...');

  // 1. Configuración del Sistema
  await prisma.systemConfig.create({
    data: {
      id: 1,
      ivaPercentage: 21.0,
      extraTaxPercentage: 3.0,
      expiryAlertMonths: 3,
      filterMinYear: 2020,
      filterMaxYear: 2050
    }
  });

  // 2. Usuario Admin
  const email = 'guillermo.diarte@gmail.com';
  // Hash password
  const password = await bcrypt.hash('123456', 10);

  await prisma.user.create({
    data: {
      name: 'Guillermo',
      email: email,
      password: password,
      role: 'ADMIN',
    }
  });

  console.log('✅ Base de datos reseteada.');
  console.log('👤 Usuario: guillermo.diarte@gmail.com');
  console.log('🔑 Pass: 123456');
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
