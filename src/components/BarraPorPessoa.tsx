import { formatarBRL } from '@/domain/dinheiro'
import { Valor } from './Valor'
import type { Centavos } from '@/domain/dinheiro'

/**
 * A barra segmentada do card "Cartão de crédito" do arquivo desktop: 7px de
 * altura, raio 100px, faixas coloridas com legenda e bolinha.
 *
 * No Nubank ela quebra a fatura por categoria. Aqui quebra por responsável —
 * mostra de relance quanto da fatura é gasto seu e quanto volta como
 * reembolso, que é a pergunta que o cartão compartilhado cria.
 */
const CORES = [
  'var(--color-roxo)',
  'var(--color-faixa-verde)',
  'var(--color-faixa-azul)',
  'var(--color-faixa-laranja)',
  'var(--color-texto-suave)',
] as const

type Props = {
  /** Pares [nome, valor]. O dono do sistema vem primeiro e recebe o roxo. */
  fatias: [string, Centavos][]
  total: Centavos
}

export function BarraPorPessoa({ fatias, total }: Props) {
  if (total <= 0 || fatias.length === 0) {
    return <p className="text-sm text-texto-suave">Nenhum lançamento neste mês.</p>
  }

  return (
    <div>
      <div
        className="flex h-[7px] overflow-hidden rounded-full"
        role="img"
        aria-label={`Fatura de ${formatarBRL(total)} dividida entre ${fatias
          .map(([nome, valor]) => `${nome}: ${formatarBRL(valor)}`)
          .join(', ')}`}
      >
        {fatias.map(([nome, valor], i) => (
          <div
            key={nome}
            style={{
              width: `${(valor / total) * 100}%`,
              background: CORES[i % CORES.length],
            }}
          />
        ))}
      </div>

      <ul className="mt-4 flex flex-wrap gap-x-6 gap-y-2">
        {fatias.map(([nome, valor], i) => (
          <li key={nome} className="flex items-center gap-2">
            <span
              className="size-1.5 shrink-0 rounded-full"
              style={{ background: CORES[i % CORES.length] }}
              aria-hidden
            />
            <span className="text-xs font-medium text-texto-suave">{nome}</span>
            <Valor centavos={valor} className="text-xs font-medium text-texto" />
          </li>
        ))}
      </ul>
    </div>
  )
}
