/** Valor monetário em centavos. Nunca usar float para dinheiro. */
export type Centavos = number

export function reaisParaCentavos(reais: number): Centavos {
  return Math.round(reais * 100)
}

export function formatarBRL(valor: Centavos): string {
  return (valor / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })
}
