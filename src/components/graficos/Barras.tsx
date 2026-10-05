import { formatarBRL } from '@/domain/dinheiro'
import type { PontoMensal } from '@/domain/relatorios'

const MESES_CURTOS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

function rotulo(competencia: string): string {
  const [, mes] = competencia.split('-').map(Number)
  return MESES_CURTOS[mes - 1]
}

/** Entradas e saídas lado a lado por mês. Revela sazonalidade que um mês isolado esconde. */
export function Barras({ serie }: { serie: PontoMensal[] }) {
  if (serie.length === 0) {
    return <p className="text-sm text-texto-suave">Nenhum dado no período.</p>
  }

  const maximo = Math.max(...serie.flatMap((p) => [p.entradas, p.saidas]), 1)
  const larguraGrupo = 100 / serie.length
  const alturaUtil = 86

  const descricao = serie
    .map((p) => `${rotulo(p.competencia)}: entrou ${formatarBRL(p.entradas)}, saiu ${formatarBRL(p.saidas)}`)
    .join('. ')

  return (
    <div>
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="h-48 w-full"
        role="img"
        aria-label={`Entradas e saídas por mês. ${descricao}`}
      >
        {serie.map((p, i) => {
          const x = i * larguraGrupo
          const largura = larguraGrupo * 0.32
          const alturaEntrada = (p.entradas / maximo) * alturaUtil
          const alturaSaida = (p.saidas / maximo) * alturaUtil

          return (
            <g key={p.competencia}>
              <rect
                x={x + larguraGrupo * 0.14}
                y={alturaUtil - alturaEntrada}
                width={largura}
                height={alturaEntrada}
                fill="var(--color-faixa-verde)"
              />
              <rect
                x={x + larguraGrupo * 0.52}
                y={alturaUtil - alturaSaida}
                width={largura}
                height={alturaSaida}
                fill="var(--color-roxo)"
              />
            </g>
          )
        })}
        <line x1="0" y1={alturaUtil} x2="100" y2={alturaUtil} stroke="var(--color-cinza-forte)" strokeWidth="0.4" />
      </svg>

      <div className="flex justify-between text-xs text-texto-suave">
        {serie.map((p) => (
          <span key={p.competencia} className="flex-1 text-center">
            {rotulo(p.competencia)}
          </span>
        ))}
      </div>

      <ul className="mt-4 flex gap-6 text-xs">
        <li className="flex items-center gap-2">
          <span className="size-2.5 rounded-full bg-[var(--color-faixa-verde)]" aria-hidden />
          <span className="text-texto-suave">entradas</span>
        </li>
        <li className="flex items-center gap-2">
          <span className="size-2.5 rounded-full bg-roxo" aria-hidden />
          <span className="text-texto-suave">saídas</span>
        </li>
      </ul>
    </div>
  )
}
