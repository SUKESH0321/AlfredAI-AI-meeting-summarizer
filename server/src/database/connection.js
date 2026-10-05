import { PrismaClient } from '@prisma/client';

// Ensures only one Prisma connection is reused across modules, preventing connection flooding
let prisma = global.prisma;

if (!prisma) {
  prisma = new PrismaClient();
  if (process.env.NODE_ENV !== 'production') {
    global.prisma = prisma;
  }
}

export default prisma;
