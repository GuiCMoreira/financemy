import { describe, it, expect } from 'vitest'
import { competenciaDe, somarMeses } from './tipos'

describe('competenciaDe', () => {
  it('conta comum usa o mês da data', () => {
    expect(competenciaDe('2026-08-20', { tipo: 'CORRENTE', diaFechamento: null })).toBe(
      '2026-08',
    )
  })

  it('cartão antes do fechamento cai no mês', () => {
    expect(competenciaDe('2026-08-10', { tipo: 'CARTAO', diaFechamento: 15 })).toBe('2026-08')
  })

  it('cartão no dia do fechamento ainda cai no mês', () => {
    expect(competenciaDe('2026-08-15', { tipo: 'CARTAO', diaFechamento: 15 })).toBe('2026-08')
  })

  it('cartão depois do fechamento cai no mês seguinte', () => {
    expect(competenciaDe('2026-08-20', { tipo: 'CARTAO', diaFechamento: 15 })).toBe('2026-09')
  })

  it('cartão em dezembro depois do fechamento vira janeiro', () => {
    expect(competenciaDe('2026-12-20', { tipo: 'CARTAO', diaFechamento: 15 })).toBe('2027-01')
  })

  it('cartão sem dia de fechamento usa o mês da data', () => {
    expect(competenciaDe('2026-08-20', { tipo: 'CARTAO', diaFechamento: null })).toBe('2026-08')
  })
})

describe('somarMeses', () => {
  it('soma dentro do mesmo ano', () => {
    expect(somarMeses('2026-01', 2)).toBe('2026-03')
  })

  it('atravessa a virada de ano', () => {
    expect(somarMeses('2026-11', 3)).toBe('2027-02')
  })

  it('aceita zero', () => {
    expect(somarMeses('2026-05', 0)).toBe('2026-05')
  })
})
