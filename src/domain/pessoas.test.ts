import { describe, it, expect } from 'vitest'
import { saldosPorPessoa, aReceberNoMes } from './pessoas'

const DONO = 'eu'

const parcelas = [
  { pessoaId: 'namorada', valor: 30000, status: 'prevista' as const, competencia: '2026-09' },
  { pessoaId: 'namorada', valor: 30000, status: 'prevista' as const, competencia: '2026-10' },
  { pessoaId: 'namorada', valor: 30000, status: 'paga' as const, competencia: '2026-08' },
  { pessoaId: 'padrasto', valor: 20000, status: 'prevista' as const, competencia: '2026-09' },
  { pessoaId: DONO, valor: 90000, status: 'prevista' as const, competencia: '2026-09' },
]

describe('saldosPorPessoa', () => {
  it('soma apenas parcelas não pagas de terceiros', () => {
    const s = saldosPorPessoa(parcelas, [], DONO)
    expect(s.namorada).toBe(60000)
    expect(s.padrasto).toBe(20000)
  })

  it('não inclui o dono do sistema', () => {
    const s = saldosPorPessoa(parcelas, [], DONO)
    expect(s[DONO]).toBeUndefined()
  })

  it('abate pagamentos recebidos do saldo', () => {
    const s = saldosPorPessoa(parcelas, [{ pessoaId: 'namorada', valor: 25000 }], DONO)
    expect(s.namorada).toBe(35000)
  })

  it('permite saldo negativo quando a pessoa pagou a mais', () => {
    const s = saldosPorPessoa(parcelas, [{ pessoaId: 'padrasto', valor: 25000 }], DONO)
    expect(s.padrasto).toBe(-5000)
  })
})

describe('aReceberNoMes', () => {
  it('soma só as parcelas de terceiros na competência informada', () => {
    expect(aReceberNoMes(parcelas, '2026-09', DONO)).toBe(50000)
  })
})
