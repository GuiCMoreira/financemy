/**
 * Validações puras, sem acesso ao banco — ficam fora de `contas.ts` pelo mesmo
 * motivo de `tipos.ts`: alcançar `./db` num teste trava a execução.
 */

/**
 * Transferir para a própria conta criaria um par de lançamentos que se anulam:
 * o saldo não muda, mas o extrato ganha duas linhas falsas e todo relatório
 * passa a ter ruído que ninguém consegue explicar depois.
 */
export function validarTransferencia(
  origemId: string,
  destinoId: string,
  valor: number,
): string | null {
  if (origemId === destinoId) return 'Origem e destino não podem ser a mesma conta.'
  if (valor <= 0) return 'O valor precisa ser maior que zero.'
  return null
}
