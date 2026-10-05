import { carregarPainel } from '@/server/painel'
import { Cartao } from '@/components/Cartao'
import { LinhaDoTempo } from '@/components/LinhaDoTempo'
import { BarraPorPessoa } from '@/components/BarraPorPessoa'
import { Cabecalho } from '@/components/Cabecalho'
import { PrimeiroAcesso } from '@/components/PrimeiroAcesso'
import { Valor } from '@/components/Valor'

export const dynamic = 'force-dynamic'

const MESES = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
]

function porExtenso(competencia: string, hoje: string): string {
  const [ano, mes] = competencia.split('-').map(Number)
  return ano === Number(hoje.slice(0, 4)) ? MESES[mes - 1] : `${MESES[mes - 1]} de ${ano}`
}

export default async function Painel() {
  const hoje = new Date().toISOString().slice(0, 10)
  const competencia = hoje.slice(0, 7)
  const p = await carregarPainel(competencia)

  if (!p) return <PrimeiroAcesso />

  const fatias = p.porCategoria.map((f) => [f.nome, f.valor] as [string, number])

  return (
    <>
      <Cabecalho
        titulo={`Olá, ${p.nomeDono}`}
        rotulo="Saldo consolidado"
        valor={p.saldoConsolidado}
        complemento={`${porExtenso(competencia, hoje)} · ${p.linha.length} lançamentos`}
      />

      <main className="mx-auto max-w-6xl space-y-5 p-5 pt-7 pb-24 lg:grid lg:grid-cols-2 lg:items-start lg:gap-5 lg:space-y-0 lg:px-12 lg:pb-12">
        {p.diaNegativo ? (
          <div className="rounded-bloco bg-superficie p-6 lg:col-span-2">
            <div className="flex items-center gap-3">
              <span
                className="size-2 rounded-full bg-[var(--color-faixa-laranja)]"
                aria-hidden
              />
              <p className="text-sm font-medium text-texto-suave">
                O saldo fica negativo em {p.diaNegativo.data.slice(8, 10)}/
                {p.diaNegativo.data.slice(5, 7)}
              </p>
            </div>
            <Valor
              centavos={p.diaNegativo.saldo}
              className="mt-2 block text-[32px] font-bold text-texto"
            />
          </div>
        ) : (
          <div className="flex items-center gap-3 rounded-card bg-superficie px-5 py-4 lg:col-span-2">
            <span className="size-2 rounded-full bg-[var(--color-faixa-verde)]" aria-hidden />
            <p className="text-sm font-medium text-texto">O mês fecha no positivo.</p>
          </div>
        )}

        <Cartao titulo="No mês" acessorio="por data">
          <div className="mb-4 flex gap-6 border-b border-fundo pb-3">
            <div>
              <div className="text-xs font-medium text-texto-suave">entrou</div>
              <Valor
                centavos={p.entradasDoMes}
                className="text-sm font-bold text-[var(--color-faixa-verde)]"
              />
            </div>
            <div>
              <div className="text-xs font-medium text-texto-suave">saiu</div>
              <Valor centavos={p.saidasDoMes} className="text-sm font-bold text-texto" />
            </div>
          </div>
          <LinhaDoTempo linha={p.linha} />
        </Cartao>

        <Cartao titulo="Para onde foi" acessorio="no mês">
          <BarraPorPessoa fatias={fatias} total={p.saidasDoMes} />
        </Cartao>

        {p.saldosPessoas.length > 0 && (
          <div className="lg:col-span-2">
            <Cartao titulo="Quem me deve" acessorio="total a receber">
              <ul className="divide-y divide-fundo">
                {p.saldosPessoas.map((s) => (
                  <li key={s.nome} className="flex justify-between py-3 first:pt-0">
                    <span className="text-sm font-medium text-texto">{s.nome}</span>
                    <Valor centavos={s.valor} className="text-sm font-bold text-texto" />
                  </li>
                ))}
              </ul>
            </Cartao>
          </div>
        )}
      </main>
    </>
  )
}
