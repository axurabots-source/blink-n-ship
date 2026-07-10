import { PrismaClient } from '@prisma/client';
import { validateEnv } from '@/lib/env-validator';

validateEnv();

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma || new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  transactionOptions: {
    maxWait: 15000,
    timeout: 30000,
  },
});

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

process.on('SIGTERM', async () => {
  await prisma.$disconnect();
});

process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});
