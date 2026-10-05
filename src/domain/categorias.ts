import type { Centavos } from './dinheiro'

export type LancamentoAgregavel = {
  categoriaId: string | null
  categoriaNome: string
  valor: Centavos
  tipo: 'ENTRADA' | 'SAIDA'
  ehTransferencia: boolean
  pessoaId: string | null
}

export type FatiaCategoria = {
  nome: string
  valor: Centavos
  percentual: number
}

type Opcoes = {
  donoId?: string
  apenasDoDono?: boolean
  maximoFatias?: number
}

/**
 * Transferências entre contas próprias são excluídas porque mover dinheiro não
 * é gasto — incluí-las infla o total sem que ninguém perceba de onde veio.
 *
 * Entradas também ficam de fora: este é o relatório de para onde o dinheiro foi.
 */
export function gastosPorCategoria(
  lancamentos: LancamentoAgregavel[],
  opcoes: Opcoes = {},
): FatiaCategoria[] {
  const relevantes = lancamentos.filter((l) => {
    if (l.ehTransferencia || l.tipo !== 'SAIDA') return false
    if (opcoes.apenasDoDono && opcoes.donoId) {
      return l.pessoaId === null || l.pessoaId === opcoes.donoId
    }
    return true
  })

  const total = relevantes.reduce((s, l) => s + l.valor, 0)
  if (total === 0) return []

  const porNome = new Map<string, Centavos>()
  for (const l of relevantes) {
    const nome = l.categoriaNome.trim() || 'Sem categoria'
    porNome.set(nome, (porNome.get(nome) ?? 0) + l.valor)
  }

  const ordenadas = [...porNome.entries()]
    .map(([nome, valor]) => ({ nome, valor }))
    .sort((a, b) => b.valor - a.valor)

  const limite = opcoes.maximoFatias
  const fatias =
    limite && ordenadas.length > limite
      ? [
          ...ordenadas.slice(0, limite),
          {
            nome: 'Outros',
            valor: ordenadas.slice(limite).reduce((s, f) => s + f.valor, 0),
          },
        ]
      : ordenadas

  return fatias.map((f) => ({
    ...f,
    percentual: Math.round((f.valor / total) * 1000) / 10,
  }))
}
