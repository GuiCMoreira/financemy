import { describe, it, expect } from 'vitest'
import { saldosPorPessoa, aReceberNoMes } from './pessoas'

const DONO = 'eu'

const parcelas = [
  { pessoaId: 'ana', valor: 30000, status: 'prevista' as const, competencia: '2026-09' },
  { pessoaId: 'ana', valor: 30000, status: 'prevista' as const, competencia: '2026-10' },
  { pessoaId: 'ana', valor: 30000, status: 'paga' as const, competencia: '2026-08' },
  { pessoaId: 'bruno', valor: 20000, status: 'prevista' as const, competencia: '2026-09' },
  { pessoaId: DONO, valor: 90000, status: 'prevista' as const, competencia: '2026-09' },
]

describe('saldosPorPessoa', () => {
  it('soma apenas parcelas não pagas de terceiros', () => {
    const s = saldosPorPessoa(parcelas, [], DONO)
    expect(s.ana).toBe(60000)
    expect(s.bruno).toBe(20000)
  })

  it('não inclui o dono do sistema', () => {
    const s = saldosPorPessoa(parcelas, [], DONO)
    expect(s[DONO]).toBeUndefined()
  })

  it('abate pagamentos recebidos do saldo', () => {
    const s = saldosPorPessoa(parcelas, [{ pessoaId: 'ana', valor: 25000 }], DONO)
    expect(s.ana).toBe(35000)
  })

  it('permite saldo negativo quando a pessoa pagou a mais', () => {
    const s = saldosPorPessoa(parcelas, [{ pessoaId: 'bruno', valor: 25000 }], DONO)
    expect(s.bruno).toBe(-5000)
  })
})

describe('aReceberNoMes', () => {
  it('soma só as parcelas de terceiros na competência informada', () => {
    expect(aReceberNoMes(parcelas, '2026-09', DONO)).toBe(50000)
  })
})
