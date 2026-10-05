import type { Centavos } from './dinheiro'
import type { StatusParcela } from './parcelamento'

export type ParcelaDePessoa = {
  pessoaId: string
  valor: Centavos
  status: StatusParcela
  competencia: string
}

export type PagamentoRecebido = {
  pessoaId: string
  valor: Centavos
}

/**
 * O dono do sistema é apenas mais uma pessoa nos dados; o filtro por `donoId`
 * é o que separa "gasto meu" de "a receber" sem precisar de duas tabelas.
 *
 * Saldo negativo é permitido de propósito: significa que a pessoa adiantou
 * dinheiro. Travar em zero esconderia crédito legítimo dela.
 */
export function saldosPorPessoa(
  parcelas: ParcelaDePessoa[],
  pagamentos: PagamentoRecebido[],
  donoId: string,
): Record<string, Centavos> {
  const saldos: Record<string, Centavos> = {}

  for (const p of parcelas) {
    if (p.pessoaId === donoId || p.status === 'paga') continue
    saldos[p.pessoaId] = (saldos[p.pessoaId] ?? 0) + p.valor
  }

  for (const pg of pagamentos) {
    if (pg.pessoaId === donoId) continue
    saldos[pg.pessoaId] = (saldos[pg.pessoaId] ?? 0) - pg.valor
  }

  return saldos
}

export function aReceberNoMes(
  parcelas: ParcelaDePessoa[],
  competencia: string,
  donoId: string,
): Centavos {
  return parcelas
    .filter((p) => p.pessoaId !== donoId && p.competencia === competencia)
    .reduce((total, p) => total + p.valor, 0)
}
