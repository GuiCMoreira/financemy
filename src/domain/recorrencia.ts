import type { Centavos } from './dinheiro'

export type DefinicaoRecorrencia = {
  valor: Centavos
  diaDoMes: number
  dataInicio: string
  dataFim?: string | null
}

export type OcorrenciaGerada = {
  data: string
  competencia: string
  valor: Centavos
}

const pad = (n: number) => String(n).padStart(2, '0')

/** Último dia do mês, considerando bissexto, sem usar objeto Date. */
function ultimoDiaDoMes(ano: number, mes: number): number {
  const dias = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
  if (mes === 2 && ano % 4 === 0 && (ano % 100 !== 0 || ano % 400 === 0)) return 29
  return dias[mes - 1]
}

/**
 * Um lançamento marcado para o dia 31 não pode sumir em fevereiro: a conta
 * existe e vence. O dia é limitado ao último do mês, que é o que todo banco faz
 * com débito automático.
 */
export function gerarOcorrencias(
  def: DefinicaoRecorrencia,
  deCompetencia: string,
  ateCompetencia: string,
): OcorrenciaGerada[] {
  if (deCompetencia > ateCompetencia) return []

  const [anoDe, mesDe] = deCompetencia.split('-').map(Number)
  const [anoAte, mesAte] = ateCompetencia.split('-').map(Number)

  const ocorrencias: OcorrenciaGerada[] = []
  let indice = anoDe * 12 + (mesDe - 1)
  const fim = anoAte * 12 + (mesAte - 1)

  while (indice <= fim) {
    const ano = Math.floor(indice / 12)
    const mes = (indice % 12) + 1
    const dia = Math.min(def.diaDoMes, ultimoDiaDoMes(ano, mes))
    const data = `${ano}-${pad(mes)}-${pad(dia)}`

    const dentroDoInicio = data >= def.dataInicio
    const dentroDoFim = !def.dataFim || data <= def.dataFim

    if (dentroDoInicio && dentroDoFim) {
      ocorrencias.push({ data, competencia: `${ano}-${pad(mes)}`, valor: def.valor })
    }

    indice += 1
  }

  return ocorrencias
}
