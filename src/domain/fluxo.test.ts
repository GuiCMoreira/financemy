import { describe, it, expect } from 'vitest'
import { linhaDoTempo, primeiroDiaNegativo } from './fluxo'

const eventos = [
  { data: '2026-09-22', descricao: 'Fatura do cartão', valor: -450000, tipo: 'fatura' as const },
  { data: '2026-09-05', descricao: 'Salário', valor: 400000, tipo: 'receita' as const },
  { data: '2026-09-10', descricao: 'Aluguel', valor: -150000, tipo: 'conta_fixa' as const },
]

describe('linhaDoTempo', () => {
  it('ordena os eventos por data', () => {
    const l = linhaDoTempo(eventos, 0)
    expect(l.map((e) => e.data)).toEqual(['2026-09-05', '2026-09-10', '2026-09-22'])
  })

  it('acumula o saldo evento a evento', () => {
    const l = linhaDoTempo(eventos, 0)
    expect(l.map((e) => e.saldoApos)).toEqual([400000, 250000, -200000])
  })

  it('considera o saldo inicial', () => {
    const l = linhaDoTempo(eventos, 100000)
    expect(l[0].saldoApos).toBe(500000)
  })

  it('não altera o array recebido', () => {
    const copia = [...eventos]
    linhaDoTempo(eventos, 0)
    expect(eventos).toEqual(copia)
  })
})

describe('primeiroDiaNegativo', () => {
  it('encontra o dia em que o saldo vira negativo', () => {
    const l = linhaDoTempo(eventos, 0)
    expect(primeiroDiaNegativo(l)).toEqual({ data: '2026-09-22', saldo: -200000 })
  })

  it('devolve null quando o saldo nunca fica negativo', () => {
    const l = linhaDoTempo(eventos, 1000000)
    expect(primeiroDiaNegativo(l)).toBeNull()
  })
})
