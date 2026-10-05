'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { criarLancamento } from '@/server/lancamentos'

const schema = z.object({
  descricao: z.string().min(1).max(80),
  valorReais: z.coerce.number().positive(),
  tipo: z.enum(['ENTRADA', 'SAIDA']),
  data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  contaId: z.string().min(1),
  categoriaId: z.string().optional(),
  pessoaId: z.string().optional(),
  status: z.enum(['PREVISTO', 'EFETIVADO', 'ATRASADO']).default('EFETIVADO'),
})

export async function novoLancamento(formData: FormData): Promise<void> {
  const d = schema.parse(Object.fromEntries(formData))

  await criarLancamento({
    descricao: d.descricao,
    valor: Math.round(d.valorReais * 100),
    tipo: d.tipo,
    data: d.data,
    contaId: d.contaId,
    categoriaId: d.categoriaId || null,
    pessoaId: d.pessoaId || null,
    status: d.status,
  })

  revalidatePath('/lancamentos')
  revalidatePath('/')
}
