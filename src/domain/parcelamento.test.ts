import { describe, it, expect } from 'vitest'
import { gerarParcelas } from './parcelamento'

const cartao = { diaFechamento: 15, diaVencimento: 22 }

describe('gerarParcelas', () => {
  it('gera uma parcela por mês a partir da competência da compra', () => {
    const ps = gerarParcelas(
      { valorParcela: 10000, numeroParcelas: 3, dataInicio: '2026-09-10' },
      cartao,
      '2026-09-01',
    )
    expect(ps).toHaveLength(3)
    expect(ps.map((p) => p.competencia)).toEqual(['2026-09', '2026-10', '2026-11'])
    expect(ps[0].vencimento).toBe('2026-09-22')
  })

  it('respeita o fechamento na primeira parcela', () => {
    const ps = gerarParcelas(
      { valorParcela: 10000, numeroParcelas: 2, dataInicio: '2026-08-20' },
      cartao,
      '2026-08-01',
    )
    expect(ps.map((p) => p.competencia)).toEqual(['2026-09', '2026-10'])
  })

  it('atravessa a virada de ano', () => {
    const ps = gerarParcelas(
      { valorParcela: 5000, numeroParcelas: 3, dataInicio: '2026-11-10' },
      cartao,
      '2026-11-01',
    )
    expect(ps.map((p) => p.competencia)).toEqual(['2026-11', '2026-12', '2027-01'])
  })

  it('marca como paga apenas as parcelas anteriores ao mês corrente', () => {
    // Notebook: 10x começando em abril, hoje é setembro → 5 já passaram
    const ps = gerarParcelas(
      { valorParcela: 30000, numeroParcelas: 10, dataInicio: '2026-04-10' },
      cartao,
      '2026-09-03',
    )
    const pagas = ps.filter((p) => p.status === 'paga')
    const previstas = ps.filter((p) => p.status === 'prevista')
    expect(pagas.map((p) => p.competencia)).toEqual([
      '2026-04', '2026-05', '2026-06', '2026-07', '2026-08',
    ])
    expect(previstas).toHaveLength(5)
    expect(previstas[0].competencia).toBe('2026-09')
  })

  it('numera as parcelas a partir de 1', () => {
    const ps = gerarParcelas(
      { valorParcela: 10000, numeroParcelas: 3, dataInicio: '2026-09-10' },
      cartao,
      '2026-09-01',
    )
    expect(ps.map((p) => p.numero)).toEqual([1, 2, 3])
  })
})
