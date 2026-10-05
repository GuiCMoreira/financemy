import { describe, it, expect } from 'vitest'
import { serieMensal, normalizarPeriodo, evolucaoSaldo } from './relatorios'

const l = (competencia: string, valor: number, tipo: 'ENTRADA' | 'SAIDA') => ({
  competencia,
  valor,
  tipo,
  ehTransferencia: false,
})

describe('normalizarPeriodo', () => {
  it('mantém período correto', () => {
    expect(normalizarPeriodo('2026-01', '2026-06')).toEqual({ de: '2026-01', ate: '2026-06' })
  })

  it('inverte período invertido em vez de somar errado', () => {
    expect(normalizarPeriodo('2026-12', '2026-01')).toEqual({ de: '2026-01', ate: '2026-12' })
  })

  it('aceita período de um mês só', () => {
    expect(normalizarPeriodo('2026-05', '2026-05')).toEqual({ de: '2026-05', ate: '2026-05' })
  })
})

describe('serieMensal', () => {
  it('agrupa entradas e saídas por mês', () => {
    const r = serieMensal(
      [l('2026-01', 400000, 'ENTRADA'), l('2026-01', 150000, 'SAIDA')],
      '2026-01',
      '2026-01',
    )
    expect(r).toEqual([{ competencia: '2026-01', entradas: 400000, saidas: 150000 }])
  })

  it('preenche meses sem lançamento com zero, não com buraco', () => {
    const r = serieMensal([l('2026-03', 1000, 'ENTRADA')], '2026-01', '2026-03')
    expect(r.map((p) => p.competencia)).toEqual(['2026-01', '2026-02', '2026-03'])
    expect(r[0]).toEqual({ competencia: '2026-01', entradas: 0, saidas: 0 })
  })

  it('exclui transferências entre contas próprias', () => {
    const r = serieMensal(
      [{ competencia: '2026-01', valor: 99999, tipo: 'SAIDA', ehTransferencia: true }],
      '2026-01',
      '2026-01',
    )
    expect(r[0].saidas).toBe(0)
  })

  it('atravessa a virada de ano', () => {
    const r = serieMensal([l('2027-01', 500, 'ENTRADA')], '2026-11', '2027-01')
    expect(r.map((p) => p.competencia)).toEqual(['2026-11', '2026-12', '2027-01'])
  })

  it('ignora lançamentos fora do período', () => {
    const r = serieMensal(
      [l('2025-05', 999999, 'ENTRADA'), l('2026-01', 1000, 'ENTRADA')],
      '2026-01',
      '2026-01',
    )
    expect(r[0].entradas).toBe(1000)
  })
})

describe('evolucaoSaldo', () => {
  it('acumula o saldo mês a mês', () => {
    const r = evolucaoSaldo(
      [
        { competencia: '2026-01', entradas: 100000, saidas: 40000 },
        { competencia: '2026-02', entradas: 100000, saidas: 90000 },
      ],
      0,
      '2026-01',
    )
    expect(r.map((p) => p.saldo)).toEqual([60000, 70000])
  })

  it('separa fato de projeção pela competência atual', () => {
    const r = evolucaoSaldo(
      [
        { competencia: '2026-01', entradas: 1000, saidas: 0 },
        { competencia: '2026-02', entradas: 1000, saidas: 0 },
      ],
      0,
      '2026-01',
    )
    expect(r.map((p) => p.projetado)).toEqual([false, true])
  })
})
