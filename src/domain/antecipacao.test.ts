import { describe, it, expect } from 'vitest'
import { taxaEfetiva, quantoPassar, taxaMedia, custoTotalEmTaxas } from './antecipacao'

describe('taxaEfetiva', () => {
  it('deriva a taxa da simulação real: R$ 103.252,46 passados para receber R$ 100.000', () => {
    expect(taxaEfetiva(10325246, 10000000)).toBeCloseTo(0.0315, 5)
  })

  it('devolve zero quando não houve custo', () => {
    expect(taxaEfetiva(100000, 100000)).toBe(0)
  })
})

describe('quantoPassar', () => {
  it('calcula o bruto necessário para um líquido desejado', () => {
    expect(quantoPassar(100000, 0.0315)).toBe(103252)
  })

  it('é o inverso de taxaEfetiva', () => {
    const bruto = quantoPassar(300000, 0.0315)
    expect(taxaEfetiva(bruto, 300000)).toBeCloseTo(0.0315, 4)
  })

  it('sem taxa, passar é igual a receber', () => {
    expect(quantoPassar(100000, 0)).toBe(100000)
  })
})

describe('taxaMedia', () => {
  it('devolve null quando não há histórico', () => {
    expect(taxaMedia([])).toBeNull()
  })

  it('faz média ponderada pelo valor passado', () => {
    const media = taxaMedia([
      { valorPassado: 10325246, valorRecebido: 10000000 },
      { valorPassado: 10325246, valorRecebido: 10000000 },
    ])
    expect(media).toBeCloseTo(0.0315, 5)
  })
})

describe('custoTotalEmTaxas', () => {
  it('soma o que foi perdido em taxas', () => {
    expect(
      custoTotalEmTaxas([
        { valorPassado: 309757, valorRecebido: 300000 },
        { valorPassado: 309757, valorRecebido: 300000 },
      ]),
    ).toBe(19514)
  })
})
