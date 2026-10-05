'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { prisma } from '@/server/db'
import { mudarStatus } from '@/server/lancamentos'

const statusSchema = z.object({
  lancamentoId: z.string().min(1),
  status: z.enum(['PREVISTO', 'EFETIVADO', 'ATRASADO']),
})

export async function alterarStatus(formData: FormData): Promise<void> {
  const d = statusSchema.parse({
    lancamentoId: formData.get('lancamentoId'),
    status: formData.get('status'),
  })

  await mudarStatus(d.lancamentoId, d.status)
  revalidatePath('/')
  revalidatePath('/lancamentos')
}

export type EstadoInicio = { erro: string | null }

const inicioSchema = z.object({
  nome: z.string().min(1).max(40),
  nomeConta: z.string().min(1).max(40),
  tipoConta: z.enum(['CORRENTE', 'CARTAO', 'DINHEIRO']),
  saldoInicialReais: z.coerce.number().default(0),
  diaFechamento: z.coerce.number().int().min(1).max(31).optional(),
  diaVencimento: z.coerce.number().int().min(1).max(31).optional(),
})

/**
 * Categorias que todo orçamento pessoal usa. Sem elas o sistema nasce inútil:
 * a pessoa abre a tela de lançamento, não tem o que escolher, e desiste antes
 * de entender para que serve categorizar.
 */
const CATEGORIAS_INICIAIS = [
  { nome: 'Salário', tipo: 'ENTRADA' as const, cor: '#00DD16' },
  { nome: 'Outras entradas', tipo: 'ENTRADA' as const, cor: '#009BDD' },
  { nome: 'Moradia', tipo: 'SAIDA' as const, cor: '#8A19D6' },
  { nome: 'Alimentação', tipo: 'SAIDA' as const, cor: '#FF7900' },
  { nome: 'Transporte', tipo: 'SAIDA' as const, cor: '#009BDD' },
  { nome: 'Saúde', tipo: 'SAIDA' as const, cor: '#00DD16' },
  { nome: 'Lazer', tipo: 'SAIDA' as const, cor: '#D619A8' },
  { nome: 'Educação', tipo: 'SAIDA' as const, cor: '#7314B3' },
  { nome: 'Outros gastos', tipo: 'SAIDA' as const, cor: '#7A7A80' },
]

/**
 * Cria dono, primeira conta e categorias iniciais.
 *
 * Sem transação interativa: elas exigem conexão dedicada do início ao fim, e o
 * pooler em transaction mode devolve a conexão a cada statement. A proteção
 * contra dois donos é a checagem prévia mais o fato de o formulário só aparecer
 * quando não existe nenhum.
 */
export async function configurarInicio(
  _anterior: EstadoInicio,
  formData: FormData,
): Promise<EstadoInicio> {
  try {
    const d = inicioSchema.parse(Object.fromEntries(formData))

    const jaExiste = await prisma.pessoa.findFirst({ where: { ehDono: true } })
    if (!jaExiste) {
      await prisma.pessoa.create({ data: { nome: d.nome, ehDono: true } })
      await prisma.conta.create({
        data: {
          nome: d.nomeConta,
          tipo: d.tipoConta,
          saldoInicial: Math.round((d.saldoInicialReais || 0) * 100),
          diaFechamento: d.tipoConta === 'CARTAO' ? (d.diaFechamento ?? null) : null,
          diaVencimento: d.tipoConta === 'CARTAO' ? (d.diaVencimento ?? null) : null,
        },
      })
      await prisma.categoria.createMany({ data: CATEGORIAS_INICIAIS })
    }

    revalidatePath('/', 'layout')
    return { erro: null }
  } catch (e) {
    // A mensagem vai para a tela porque um código opaco não ajuda ninguém a
    // sair do lugar, e um erro aqui trava a instalação inteira.
    console.error('[configurarInicio] falhou:', e)
    const erro = e as { message?: string; code?: string }
    return {
      erro: erro.code ? `${erro.code}: ${erro.message ?? ''}` : (erro.message ?? String(e)),
    }
  }
}
