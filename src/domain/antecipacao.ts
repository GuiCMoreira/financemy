import type { Centavos } from './dinheiro'

/**
 * A taxa nunca é configurada no sistema: ela é derivada dos dois valores que o
 * usuário digita (quanto passou no cartão, quanto caiu na conta). Se a
 * operadora mudar preços, o sistema continua correto sem alteração alguma.
 */
export function taxaEfetiva(valorPassado: Centavos, valorRecebido: Centavos): number {
  if (valorPassado <= 0) return 0
  return (valorPassado - valorRecebido) / valorPassado
}

export function quantoPassar(liquidoDesejado: Centavos, taxa: number): Centavos {
  if (taxa <= 0) return liquidoDesejado
  return Math.round(liquidoDesejado / (1 - taxa))
}

/** Média ponderada pelo volume: operacoes grandes pesam mais na estimativa. */
export function taxaMedia(
  operacoes: { valorPassado: Centavos; valorRecebido: Centavos }[],
): number | null {
  if (operacoes.length === 0) return null

  const totalPassado = operacoes.reduce((s, r) => s + r.valorPassado, 0)
  if (totalPassado <= 0) return null

  const totalRecebido = operacoes.reduce((s, r) => s + r.valorRecebido, 0)
  return (totalPassado - totalRecebido) / totalPassado
}

/**
 * O número que o sistema existe para tornar visível: quanto já foi pago em
 * taxas sem que a dívida tenha diminuído.
 */
export function custoTotalEmTaxas(
  operacoes: { valorPassado: Centavos; valorRecebido: Centavos }[],
): Centavos {
  return operacoes.reduce((s, r) => s + (r.valorPassado - r.valorRecebido), 0)
}
