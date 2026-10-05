import { listarContasComSaldo } from '@/server/contas'
import { obterDono } from '@/server/configuracao'
import { Cabecalho } from '@/components/Cabecalho'
import { Cartao } from '@/components/Cartao'
import { Valor } from '@/components/Valor'
import { PrimeiroAcesso } from '@/components/PrimeiroAcesso'
import { FormTransferencia } from '@/components/FormTransferencia'
import { novaConta } from './acoes'

export const dynamic = 'force-dynamic'

const campo =
  'w-full rounded-card border border-cinza bg-fundo px-3 py-2 text-sm text-texto placeholder:text-texto-suave'

const ROTULO_TIPO: Record<string, string> = {
  CORRENTE: 'Conta corrente',
  POUPANCA: 'Poupança',
  DINHEIRO: 'Dinheiro',
  CARTAO: 'Cartão de crédito',
  INVESTIMENTO: 'Investimento',
}

export default async function Contas() {
  const dono = await obterDono()
  if (!dono) return <PrimeiroAcesso />

  const contas = await listarContasComSaldo()
  const consolidado = contas.reduce((s, c) => s + c.saldo, 0)
  const hoje = new Date().toISOString().slice(0, 10)

  return (
    <>
      <Cabecalho
        titulo="Contas"
        rotulo="Saldo consolidado"
        valor={consolidado}
        complemento={`${contas.length} ${contas.length === 1 ? 'conta ativa' : 'contas ativas'}`}
      />

      <main className="mx-auto max-w-6xl space-y-5 p-5 pb-24 lg:grid lg:grid-cols-2 lg:items-start lg:gap-5 lg:space-y-0 lg:px-12 lg:pb-12">
        <div className="lg:col-span-2">
          <Cartao titulo="Suas contas" acessorio="saldo atual e previsto">
            {contas.length === 0 ? (
              <p className="text-sm text-texto-suave">Nenhuma conta cadastrada.</p>
            ) : (
              <ul className="divide-y divide-fundo">
                {contas.map((c) => (
                  <li key={c.id} className="flex items-center justify-between gap-4 py-3 first:pt-0">
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-texto">{c.nome}</div>
                      <div className="text-xs font-medium text-texto-suave">
                        {ROTULO_TIPO[c.tipo] ?? c.tipo}
                        {c.diaFechamento
                          ? ` · fecha ${c.diaFechamento}, vence ${c.diaVencimento}`
                          : ''}
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <Valor centavos={c.saldo} className="block text-sm font-bold text-texto" />
                      {c.previsto !== c.saldo && (
                        <span className="text-xs font-medium text-texto-suave">
                          previsto <Valor centavos={c.previsto} />
                        </span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Cartao>
        </div>

        <Cartao titulo="Nova conta">
          <form action={novaConta} className="space-y-3">
            <input name="nome" placeholder="Nome da conta" required className={campo} />
            <select name="tipo" required className={campo}>
              <option value="CORRENTE">Conta corrente</option>
              <option value="POUPANCA">Poupança</option>
              <option value="DINHEIRO">Dinheiro</option>
              <option value="CARTAO">Cartão de crédito</option>
              <option value="INVESTIMENTO">Investimento</option>
            </select>
            <input
              name="saldoInicialReais"
              type="number"
              step="0.01"
              placeholder="Saldo inicial"
              defaultValue="0"
              className={campo}
            />
            <div className="flex gap-3">
              <input
                name="diaFechamento"
                type="number"
                min="1"
                max="31"
                placeholder="Fecha dia (cartão)"
                className={campo}
              />
              <input
                name="diaVencimento"
                type="number"
                min="1"
                max="31"
                placeholder="Vence dia (cartão)"
                className={campo}
              />
            </div>
            <button className="rounded-pill bg-roxo px-4 py-2 text-sm font-medium text-white hover:bg-roxo-escuro">
              Salvar
            </button>
          </form>
        </Cartao>

        <Cartao titulo="Transferir entre contas">
          {contas.length < 2 ? (
            <p className="text-sm text-texto-suave">
              Cadastre ao menos duas contas para transferir entre elas.
            </p>
          ) : (
            <FormTransferencia contas={contas} hoje={hoje} />
          )}
        </Cartao>
      </main>
    </>
  )
}
