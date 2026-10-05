import type { Centavos } from './dinheiro'

export type LancamentoDeSaldo = {
  valor: Centavos
  tipo: 'ENTRADA' | 'SAIDA'
  status: 'PREVISTO' | 'EFETIVADO' | 'ATRASADO'
  data: string
}

const assinado = (l: LancamentoDeSaldo): Centavos =>
  l.tipo === 'ENTRADA' ? l.valor : -l.valor

/**
 * Saldo é derivado, nunca armazenado: um número gravado desatualiza assim que
 * alguém corrige um lançamento antigo, e não há como saber que ele mentiu.
 */
export function saldoAtual(
  saldoInicial: Centavos,
  lancamentos: LancamentoDeSaldo[],
): Centavos {
  return lancamentos
    .filter((l) => l.status === 'EFETIVADO')
    .reduce((s, l) => s + assinado(l), saldoInicial)
}

/**
 * Projeção até uma data. `ATRASADO` entra junto com `PREVISTO` porque atrasado
 * significa "ainda devo", não "já paguei" — tratá-lo como quitado produziria
 * projeção otimista justamente quando a pessoa mais precisa da verdade.
 */
export function saldoPrevisto(
  saldoInicial: Centavos,
  lancamentos: LancamentoDeSaldo[],
  ate: string,
): Centavos {
  return lancamentos
    .filter((l) => l.data <= ate)
    .reduce((s, l) => s + assinado(l), saldoInicial)
}

/**
 * Divide um total em N parcelas inteiras cuja soma é exatamente o total.
 *
 * O resto vai na primeira parcela — convenção do mercado brasileiro, e a que
 * evita a soma das parcelas ficar centavos abaixo do valor da compra.
 */
export function dividirEmParcelas(total: Centavos, n: number): Centavos[] {
  if (!Number.isInteger(n) || n < 1) {
    throw new Error(`número de parcelas inválido: ${n}`)
  }
  const base = Math.floor(total / n)
  const resto = total - base * n
  return Array.from({ length: n }, (_, i) => (i === 0 ? base + resto : base))
}
