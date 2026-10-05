import { formatarBRL } from '@/domain/dinheiro'
import type { FatiaCategoria } from '@/domain/categorias'

const CORES = [
  'var(--color-roxo)',
  'var(--color-faixa-verde)',
  'var(--color-faixa-azul)',
  'var(--color-faixa-laranja)',
  '#d619a8',
  '#7314b3',
  'var(--color-texto-suave)',
] as const

/**
 * Rosca em SVG puro, sem biblioteca: três gráficos fixos não usam a
 * flexibilidade que justifica centenas de kilobytes de dependência.
 *
 * Cada fatia é um arco desenhado com `stroke-dasharray` sobre um círculo —
 * a técnica evita calcular caminhos com trigonometria.
 */
export function Rosca({ fatias }: { fatias: FatiaCategoria[] }) {
  if (fatias.length === 0) {
    return <p className="text-sm text-texto-suave">Nenhum gasto no período.</p>
  }

  const total = fatias.reduce((s, f) => s + f.valor, 0)
  const raio = 70
  const circunferencia = 2 * Math.PI * raio

  let acumulado = 0

  const descricao = fatias
    .map((f) => `${f.nome}: ${formatarBRL(f.valor)} (${f.percentual}%)`)
    .join(', ')

  return (
    <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
      <svg
        viewBox="0 0 180 180"
        className="size-44 shrink-0 -rotate-90"
        role="img"
        aria-label={`Gastos por categoria, total ${formatarBRL(total)}. ${descricao}`}
      >
        {fatias.map((f, i) => {
          const fracao = f.valor / total
          const traco = fracao * circunferencia
          const deslocamento = -acumulado * circunferencia
          acumulado += fracao

          return (
            <circle
              key={f.nome}
              cx="90"
              cy="90"
              r={raio}
              fill="none"
              stroke={CORES[i % CORES.length]}
              strokeWidth="26"
              strokeDasharray={`${traco} ${circunferencia - traco}`}
              strokeDashoffset={deslocamento}
            />
          )
        })}
      </svg>

      {/* A tabela não é redundância: é a versão acessível do mesmo conteúdo,
          e serve a quem prefere número a desenho. */}
      <ul className="w-full space-y-2">
        {fatias.map((f, i) => (
          <li key={f.nome} className="flex items-center justify-between gap-3 text-sm">
            <span className="flex min-w-0 items-center gap-2">
              <span
                className="size-2.5 shrink-0 rounded-full"
                style={{ background: CORES[i % CORES.length] }}
                aria-hidden
              />
              <span className="truncate text-texto">{f.nome}</span>
            </span>
            <span className="shrink-0 text-texto-suave">
              <span className="font-medium text-texto">{formatarBRL(f.valor)}</span>
              <span className="ml-2 text-xs">{f.percentual}%</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
