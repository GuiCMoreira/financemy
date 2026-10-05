import { prisma } from './db'
import { competenciaDe, somarMeses, type TipoMovimento, type StatusLancamento } from './tipos'
import { dividirEmParcelas } from '@/domain/saldos'
import type { Centavos } from '@/domain/dinheiro'

export type CriarLancamentoInput = {
  descricao: string
  valor: Centavos
  tipo: TipoMovimento
  data: string
  contaId: string
  categoriaId?: string | null
  pessoaId?: string | null
  status?: StatusLancamento
}

export async function criarLancamento(input: CriarLancamentoInput): Promise<string> {
  const conta = await prisma.conta.findUniqueOrThrow({ where: { id: input.contaId } })

  const criado = await prisma.lancamento.create({
    data: {
      descricao: input.descricao,
      valor: input.valor,
      tipo: input.tipo,
      data: input.data,
      competencia: competenciaDe(input.data, conta),
      status: input.status ?? 'EFETIVADO',
      contaId: input.contaId,
      categoriaId: input.categoriaId ?? null,
      pessoaId: input.pessoaId ?? null,
    },
  })

  return criado.id
}

export type CriarParcelamentoInput = {
  descricao: string
  valorTotal: Centavos
  numeroParcelas: number
  dataInicio: string
  contaId: string
  categoriaId?: string | null
  pessoaId?: string | null
}

/**
 * Cria o parcelamento e suas parcelas num `create` aninhado — não em transação
 * interativa, que é incompatível com pooler em transaction mode: o pooler
 * devolve a conexão a cada statement e o COMMIT acabaria numa conexão que
 * nunca viu o BEGIN.
 *
 * Parcelas anteriores ao mês corrente nascem `EFETIVADO` por conveniência de
 * cadastro retroativo — default editável, não inferência.
 */
export async function criarParcelamento(input: CriarParcelamentoInput): Promise<string> {
  const conta = await prisma.conta.findUniqueOrThrow({ where: { id: input.contaId } })
  const valores = dividirEmParcelas(input.valorTotal, input.numeroParcelas)

  const competenciaInicial = competenciaDe(input.dataInicio, conta)
  const competenciaAtual = new Date().toISOString().slice(0, 7)
  const diaVencimento = conta.diaVencimento ?? Number(input.dataInicio.slice(8, 10))

  const criado = await prisma.parcelamento.create({
    data: {
      descricao: input.descricao,
      valorParcela: valores[0],
      numeroParcelas: input.numeroParcelas,
      dataInicio: input.dataInicio,
      contaId: input.contaId,
      categoriaId: input.categoriaId ?? null,
      pessoaId: input.pessoaId ?? null,
      lancamentos: {
        create: valores.map((valor, i) => {
          const competencia = somarMeses(competenciaInicial, i)
          const status: StatusLancamento =
            competencia < competenciaAtual ? 'EFETIVADO' : 'PREVISTO'
          return {
            descricao: `${input.descricao} (${i + 1}/${input.numeroParcelas})`,
            valor,
            tipo: 'SAIDA' as const,
            data: `${competencia}-${String(diaVencimento).padStart(2, '0')}`,
            competencia,
            status,
            contaId: input.contaId,
            categoriaId: input.categoriaId ?? null,
            pessoaId: input.pessoaId ?? null,
            numeroParcela: i + 1,
            totalParcelas: input.numeroParcelas,
          }
        }),
      },
    },
  })

  return criado.id
}

export type FiltrosLancamento = {
  competencia?: string
  contaId?: string
  categoriaId?: string
  pessoaId?: string
  status?: StatusLancamento
}

export async function listarLancamentos(filtros: FiltrosLancamento) {
  return prisma.lancamento.findMany({
    where: {
      ...(filtros.competencia ? { competencia: filtros.competencia } : {}),
      ...(filtros.contaId ? { contaId: filtros.contaId } : {}),
      ...(filtros.categoriaId ? { categoriaId: filtros.categoriaId } : {}),
      ...(filtros.pessoaId ? { pessoaId: filtros.pessoaId } : {}),
      ...(filtros.status ? { status: filtros.status } : {}),
    },
    include: { conta: true, categoria: true, pessoa: true },
    orderBy: [{ data: 'asc' }, { criadoEm: 'asc' }],
  })
}

export async function mudarStatus(
  lancamentoId: string,
  status: StatusLancamento,
): Promise<void> {
  await prisma.lancamento.update({ where: { id: lancamentoId }, data: { status } })
}
