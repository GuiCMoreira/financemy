'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { prisma } from '@/server/db'

const pagamentoSchema = z.object({
  pessoaId: z.string().min(1),
  valorReais: z.coerce.number().positive(),
  data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
})

export async function registrarPagamento(formData: FormData): Promise<void> {
  const d = pagamentoSchema.parse(Object.fromEntries(formData))

  await prisma.pagamento.create({
    data: {
      pessoaId: d.pessoaId,
      // Conversão para centavos acontece uma única vez, na borda de entrada.
      valor: Math.round(d.valorReais * 100),
      data: d.data,
    },
  })

  revalidatePath('/pessoas')
  revalidatePath('/')
}

const pessoaSchema = z.object({ nome: z.string().min(1).max(40) })

export async function novaPessoa(formData: FormData): Promise<void> {
  const d = pessoaSchema.parse(Object.fromEntries(formData))
  await prisma.pessoa.create({ data: { nome: d.nome, ehDono: false } })
  revalidatePath('/pessoas')
}
