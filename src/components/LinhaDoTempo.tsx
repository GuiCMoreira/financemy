import { Valor } from './Valor'
import type { EventoComSaldo } from '@/domain/fluxo'

export function LinhaDoTempo({ linha }: { linha: EventoComSaldo[] }) {
  if (linha.length === 0) {
    return <p className="text-sm text-texto-suave">Nenhum evento neste mês.</p>
  }

  return (
    <ol className="divide-y divide-cinza">
      {linha.map((e, i) => (
        <li key={i} className="flex items-center justify-between gap-4 py-3 first:pt-0">
          <div className="flex min-w-0 items-center gap-3">
            <span className="w-10 shrink-0 text-center text-xs font-medium text-texto-suave">
              {e.data.slice(8, 10)}/{e.data.slice(5, 7)}
            </span>
            <span className="truncate text-sm font-medium text-texto">{e.descricao}</span>
          </div>
          <div className="shrink-0 text-right">
            <div
              className={`text-sm font-medium ${
                e.valor < 0 ? 'text-texto' : 'text-[var(--color-faixa-verde)]'
              }`}
            >
              <Valor centavos={e.valor} />
            </div>
            <div
              className={`text-xs ${
                e.saldoApos < 0 ? 'font-bold text-[var(--color-faixa-laranja)]' : 'text-texto-suave'
              }`}
            >
              <Valor centavos={e.saldoApos} />
            </div>
          </div>
        </li>
      ))}
    </ol>
  )
}
