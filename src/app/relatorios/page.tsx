import Link from 'next/link'
import { carregarRelatorios, periodoPadrao } from '@/server/relatorios'
import { Cabecalho } from '@/components/Cabecalho'
import { Cartao } from '@/components/Cartao'
import { PrimeiroAcesso } from '@/components/PrimeiroAcesso'
import { Rosca } from '@/components/graficos/Rosca'
import { Barras } from '@/components/graficos/Barras'
import { Linha } from '@/components/graficos/Linha'

export const dynamic = 'force-dynamic'

const campo =
  'rounded-card border border-cinza bg-fundo px-3 py-2 text-sm text-texto'

export default async function Relatorios({
  searchParams,
}: {
  searchParams: Promise<{ de?: string; ate?: string; escopo?: string }>
}) {
  const q = await searchParams
  const padrao = periodoPadrao()
  const apenasDoDono = q.escopo !== 'todos'

  const d = await carregarRelatorios(q.de || padrao.de, q.ate || padrao.ate, apenasDoDono)
  if (!d) return <PrimeiroAcesso />

  const href = (escopo: string) => `/relatorios?de=${d.de}&ate=${d.ate}&escopo=${escopo}`

  return (
    <>
      <Cabecalho
        titulo="Relatórios"
        rotulo="Gastos no período"
        valor={d.totalGasto}
        complemento={`${d.de} a ${d.ate} · ${apenasDoDono ? 'somente seus gastos' : 'tudo que passou nas contas'}`}
      />

      <main className="mx-auto max-w-6xl space-y-5 p-5 pb-24 lg:px-12 lg:pb-12">
        <Cartao titulo="Período">
          <form method="get" className="flex flex-wrap items-end gap-3">
            <label className="block text-xs font-medium text-texto-suave">
              De
              <input name="de" type="month" defaultValue={d.de} className={`${campo} mt-1 block`} />
            </label>
            <label className="block text-xs font-medium text-texto-suave">
              Até
              <input name="ate" type="month" defaultValue={d.ate} className={`${campo} mt-1 block`} />
            </label>
            <input type="hidden" name="escopo" value={apenasDoDono ? 'meus' : 'todos'} />
            <button className="rounded-pill bg-roxo px-4 py-2 text-sm font-medium text-white hover:bg-roxo-escuro">
              Aplicar
            </button>
          </form>

          <div className="mt-4 flex gap-2">
            <Link
              href={href('meus')}
              aria-current={apenasDoDono ? 'true' : undefined}
              className={`rounded-pill px-3 py-1.5 text-xs font-medium ${
                apenasDoDono ? 'bg-roxo text-white' : 'bg-fundo text-texto-suave'
              }`}
            >
              Meus gastos
            </Link>
            <Link
              href={href('todos')}
              aria-current={!apenasDoDono ? 'true' : undefined}
              className={`rounded-pill px-3 py-1.5 text-xs font-medium ${
                !apenasDoDono ? 'bg-roxo text-white' : 'bg-fundo text-texto-suave'
              }`}
            >
              Tudo que passou
            </Link>
          </div>
        </Cartao>

        <Cartao titulo="Para onde foi o dinheiro" acessorio="por categoria">
          <Rosca fatias={d.porCategoria} />
        </Cartao>

        <Cartao titulo="Mês a mês" acessorio="entradas e saídas">
          <Barras serie={d.serie} />
        </Cartao>

        <Cartao titulo="Evolução do saldo" acessorio="realizado e previsto">
          <Linha pontos={d.evolucao} />
        </Cartao>
      </main>
    </>
  )
}
