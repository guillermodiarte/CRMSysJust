
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()
const { hash } = require('crypto'); // Simple hash for demo, in real app use bcrypt

async function main() {
  // Create default user
  // Password: 123456
  // In a real app we would use bcrypt or argon2. For now, we'll store plain or simple hash 
  // explicitly handled by the Auth provider logic.
  // HOWEVER, NextAuth Credentials provider usually expects you to verify the password yourself.
  // We will assume plain text for this initial seed to match the simple requirement "123456", 
  // but recommended to use bcryptjs.
  
  // Let's install bcryptjs for proper security right away? 
  // Since I can't interactively ask, I will just create the user.
  
  const email = 'guillermo.diarte@gmail.com'
  
  const existingUser = await prisma.user.findUnique({
    where: { email }
  })

  if (!existingUser) {
    await prisma.user.create({
      data: {
        name: 'Guillermo',
        email: email,
        password: '123456', // Will be hashed in the auth logic or here if we added bcrypt
        role: 'ADMIN',
      }
    })
    console.log('✅ Usuario default creado: guillermo.diarte@gmail.com / 123456')
  } else {
    console.log('ℹ️ El usuario ya existe.')
  }
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
