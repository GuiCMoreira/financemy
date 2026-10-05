import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

/**
 * Prisma 7 exige driver adapter: o client não lê mais a URL do schema.
 *
 * A conexão é criada de forma preguiçosa, na primeira propriedade acessada —
 * nunca em tempo de import. Instanciar no topo do módulo faz o build quebrar
 * em qualquer ambiente sem `DATABASE_URL`: o Next importa as páginas para
 * coletar metadados, o import lança, e o erro aparece como "Failed to collect
 * page data", sem mencionar banco algum.
 *
 * O singleton evita esgotar o pool — em desenvolvimento o Next recarrega
 * módulos a cada alteração e instanciaria um client por recarga.
 */
const globalParaPrisma = globalThis as unknown as { prisma?: PrismaClient }

function criarClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL

  if (!connectionString) {
    throw new Error(
      'variável de ambiente obrigatória ausente: DATABASE_URL. ' +
        'Copie .env.example para .env e preencha a conexão.',
    )
  }

  const client = new PrismaClient({ adapter: new PrismaPg({ connectionString }) })
  if (process.env.NODE_ENV !== 'production') globalParaPrisma.prisma = client
  return client
}

function obterClient(): PrismaClient {
  return globalParaPrisma.prisma ?? criarClient()
}

export const prisma = new Proxy({} as PrismaClient, {
  get(_alvo, propriedade) {
    const valor = obterClient()[propriedade as keyof PrismaClient]
    return typeof valor === 'function' ? valor.bind(obterClient()) : valor
  },
})
