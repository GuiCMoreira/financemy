import { competenciaDaCompra } from '@/domain/fatura'

export type TipoMovimento = 'ENTRADA' | 'SAIDA'
export type StatusLancamento = 'PREVISTO' | 'EFETIVADO' | 'ATRASADO'
export type TipoConta = 'CORRENTE' | 'POUPANCA' | 'DINHEIRO' | 'CARTAO' | 'INVESTIMENTO'

/**
 * Este arquivo não importa `./db` de propósito: `db.ts` instancia o
 * PrismaClient em tempo de import, e qualquer teste que alcance esse import
 * fica pendurado tentando conectar. Funções puras precisam de um caminho de
 * import que não toque em I/O.
 */

/**
 * Cartão tem calendário próprio: o que passa depois do fechamento é cobrado na
 * fatura seguinte. Errar isso desloca gastos de fim de mês em um mês inteiro —
 * justamente os que mais afetam a previsão.
 */
export function competenciaDe(
  data: string,
  conta: { tipo: string; diaFechamento: number | null },
): string {
  if (conta.tipo === 'CARTAO' && conta.diaFechamento) {
    return competenciaDaCompra(data, {
      diaFechamento: conta.diaFechamento,
      diaVencimento: conta.diaFechamento,
    }).competencia
  }
  return data.slice(0, 7)
}

/** Aritmética de competência sobre os componentes, sem objeto Date. */
export function somarMeses(competencia: string, meses: number): string {
  const [ano, mes] = competencia.split('-').map(Number)
  const total = ano * 12 + (mes - 1) + meses
  const novoAno = Math.floor(total / 12)
  const novoMes = (total % 12) + 1
  return `${novoAno}-${String(novoMes).padStart(2, '0')}`
}
