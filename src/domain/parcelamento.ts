import type { Centavos } from './dinheiro'
import { competenciaDaCompra, type ConfigCartao } from './fatura'

export type StatusParcela = 'prevista' | 'paga' | 'em_aberto'

export type Parcela = {
  numero: number
  competencia: string
  vencimento: string
  valor: Centavos
  status: StatusParcela
}

export type NovoParcelamento = {
  valorParcela: Centavos
  numeroParcelas: number
  dataInicio: string
}

function somarMeses(competencia: string, meses: number): string {
  const [ano, mes] = competencia.split('-').map(Number)
  const total = ano * 12 + (mes - 1) + meses
  const novoAno = Math.floor(total / 12)
  const novoMes = (total % 12) + 1
  return `${novoAno}-${String(novoMes).padStart(2, '0')}`
}

/**
 * `hoje` é parâmetro, não `new Date()`: uma função que lê o relógio por dentro
 * produz testes que passam hoje e quebram no mês seguinte.
 *
 * Parcelas anteriores ao mês corrente nascem `paga` por conveniência de
 * cadastro retroativo — é um default editável, não uma inferência. O sistema
 * jamais conclui que algo foi pago só porque a data passou.
 */
export function gerarParcelas(
  p: NovoParcelamento,
  cartao: ConfigCartao,
  hoje: string,
): Parcela[] {
  const primeira = competenciaDaCompra(p.dataInicio, cartao)
  const competenciaAtual = hoje.slice(0, 7)

  return Array.from({ length: p.numeroParcelas }, (_, i) => {
    const competencia = somarMeses(primeira.competencia, i)
    const [ano, mes] = competencia.split('-')
    return {
      numero: i + 1,
      competencia,
      vencimento: `${ano}-${mes}-${String(cartao.diaVencimento).padStart(2, '0')}`,
      valor: p.valorParcela,
      status: competencia < competenciaAtual ? ('paga' as const) : ('prevista' as const),
    }
  })
}
