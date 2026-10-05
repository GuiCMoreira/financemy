import { prisma } from './db'
import { validarTransferencia } from './validacoes'
import { saldoAtual, saldoPrevisto, type LancamentoDeSaldo } from '@/domain/saldos'
import type { Centavos } from '@/domain/dinheiro'

export { validarTransferencia }

export type CriarTransferenciaInput = {
  data: string
  valor: Centavos
  contaOrigemId: string
  contaDestinoId: string
  descricao?: string
}

/**
 * Uma transferência vira um par de lançamentos ligados: saída na origem,
 * entrada no destino. Isso mantém o extrato de cada conta completo e faz o par
 * sumir naturalmente dos relatórios de gasto — mover dinheiro entre contas
 * próprias não é despesa.
 */
export async function criarTransferencia(input: CriarTransferenciaInput): Promise<string> {
  const erro = validarTransferencia(input.contaOrigemId, input.contaDestinoId, input.valor)
  if (erro) throw new Error(erro)

  const [origem, destino] = await Promise.all([
    prisma.conta.findUniqueOrThrow({ where: { id: input.contaOrigemId } }),
    prisma.conta.findUniqueOrThrow({ where: { id: input.contaDestinoId } }),
  ])

  const competencia = input.data.slice(0, 7)
  const descricao =
    input.descricao?.trim() || `Transferência ${origem.nome} → ${destino.nome}`

  const criada = await prisma.transferencia.create({
    data: {
      data: input.data,
      valor: input.valor,
      contaOrigemId: input.contaOrigemId,
      contaDestinoId: input.contaDestinoId,
      lancamentos: {
        create: [
          {
            descricao,
            valor: input.valor,
            tipo: 'SAIDA',
            data: input.data,
            competencia,
            status: 'EFETIVADO',
            contaId: input.contaOrigemId,
          },
          {
            descricao,
            valor: input.valor,
            tipo: 'ENTRADA',
            data: input.data,
            competencia,
            status: 'EFETIVADO',
            contaId: input.contaDestinoId,
          },
        ],
      },
    },
  })

  return criada.id
}

export type ContaComSaldo = {
  id: string
  nome: string
  tipo: string
  saldo: Centavos
  previsto: Centavos
  diaFechamento: number | null
  diaVencimento: number | null
}

export async function listarContasComSaldo(ate?: string): Promise<ContaComSaldo[]> {
  const contas = await prisma.conta.findMany({
    where: { ativa: true },
    include: { lancamentos: true },
    orderBy: { nome: 'asc' },
  })

  const limite = ate ?? '9999-12-31'

  return contas.map((c) => {
    const ls: LancamentoDeSaldo[] = c.lancamentos.map((l) => ({
      valor: l.valor,
      tipo: l.tipo,
      status: l.status,
      data: l.data,
    }))

    return {
      id: c.id,
      nome: c.nome,
      tipo: c.tipo,
      saldo: saldoAtual(c.saldoInicial, ls),
      previsto: saldoPrevisto(c.saldoInicial, ls, limite),
      diaFechamento: c.diaFechamento,
      diaVencimento: c.diaVencimento,
    }
  })
}
