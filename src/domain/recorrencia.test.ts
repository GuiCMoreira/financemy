import { describe, it, expect } from 'vitest'
import { gerarOcorrencias } from './recorrencia'

describe('gerarOcorrencias', () => {
  it('gera uma ocorrência por mês no dia indicado', () => {
    const r = gerarOcorrencias(
      { valor: 400000, diaDoMes: 5, dataInicio: '2026-01-01' },
      '2026-01',
      '2026-03',
    )
    expect(r.map((o) => o.data)).toEqual(['2026-01-05', '2026-02-05', '2026-03-05'])
  })

  it('dia 31 cai no último dia dos meses curtos', () => {
    const r = gerarOcorrencias(
      { valor: 10000, diaDoMes: 31, dataInicio: '2026-01-01' },
      '2026-01',
      '2026-04',
    )
    expect(r.map((o) => o.data)).toEqual([
      '2026-01-31',
      '2026-02-28',
      '2026-03-31',
      '2026-04-30',
    ])
  })

  it('respeita ano bissexto', () => {
    const r = gerarOcorrencias(
      { valor: 10000, diaDoMes: 30, dataInicio: '2028-02-01' },
      '2028-02',
      '2028-02',
    )
    expect(r[0].data).toBe('2028-02-29')
  })

  it('não gera antes da data de início', () => {
    const r = gerarOcorrencias(
      { valor: 10000, diaDoMes: 10, dataInicio: '2026-03-01' },
      '2026-01',
      '2026-04',
    )
    expect(r.map((o) => o.competencia)).toEqual(['2026-03', '2026-04'])
  })

  it('para na data fim', () => {
    const r = gerarOcorrencias(
      { valor: 10000, diaDoMes: 10, dataInicio: '2026-01-01', dataFim: '2026-02-28' },
      '2026-01',
      '2026-06',
    )
    expect(r.map((o) => o.competencia)).toEqual(['2026-01', '2026-02'])
  })

  it('intervalo invertido devolve lista vazia', () => {
    expect(
      gerarOcorrencias(
        { valor: 100, diaDoMes: 1, dataInicio: '2026-01-01' },
        '2026-06',
        '2026-01',
      ),
    ).toEqual([])
  })

  it('atravessa a virada de ano', () => {
    const r = gerarOcorrencias(
      { valor: 100, diaDoMes: 10, dataInicio: '2026-11-01' },
      '2026-11',
      '2027-01',
    )
    expect(r.map((o) => o.competencia)).toEqual(['2026-11', '2026-12', '2027-01'])
  })
})
