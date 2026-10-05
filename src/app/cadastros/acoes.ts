'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { prisma } from '@/server/db'
import { criarParcelamento } from '@/server/lancamentos'
import { materializarRecorrencia } from '@/server/recorrencias'
import { somarMeses } from '@/server/tipos'

const categoriaSchema = z.object({
  nome: z.string().min(1).max(40),
  tipo: z.enum(['ENTRADA', 'SAIDA']),
  cor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
})

export async function novaCategoria(formData: FormData): Promise<void> {
  const d = categoriaSchema.parse(Object.fromEntries(formData))
  await prisma.categoria.create({ data: d })
  revalidatePath('/cadastros')
}

/**
 * Categoria com histórico é desativada, nunca apagada: os lançamentos passados
 * apontam para ela, e removê-la apagaria a categorização de meses fechados —
 * todo relatório anterior passaria a mentir.
 */
export async function desativarCategoria(formData: FormData): Promise<void> {
  const id = z.string().min(1).parse(formData.get('categoriaId'))
  await prisma.categoria.update({ where: { id }, data: { ativa: false } })
  revalidatePath('/cadastros')
  revalidatePath('/lancamentos')
}

const recorrenciaSchema = z.object({
  descricao: z.string().min(1).max(60),
  valorReais: z.coerce.number().positive(),
  tipo: z.enum(['ENTRADA', 'SAIDA']),
  diaDoMes: z.coerce.number().int().min(1).max(31),
  dataInicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  contaId: z.string().min(1),
  categoriaId: z.string().optional(),
})

export async function novaRecorrencia(formData: FormData): Promise<void> {
  const d = recorrenciaSchema.parse(Object.fromEntries(formData))

  const criada = await prisma.recorrencia.create({
    data: {
      descricao: d.descricao,
      valor: Math.round(d.valorReais * 100),
      tipo: d.tipo,
      diaDoMes: d.diaDoMes,
      dataInicio: d.dataInicio,
      contaId: d.contaId,
      categoriaId: d.categoriaId || null,
    },
  })

  // Materializa um ano à frente para a projeção já ter o que mostrar.
  await materializarRecorrencia(criada.id, somarMeses(d.dataInicio.slice(0, 7), 12))

  revalidatePath('/cadastros')
  revalidatePath('/')
  revalidatePath('/lancamentos')
}

const parcelamentoSchema = z.object({
  descricao: z.string().min(1).max(60),
  valorTotalReais: z.coerce.number().positive(),
  numeroParcelas: z.coerce.number().int().min(1).max(120),
  dataInicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  contaId: z.string().min(1),
  categoriaId: z.string().optional(),
  pessoaId: z.string().optional(),
})

export async function novoParcelamento(formData: FormData): Promise<void> {
  const d = parcelamentoSchema.parse(Object.fromEntries(formData))

  await criarParcelamento({
    descricao: d.descricao,
    valorTotal: Math.round(d.valorTotalReais * 100),
    numeroParcelas: d.numeroParcelas,
    dataInicio: d.dataInicio,
    contaId: d.contaId,
    categoriaId: d.categoriaId || null,
    pessoaId: d.pessoaId || null,
  })

  revalidatePath('/cadastros')
  revalidatePath('/')
  revalidatePath('/lancamentos')
}

const antecipacaoSchema = z.object({
  data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  valorBrutoReais: z.coerce.number().positive(),
  valorLiquidoReais: z.coerce.number().positive(),
  numeroParcelas: z.coerce.number().int().min(1).max(60),
  contaId: z.string().min(1),
})

/**
 * Registra uma antecipação e cria o parcelamento correspondente: o dinheiro
 * recebido vira dívida futura. Registrar só a entrada mostraria um mês saudável
 * enquanto a obrigação seguinte cresce.
 */
export async function novaAntecipacao(formData: FormData): Promise<void> {
  const d = antecipacaoSchema.parse(Object.fromEntries(formData))
  const bruto = Math.round(d.valorBrutoReais * 100)
  const liquido = Math.round(d.valorLiquidoReais * 100)

  const parcelamentoId = await criarParcelamento({
    descricao: `Antecipação ${d.data}`,
    valorTotal: bruto,
    numeroParcelas: d.numeroParcelas,
    dataInicio: d.data,
    contaId: d.contaId,
  })

  await prisma.antecipacao.create({
    data: {
      data: d.data,
      valorBruto: bruto,
      valorLiquido: liquido,
      contaId: d.contaId,
      parcelamentoId,
    },
  })

  revalidatePath('/cadastros')
  revalidatePath('/')
}
