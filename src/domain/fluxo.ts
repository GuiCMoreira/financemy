import type { Centavos } from './dinheiro'

export type TipoEvento = 'receita' | 'conta_fixa' | 'fatura' | 'parcela' | 'reembolso'

export type Evento = {
  data: string
  descricao: string
  valor: Centavos
  tipo: TipoEvento
}

export type EventoComSaldo = Evento & { saldoApos: Centavos }

/**
 * O mês é uma sequência de eventos datados, não um total. O descasamento entre
 * salário (dia 5) e vencimento da fatura (dia 22) só aparece numa linha do
 * tempo: somando o mês inteiro, um mês que quebra no dia 22 e é salvo no dia 30
 * parece saudável.
 *
 * As datas são strings ISO, então a ordenação lexicográfica é cronológica.
 */
export function linhaDoTempo(eventos: Evento[], saldoInicial: Centavos): EventoComSaldo[] {
  const ordenados = [...eventos].sort((a, b) => a.data.localeCompare(b.data))

  let saldo = saldoInicial
  return ordenados.map((e) => {
    saldo += e.valor
    return { ...e, saldoApos: saldo }
  })
}

export function primeiroDiaNegativo(
  linha: EventoComSaldo[],
): { data: string; saldo: Centavos } | null {
  const evento = linha.find((e) => e.saldoApos < 0)
  return evento ? { data: evento.data, saldo: evento.saldoApos } : null
}
