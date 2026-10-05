import { describe, it, expect } from 'vitest'
import { gastosPorCategoria } from './categorias'

const base = { tipo: 'SAIDA' as const, ehTransferencia: false, pessoaId: null }

describe('gastosPorCategoria', () => {
  it('agrupa e calcula percentual', () => {
    const r = gastosPorCategoria([
      { ...base, categoriaId: 'a', categoriaNome: 'Mercado', valor: 30000 },
      { ...base, categoriaId: 'a', categoriaNome: 'Mercado', valor: 20000 },
      { ...base, categoriaId: 'b', categoriaNome: 'Transporte', valor: 50000 },
    ])
    expect(r).toEqual([
      { nome: 'Mercado', valor: 50000, percentual: 50 },
      { nome: 'Transporte', valor: 50000, percentual: 50 },
    ])
  })

  it('ignora transferências entre contas próprias', () => {
    const r = gastosPorCategoria([
      { ...base, categoriaId: 'a', categoriaNome: 'Mercado', valor: 10000 },
      {
        ...base,
        categoriaId: null,
        categoriaNome: 'Transferência',
        valor: 90000,
        ehTransferencia: true,
      },
    ])
    expect(r).toHaveLength(1)
    expect(r[0].valor).toBe(10000)
  })

  it('ignora entradas — o relatório é de gastos', () => {
    const r = gastosPorCategoria([
      { ...base, categoriaId: 'a', categoriaNome: 'Mercado', valor: 10000 },
      { ...base, categoriaId: 'c', categoriaNome: 'Salário', valor: 400000, tipo: 'ENTRADA' },
    ])
    expect(r).toHaveLength(1)
  })

  it('filtra por dono quando pedido', () => {
    const r = gastosPorCategoria(
      [
        { ...base, categoriaId: 'a', categoriaNome: 'Mercado', valor: 10000, pessoaId: 'eu' },
        { ...base, categoriaId: 'a', categoriaNome: 'Mercado', valor: 90000, pessoaId: 'mae' },
      ],
      { donoId: 'eu', apenasDoDono: true },
    )
    expect(r[0].valor).toBe(10000)
  })

  it('agrupa cauda longa em "outros" sem perder valor', () => {
    const muitas = Array.from({ length: 8 }, (_, i) => ({
      ...base,
      categoriaId: `c${i}`,
      categoriaNome: `Cat ${i}`,
      valor: (8 - i) * 1000,
    }))
    const r = gastosPorCategoria(muitas, { maximoFatias: 3 })
    expect(r).toHaveLength(4)
    expect(r[3].nome).toBe('Outros')
    expect(r.reduce((s, f) => s + f.valor, 0)).toBe(
      muitas.reduce((s, l) => s + l.valor, 0),
    )
  })

  it('sem lançamentos, devolve lista vazia sem dividir por zero', () => {
    expect(gastosPorCategoria([])).toEqual([])
  })

  it('lançamento sem categoria entra como "Sem categoria"', () => {
    const r = gastosPorCategoria([
      { ...base, categoriaId: null, categoriaNome: '', valor: 5000 },
    ])
    expect(r[0].nome).toBe('Sem categoria')
  })
})
