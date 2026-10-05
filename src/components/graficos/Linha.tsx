import { formatarBRL } from '@/domain/dinheiro'
import type { PontoEvolucao } from '@/domain/relatorios'

const MESES_CURTOS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

const rotulo = (competencia: string) => MESES_CURTOS[Number(competencia.split('-')[1]) - 1]

/**
 * Evolução do saldo. O trecho projetado usa traço interrompido — a distinção é
 * visual e não só de legenda, porque misturar fato e previsão numa linha
 * contínua induz a decidir com base em suposição acreditando que é histórico.
 */
export function Linha({ pontos }: { pontos: PontoEvolucao[] }) {
  if (pontos.length < 2) {
    return <p className="text-sm text-texto-suave">Dados insuficientes para a evolução.</p>
  }

  const valores = pontos.map((p) => p.saldo)
  const minimo = Math.min(...valores, 0)
  const maximo = Math.max(...valores, 1)
  const faixa = maximo - minimo || 1

  const coordenada = (p: PontoEvolucao, i: number) => ({
    x: (i / (pontos.length - 1)) * 100,
    y: 90 - ((p.saldo - minimo) / faixa) * 80,
  })

  const indiceCorte = pontos.findIndex((p) => p.projetado)
  const corte = indiceCorte === -1 ? pontos.length : indiceCorte

  const caminho = (de: number, ate: number) =>
    pontos
      .slice(de, ate)
      .map((p, i) => {
        const c = coordenada(p, de + i)
        return `${i === 0 ? 'M' : 'L'} ${c.x.toFixed(2)} ${c.y.toFixed(2)}`
      })
      .join(' ')

  const zeroY = 90 - ((0 - minimo) / faixa) * 80

  const descricao = pontos
    .map((p) => `${rotulo(p.competencia)}: ${formatarBRL(p.saldo)}${p.projetado ? ' (previsto)' : ''}`)
    .join('. ')

  return (
    <div>
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="h-48 w-full"
        role="img"
        aria-label={`Evolução do saldo. ${descricao}`}
      >
        {minimo < 0 && (
          <line x1="0" y1={zeroY} x2="100" y2={zeroY} stroke="var(--color-faixa-laranja)" strokeWidth="0.4" strokeDasharray="2 2" />
        )}
        <path d={caminho(0, corte)} fill="none" stroke="var(--color-roxo)" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
        {corte < pontos.length && (
          <path
            d={caminho(Math.max(0, corte - 1), pontos.length)}
            fill="none"
            stroke="var(--color-roxo)"
            strokeWidth="1.5"
            strokeDasharray="4 3"
            vectorEffect="non-scaling-stroke"
          />
        )}
      </svg>

      <div className="flex justify-between text-xs text-texto-suave">
        {pontos.map((p) => (
          <span key={p.competencia} className="flex-1 text-center">{rotulo(p.competencia)}</span>
        ))}
      </div>

      <ul className="mt-4 flex gap-6 text-xs">
        <li className="flex items-center gap-2">
          <span className="h-0.5 w-5 bg-roxo" aria-hidden />
          <span className="text-texto-suave">realizado</span>
        </li>
        <li className="flex items-center gap-2">
          <span
            className="h-0.5 w-5"
            style={{
              backgroundImage:
                'repeating-linear-gradient(to right, var(--color-roxo) 0 4px, transparent 4px 7px)',
            }}
            aria-hidden
          />
          <span className="text-texto-suave">previsto</span>
        </li>
      </ul>
    </div>
  )
}
