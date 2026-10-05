import { prisma } from './db'
import { somarMeses } from './tipos'
import { gastosPorCategoria, type FatiaCategoria } from '@/domain/categorias'
import {
  serieMensal,
  evolucaoSaldo,
  normalizarPeriodo,
  type PontoMensal,
  type PontoEvolucao,
} from '@/domain/relatorios'
import { saldoAtual, type LancamentoDeSaldo } from '@/domain/saldos'
import type { Centavos } from '@/domain/dinheiro'

export type DadosRelatorio = {
  de: string
  ate: string
  porCategoria: FatiaCategoria[]
  serie: PontoMensal[]
  evolucao: PontoEvolucao[]
  totalGasto: Centavos
  totalEntrada: Centavos
  apenasDoDono: boolean
}

/** Período padrão: os últimos 12 meses terminando no mês corrente. */
export function periodoPadrao(): { de: string; ate: string } {
  const ate = new Date().toISOString().slice(0, 7)
  return { de: somarMeses(ate, -11), ate }
}

export async function carregarRelatorios(
  de: string,
  ate: string,
  apenasDoDono: boolean,
): Promise<DadosRelatorio | null> {
  const dono = await prisma.pessoa.findFirst({ where: { ehDono: true } })
  if (!dono) return null

  const periodo = normalizarPeriodo(de, ate)

  const [doPeriodo, contas] = await Promise.all([
    prisma.lancamento.findMany({
      where: { competencia: { gte: periodo.de, lte: periodo.ate } },
      include: { categoria: true },
    }),
    prisma.conta.findMany({ where: { ativa: true }, include: { lancamentos: true } }),
  ])

  const agregaveis = doPeriodo.map((l) => ({
    categoriaId: l.categoriaId,
    categoriaNome: l.categoria?.nome ?? '',
    valor: l.valor,
    tipo: l.tipo,
    ehTransferencia: l.transferenciaId !== null,
    pessoaId: l.pessoaId,
  }))

  const porCategoria = gastosPorCategoria(agregaveis, {
    donoId: dono.id,
    apenasDoDono,
    maximoFatias: 6,
  })

  const serie = serieMensal(
    doPeriodo.map((l) => ({
      competencia: l.competencia,
      valor: l.valor,
      tipo: l.tipo,
      ehTransferencia: l.transferenciaId !== null,
    })),
    periodo.de,
    periodo.ate,
  )

  // O saldo de partida é o consolidado de hoje menos o que a série vai somar —
  // assim a linha termina no saldo real em vez de começar nele.
  const consolidado = contas.reduce((total, c) => {
    const ls: LancamentoDeSaldo[] = c.lancamentos.map((l) => ({
      valor: l.valor,
      tipo: l.tipo,
      status: l.status,
      data: l.data,
    }))
    return total + saldoAtual(c.saldoInicial, ls)
  }, 0)

  const variacaoDaSerie = serie.reduce((s, p) => s + p.entradas - p.saidas, 0)

  return {
    de: periodo.de,
    ate: periodo.ate,
    porCategoria,
    serie,
    evolucao: evolucaoSaldo(
      serie,
      consolidado - variacaoDaSerie,
      new Date().toISOString().slice(0, 7),
    ),
    totalGasto: porCategoria.reduce((s, f) => s + f.valor, 0),
    totalEntrada: serie.reduce((s, p) => s + p.entradas, 0),
    apenasDoDono,
  }
}
