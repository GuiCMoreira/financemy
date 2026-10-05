import { prisma } from '@/server/db'
import { obterDono } from '@/server/configuracao'
import { saldosPorPessoa } from '@/domain/pessoas'
import { Cabecalho } from '@/components/Cabecalho'
import { Cartao } from '@/components/Cartao'
import { Valor } from '@/components/Valor'
import { PrimeiroAcesso } from '@/components/PrimeiroAcesso'
import { registrarPagamento, novaPessoa } from './acoes'

export const dynamic = 'force-dynamic'

const campo =
  'w-full rounded-card border border-cinza bg-fundo px-3 py-2 text-sm text-texto placeholder:text-texto-suave'
const botao =
  'rounded-pill bg-roxo px-4 py-2 text-sm font-medium text-white hover:bg-roxo-escuro'

export default async function Pessoas() {
  const dono = await obterDono()
  if (!dono) return <PrimeiroAcesso />

  const [pessoas, lancamentos, pagamentos] = await Promise.all([
    prisma.pessoa.findMany({ where: { ehDono: false, ativa: true }, orderBy: { nome: 'asc' } }),
    prisma.lancamento.findMany({
      where: { pessoaId: { not: null } },
      select: { pessoaId: true, valor: true, status: true, competencia: true },
    }),
    prisma.pagamento.findMany(),
  ])

  const saldos = saldosPorPessoa(
    lancamentos.map((l) => ({
      pessoaId: l.pessoaId!,
      valor: l.valor,
      status: l.status === 'EFETIVADO' ? 'paga' : 'prevista',
      competencia: l.competencia,
    })),
    pagamentos,
    dono.id,
  )

  const hoje = new Date().toISOString().slice(0, 10)
  const total = pessoas.reduce((s, p) => s + (saldos[p.id] ?? 0), 0)

  return (
    <>
      <Cabecalho
        titulo="Pessoas"
        rotulo="Total a receber"
        valor={total}
        complemento={
          pessoas.length > 0
            ? `${pessoas.length} ${pessoas.length === 1 ? 'pessoa' : 'pessoas'} com lançamentos no seu nome`
            : undefined
        }
      />

      <main className="mx-auto max-w-6xl space-y-5 p-5 pb-24 lg:grid lg:grid-cols-2 lg:items-start lg:gap-5 lg:space-y-0 lg:px-12 lg:pb-12">
        {pessoas.map((pessoa) => {
          const saldo = saldos[pessoa.id] ?? 0
          const adiantou = saldo < 0

          return (
            <Cartao key={pessoa.id}>
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-sm font-bold text-texto">{pessoa.nome}</span>
                <Valor
                  centavos={saldo}
                  className={`text-lg font-bold ${
                    adiantou ? 'text-[var(--color-faixa-verde)]' : 'text-texto'
                  }`}
                />
              </div>

              {adiantou && (
                <p className="mt-1 text-xs font-medium text-texto-suave">
                  Pagou adiantado — esse valor é crédito.
                </p>
              )}

              <form action={registrarPagamento} className="mt-4 flex gap-2">
                <input type="hidden" name="pessoaId" value={pessoa.id} />
                <input type="hidden" name="data" value={hoje} />
                <label className="sr-only" htmlFor={`valor-${pessoa.id}`}>
                  Valor recebido de {pessoa.nome}
                </label>
                <input
                  id={`valor-${pessoa.id}`}
                  name="valorReais"
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="Quanto recebeu"
                  required
                  className={campo}
                />
                <button className={`${botao} shrink-0`}>Registrar</button>
              </form>
            </Cartao>
          )
        })}

        {pessoas.length === 0 && (
          <div className="lg:col-span-2">
            <Cartao>
              <p className="text-sm text-texto-suave">
                Ninguém cadastrado ainda. Adicione quem divide gastos com você para
                acompanhar o que tem a receber.
              </p>
            </Cartao>
          </div>
        )}

        <div className="lg:col-span-2">
          <Cartao titulo="Adicionar pessoa">
            <form action={novaPessoa} className="flex gap-2">
              <label className="sr-only" htmlFor="nome-pessoa">Nome da pessoa</label>
              <input id="nome-pessoa" name="nome" placeholder="Nome" required className={campo} />
              <button className={`${botao} shrink-0`}>Adicionar</button>
            </form>
          </Cartao>
        </div>
      </main>
    </>
  )
}
