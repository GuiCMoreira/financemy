import { describe, it, expect } from 'vitest'
import { saldoAtual, saldoPrevisto, dividirEmParcelas } from './saldos'

const l = (
  valor: number,
  tipo: 'ENTRADA' | 'SAIDA',
  status: 'PREVISTO' | 'EFETIVADO' | 'ATRASADO',
  data: string,
) => ({ valor, tipo, status, data })

describe('saldoAtual', () => {
  it('soma apenas lançamentos efetivados', () => {
    expect(
      saldoAtual(100000, [
        l(50000, 'ENTRADA', 'EFETIVADO', '2026-10-01'),
        l(30000, 'SAIDA', 'EFETIVADO', '2026-10-02'),
        l(99999, 'ENTRADA', 'PREVISTO', '2026-10-03'),
      ]),
    ).toBe(120000)
  })

  it('aceita saldo negativo', () => {
    expect(saldoAtual(0, [l(5000, 'SAIDA', 'EFETIVADO', '2026-10-01')])).toBe(-5000)
  })
})

describe('saldoPrevisto', () => {
  it('inclui previstos até a data alvo', () => {
    const ls = [
      l(50000, 'ENTRADA', 'EFETIVADO', '2026-10-01'),
      l(20000, 'SAIDA', 'PREVISTO', '2026-10-15'),
      l(90000, 'SAIDA', 'PREVISTO', '2026-11-20'),
    ]
    expect(saldoPrevisto(0, ls, '2026-10-31')).toBe(30000)
  })

  it('conta atrasados como ainda não pagos', () => {
    const ls = [l(20000, 'SAIDA', 'ATRASADO', '2026-09-10')]
    expect(saldoPrevisto(50000, ls, '2026-10-31')).toBe(30000)
  })
})

describe('dividirEmParcelas', () => {
  it('divide exato quando possível', () => {
    expect(dividirEmParcelas(30000, 3)).toEqual([10000, 10000, 10000])
  })

  it('a soma das parcelas é sempre igual ao total', () => {
    const p = dividirEmParcelas(10000, 3)
    expect(p.reduce((s, x) => s + x, 0)).toBe(10000)
  })

  it('coloca o resto na primeira parcela', () => {
    expect(dividirEmParcelas(10000, 3)).toEqual([3334, 3333, 3333])
  })

  it('recusa número de parcelas inválido', () => {
    expect(() => dividirEmParcelas(10000, 0)).toThrow()
    expect(() => dividirEmParcelas(10000, 1.5)).toThrow()
  })
})
