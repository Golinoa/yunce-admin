import { PrismaClient } from '@prisma/client';
import env from './env';

const globalForPrisma: typeof globalThis & { prisma?: PrismaClient } = globalThis;

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: env.NODE_ENV === 'development'
    ? ['query', 'info', 'warn', 'error']
    : ['error'],
});

if (env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export default prisma;
