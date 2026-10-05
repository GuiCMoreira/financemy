import { prisma } from './db'

/**
 * Devolve o dono do sistema, ou `null` quando ainda não há.
 *
 * Usa `findFirst` e não `findFirstOrThrow` de propósito: banco vazio é o
 * primeiro estado de toda instalação, não uma condição excepcional. Lançar aqui
 * transforma a primeira visita num erro 500.
 */
export async function obterDono() {
  return prisma.pessoa.findFirst({ where: { ehDono: true } })
}
