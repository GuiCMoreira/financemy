import type { Centavos } from './dinheiro'

export type LancamentoDeSerie = {
  competencia: string
  valor: Centavos
  tipo: 'ENTRADA' | 'SAIDA'
  ehTransferencia: boolean
}

export type PontoMensal = {
  competencia: string
  entradas: Centavos
  saidas: Centavos
}

export type PontoEvolucao = {
  competencia: string
  saldo: Centavos
  /** `true` quando o mês ainda não aconteceu — exibido em traço interrompido. */
  projetado: boolean
}

const pad = (n: number) => String(n).padStart(2, '0')

/**
 * Período invertido é erro de digitação, não intenção. Inverter em silêncio é
 * melhor que devolver vazio: o relatório aparece, e o usuário percebe sozinho
 * se não era o que queria. Devolver vazio pareceria "não há dados".
 */
export function normalizarPeriodo(de: string, ate: string): { de: string; ate: string } {
  return de <= ate ? { de, ate } : { de: ate, ate: de }
}

function competenciasEntre(de: string, ate: string): string[] {
  const [anoDe, mesDe] = de.split('-').map(Number)
  const [anoAte, mesAte] = ate.split('-').map(Number)

  const lista: string[] = []
  let i = anoDe * 12 + (mesDe - 1)
  const fim = anoAte * 12 + (mesAte - 1)

  while (i <= fim) {
    lista.push(`${Math.floor(i / 12)}-${pad((i % 12) + 1)}`)
    i += 1
  }

  return lista
}

/**
 * Mês sem lançamento vira ponto com zero, não ausência: um gráfico que pula
 * meses vazios comprime o eixo do tempo e faz um ano irregular parecer regular.
 */
export function serieMensal(
  lancamentos: LancamentoDeSerie[],
  de: string,
  ate: string,
): PontoMensal[] {
  const periodo = normalizarPeriodo(de, ate)
  const meses = competenciasEntre(periodo.de, periodo.ate)

  const mapa = new Map<string, PontoMensal>(
    meses.map((c) => [c, { competencia: c, entradas: 0, saidas: 0 }]),
  )

  for (const l of lancamentos) {
    if (l.ehTransferencia) continue
    const ponto = mapa.get(l.competencia)
    if (!ponto) continue
    if (l.tipo === 'ENTRADA') ponto.entradas += l.valor
    else ponto.saidas += l.valor
  }

  return meses.map((c) => mapa.get(c)!)
}

/**
 * Acumula o saldo ao longo da série, marcando a partir de onde é projeção.
 *
 * A distinção não é cosmética: um gráfico que mistura fato e previsão na mesma
 * linha contínua induz a decidir com base em suposição acreditando que é
 * histórico.
 */
export function evolucaoSaldo(
  serie: PontoMensal[],
  saldoInicial: Centavos,
  competenciaAtual: string,
): PontoEvolucao[] {
  let acumulado = saldoInicial

  return serie.map((p) => {
    acumulado += p.entradas - p.saidas
    return {
      competencia: p.competencia,
      saldo: acumulado,
      projetado: p.competencia > competenciaAtual,
    }
  })
}
