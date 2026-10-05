import { prisma } from './db'
import { materializarTodas } from './recorrencias'
import { linhaDoTempo, primeiroDiaNegativo, type Evento, type EventoComSaldo } from '@/domain/fluxo'
import { gastosPorCategoria, type FatiaCategoria } from '@/domain/categorias'
import { saldosPorPessoa } from '@/domain/pessoas'
import { saldoAtual, type LancamentoDeSaldo } from '@/domain/saldos'
import { somarMeses } from './tipos'
import type { Centavos } from '@/domain/dinheiro'

export type ResumoPainel = {
  competencia: string
  nomeDono: string
  saldoConsolidado: Centavos
  linha: EventoComSaldo[]
  diaNegativo: { data: string; saldo: Centavos } | null
  porCategoria: FatiaCategoria[]
  saldosPessoas: { nome: string; valor: Centavos }[]
  totalAReceber: Centavos
  entradasDoMes: Centavos
  saidasDoMes: Centavos
}

/**
 * Devolve `null` quando não há dono cadastrado. Banco vazio é o primeiro estado
 * de toda instalação, não uma condição excepcional — lançar aqui transformaria
 * a primeira visita num erro 500.
 */
export async function carregarPainel(competencia: string): Promise<ResumoPainel | null> {
  const dono = await prisma.pessoa.findFirst({ where: { ehDono: true } })
  if (!dono) return null

  // Repõe as ocorrências das recorrências até um ano à frente. Idempotente.
  await materializarTodas(somarMeses(competencia, 12))

  const [contas, doMes, todosLancamentos, pagamentos, pessoas] = await Promise.all([
    prisma.conta.findMany({ where: { ativa: true }, include: { lancamentos: true } }),
    prisma.lancamento.findMany({
      where: { competencia },
      include: { categoria: true, pessoa: true },
      orderBy: { data: 'asc' },
    }),
    prisma.lancamento.findMany({ select: { valor: true, status: true, competencia: true, pessoaId: true } }),
    prisma.pagamento.findMany(),
    prisma.pessoa.findMany({ where: { ehDono: false, ativa: true } }),
  ])

  const saldoConsolidado = contas.reduce((total, c) => {
    const ls: LancamentoDeSaldo[] = c.lancamentos.map((l) => ({
      valor: l.valor,
      tipo: l.tipo,
      status: l.status,
      data: l.data,
    }))
    return total + saldoAtual(c.saldoInicial, ls)
  }, 0)

  const eventos: Evento[] = doMes.map((l) => ({
    data: l.data,
    descricao: l.descricao,
    valor: l.tipo === 'ENTRADA' ? l.valor : -l.valor,
    tipo: l.tipo === 'ENTRADA' ? 'receita' : 'conta_fixa',
  }))

  const linha = linhaDoTempo(eventos, saldoConsolidado)

  const porCategoria = gastosPorCategoria(
    doMes.map((l) => ({
      categoriaId: l.categoriaId,
      categoriaNome: l.categoria?.nome ?? '',
      valor: l.valor,
      tipo: l.tipo,
      ehTransferencia: l.transferenciaId !== null,
      pessoaId: l.pessoaId,
    })),
    { maximoFatias: 6 },
  )

  const saldos = saldosPorPessoa(
    todosLancamentos.map((l) => ({
      pessoaId: l.pessoaId ?? dono.id,
      valor: l.valor,
      status: l.status === 'EFETIVADO' ? 'paga' : 'prevista',
      competencia: l.competencia,
    })),
    pagamentos,
    dono.id,
  )

  const saldosPessoas = pessoas
    .map((p) => ({ nome: p.nome, valor: saldos[p.id] ?? 0 }))
    .filter((s) => s.valor !== 0)
    .sort((a, b) => b.valor - a.valor)

  return {
    competencia,
    nomeDono: dono.nome,
    saldoConsolidado,
    linha,
    diaNegativo: primeiroDiaNegativo(linha),
    porCategoria,
    saldosPessoas,
    totalAReceber: saldosPessoas.reduce((s, p) => s + p.valor, 0),
    entradasDoMes: doMes.filter((l) => l.tipo === 'ENTRADA').reduce((s, l) => s + l.valor, 0),
    saidasDoMes: doMes.filter((l) => l.tipo === 'SAIDA').reduce((s, l) => s + l.valor, 0),
  }
}
