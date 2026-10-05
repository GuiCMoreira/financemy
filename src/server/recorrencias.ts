import { prisma } from './db'
import { gerarOcorrencias } from '@/domain/recorrencia'
import type { StatusLancamento } from './tipos'

/**
 * Materializa as ocorrências de uma recorrência até a competência informada,
 * pulando as que já existem.
 *
 * É idempotente de propósito: a rotina roda a cada visita ao painel, e uma
 * implementação que duplicasse a cada execução encheria o banco de lançamentos
 * fantasma em poucos dias.
 */
export async function materializarRecorrencia(
  recorrenciaId: string,
  ateCompetencia: string,
): Promise<number> {
  const r = await prisma.recorrencia.findUniqueOrThrow({
    where: { id: recorrenciaId },
    include: { lancamentos: true },
  })

  if (!r.ativa) return 0

  const jaExistem = new Set(r.lancamentos.map((l) => l.competencia))

  const ocorrencias = gerarOcorrencias(
    {
      valor: r.valor,
      diaDoMes: r.diaDoMes,
      dataInicio: r.dataInicio,
      dataFim: r.dataFim,
    },
    r.dataInicio.slice(0, 7),
    ateCompetencia,
  ).filter((o) => !jaExistem.has(o.competencia))

  if (ocorrencias.length === 0) return 0

  const hoje = new Date().toISOString().slice(0, 10)

  await prisma.lancamento.createMany({
    data: ocorrencias.map((o) => {
      const status: StatusLancamento = o.data < hoje ? 'EFETIVADO' : 'PREVISTO'
      return {
      descricao: r.descricao,
      valor: o.valor,
      tipo: r.tipo,
      data: o.data,
      competencia: o.competencia,
      status,
      contaId: r.contaId,
      categoriaId: r.categoriaId,
      recorrenciaId: r.id,
      }
    }),
  })

  return ocorrencias.length
}

/** Materializa todas as recorrências ativas — chamada ao abrir o painel. */
export async function materializarTodas(ateCompetencia: string): Promise<number> {
  const ativas = await prisma.recorrencia.findMany({
    where: { ativa: true },
    select: { id: true },
  })

  let total = 0
  for (const r of ativas) {
    total += await materializarRecorrencia(r.id, ateCompetencia)
  }
  return total
}
