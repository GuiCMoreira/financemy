export type ConfigCartao = {
  diaFechamento: number
  diaVencimento: number
}

function partes(dataISO: string): { ano: number; mes: number; dia: number } {
  const [ano, mes, dia] = dataISO.split('-').map(Number)
  return { ano, mes, dia }
}

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

/**
 * Datas são manipuladas como strings decompostas, não como objetos Date.
 * `new Date('2026-08-15')` é interpretado como meia-noite UTC e, ao ser lido
 * em America/Sao_Paulo, vira dia 14 — deslocando a compra para a fatura errada.
 * Aritmética sobre os componentes elimina a classe inteira de bug.
 */
export function competenciaDaCompra(
  dataCompra: string,
  cartao: ConfigCartao,
): { competencia: string; vencimento: string } {
  const { ano, mes, dia } = partes(dataCompra)

  let anoFatura = ano
  let mesFatura = mes

  if (dia > cartao.diaFechamento) {
    mesFatura += 1
    if (mesFatura > 12) {
      mesFatura = 1
      anoFatura += 1
    }
  }

  return {
    competencia: `${anoFatura}-${pad(mesFatura)}`,
    vencimento: `${anoFatura}-${pad(mesFatura)}-${pad(cartao.diaVencimento)}`,
  }
}
