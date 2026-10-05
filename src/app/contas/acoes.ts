'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { prisma } from '@/server/db'
import { criarTransferencia } from '@/server/contas'

const contaSchema = z.object({
  nome: z.string().min(1).max(40),
  tipo: z.enum(['CORRENTE', 'POUPANCA', 'DINHEIRO', 'CARTAO', 'INVESTIMENTO']),
  saldoInicialReais: z.coerce.number().default(0),
  diaFechamento: z.coerce.number().int().min(1).max(31).optional(),
  diaVencimento: z.coerce.number().int().min(1).max(31).optional(),
  limiteReais: z.coerce.number().optional(),
})

export async function novaConta(formData: FormData): Promise<void> {
  const d = contaSchema.parse(Object.fromEntries(formData))
  const ehCartao = d.tipo === 'CARTAO'

  await prisma.conta.create({
    data: {
      nome: d.nome,
      tipo: d.tipo,
      saldoInicial: Math.round((d.saldoInicialReais || 0) * 100),
      diaFechamento: ehCartao ? (d.diaFechamento ?? null) : null,
      diaVencimento: ehCartao ? (d.diaVencimento ?? null) : null,
      limite: ehCartao && d.limiteReais ? Math.round(d.limiteReais * 100) : null,
    },
  })

  revalidatePath('/contas')
  revalidatePath('/')
}

export type EstadoTransferencia = { erro: string | null }

const transferSchema = z.object({
  data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  valorReais: z.coerce.number().positive(),
  contaOrigemId: z.string().min(1),
  contaDestinoId: z.string().min(1),
  descricao: z.string().max(80).optional(),
})

export async function novaTransferencia(
  _anterior: EstadoTransferencia,
  formData: FormData,
): Promise<EstadoTransferencia> {
  try {
    const d = transferSchema.parse(Object.fromEntries(formData))

    await criarTransferencia({
      data: d.data,
      valor: Math.round(d.valorReais * 100),
      contaOrigemId: d.contaOrigemId,
      contaDestinoId: d.contaDestinoId,
      descricao: d.descricao,
    })

    revalidatePath('/contas')
    revalidatePath('/')
    return { erro: null }
  } catch (e) {
    const erro = e as { message?: string }
    return { erro: erro.message ?? String(e) }
  }
}
