import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

/**
 * Prisma 7 exige driver adapter: o client não lê mais a URL do schema.
 *
 * O singleton evita esgotar o pool — em desenvolvimento o Next recarrega
 * módulos a cada alteração e instanciaria um client por recarga.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

function criarClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL

  if (!connectionString) {
    throw new Error('variável de ambiente obrigatória ausente: DATABASE_URL')
  }

  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) })
}

export const prisma = globalForPrisma.prisma ?? criarClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
