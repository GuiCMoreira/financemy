import { describe, it, expect } from 'vitest'
import { competenciaDaCompra } from './fatura'

const cartao = { diaFechamento: 15, diaVencimento: 22 }

describe('competenciaDaCompra', () => {
  it('compra antes do fechamento cai na fatura do mesmo mês', () => {
    expect(competenciaDaCompra('2026-08-10', cartao)).toEqual({
      competencia: '2026-08',
      vencimento: '2026-08-22',
    })
  })

  it('compra no dia do fechamento ainda entra na fatura do mês', () => {
    expect(competenciaDaCompra('2026-08-15', cartao)).toEqual({
      competencia: '2026-08',
      vencimento: '2026-08-22',
    })
  })

  it('compra após o fechamento cai na fatura do mês seguinte', () => {
    expect(competenciaDaCompra('2026-08-20', cartao)).toEqual({
      competencia: '2026-09',
      vencimento: '2026-09-22',
    })
  })

  it('compra após o fechamento em dezembro cai em janeiro do ano seguinte', () => {
    expect(competenciaDaCompra('2026-12-20', cartao)).toEqual({
      competencia: '2027-01',
      vencimento: '2027-01-22',
    })
  })

  it('não depende do fuso horário local', () => {
    // Em America/Sao_Paulo (UTC-3), interpretar '2026-08-15' como horário local
    // e converter para UTC produziria 2026-08-15T03:00Z — mas o inverso
    // (new Date('2026-08-15') tratado como local) produziria dia 14.
    expect(competenciaDaCompra('2026-08-15', cartao).competencia).toBe('2026-08')
  })
})
