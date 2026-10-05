import { prisma } from '@/server/db'
import { obterDono } from '@/server/configuracao'
import { taxaEfetiva, custoTotalEmTaxas } from '@/domain/antecipacao'
import { Cabecalho } from '@/components/Cabecalho'
import { Cartao } from '@/components/Cartao'
import { Valor } from '@/components/Valor'
import { PrimeiroAcesso } from '@/components/PrimeiroAcesso'
import {
  novaCategoria,
  desativarCategoria,
  novaRecorrencia,
  novoParcelamento,
  novaAntecipacao,
} from './acoes'

export const dynamic = 'force-dynamic'

const campo =
  'w-full rounded-card border border-cinza bg-fundo px-3 py-2 text-sm text-texto placeholder:text-texto-suave'
const botao =
  'rounded-pill bg-roxo px-4 py-2 text-sm font-medium text-white hover:bg-roxo-escuro'

export default async function Cadastros() {
  const dono = await obterDono()
  if (!dono) return <PrimeiroAcesso />

  const [categorias, contas, pessoas, recorrencias, parcelamentos, antecipacoes] =
    await Promise.all([
      prisma.categoria.findMany({ where: { ativa: true }, orderBy: [{ tipo: 'asc' }, { nome: 'asc' }] }),
      prisma.conta.findMany({ where: { ativa: true }, orderBy: { nome: 'asc' } }),
      prisma.pessoa.findMany({ where: { ativa: true }, orderBy: { nome: 'asc' } }),
      prisma.recorrencia.findMany({ where: { ativa: true }, include: { conta: true } }),
      prisma.parcelamento.findMany({ include: { pessoa: true }, orderBy: { criadoEm: 'desc' }, take: 10 }),
      prisma.antecipacao.findMany({ orderBy: { data: 'desc' } }),
    ])

  const semConta = contas.length === 0
  const hoje = new Date().toISOString().slice(0, 10)
  const custoTaxas = custoTotalEmTaxas(
    antecipacoes.map((a) => ({ valorPassado: a.valorBruto, valorRecebido: a.valorLiquido })),
  )

  return (
    <>
      <Cabecalho
        titulo="Cadastros"
        rotulo="Já pago em taxas de antecipação"
        valor={custoTaxas}
        complemento={
          antecipacoes.length > 0
            ? `${antecipacoes.length} ${antecipacoes.length === 1 ? 'operação' : 'operações'} — dinheiro que saiu sem abater dívida`
            : 'Nenhuma antecipação registrada'
        }
      />

      <main className="mx-auto max-w-6xl space-y-5 p-5 pb-24 lg:grid lg:grid-cols-2 lg:items-start lg:gap-5 lg:space-y-0 lg:px-12 lg:pb-12">
        <Cartao titulo="Categorias" acessorio={`${categorias.length} ativas`}>
          <form action={novaCategoria} className="mb-4 grid gap-3 sm:grid-cols-3">
            <input name="nome" placeholder="Nome" required className={`${campo} sm:col-span-2`} />
            <select name="tipo" required className={campo}>
              <option value="SAIDA">Saída</option>
              <option value="ENTRADA">Entrada</option>
            </select>
            <input name="cor" type="color" defaultValue="#8A19D6" className={`${campo} h-10`} />
            <button className={`${botao} sm:col-span-2`}>Adicionar</button>
          </form>

          <ul className="divide-y divide-fundo">
            {categorias.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-3 py-2">
                <span className="flex items-center gap-2 text-sm text-texto">
                  <span
                    className="size-2.5 shrink-0 rounded-full"
                    style={{ background: c.cor }}
                    aria-hidden
                  />
                  {c.nome}
                  <span className="text-xs text-texto-suave">
                    {c.tipo === 'ENTRADA' ? 'entrada' : 'saída'}
                  </span>
                </span>
                <form action={desativarCategoria}>
                  <input type="hidden" name="categoriaId" value={c.id} />
                  <button className="text-xs font-medium text-texto-suave hover:text-texto">
                    desativar
                  </button>
                </form>
              </li>
            ))}
          </ul>
        </Cartao>

        <Cartao titulo="Recorrências" acessorio="todo mês">
          {semConta ? (
            <p className="text-sm text-texto-suave">Cadastre uma conta primeiro.</p>
          ) : (
            <form action={novaRecorrencia} className="mb-4 grid gap-3 sm:grid-cols-2">
              <input name="descricao" placeholder="Salário, aluguel…" required className={`${campo} sm:col-span-2`} />
              <input name="valorReais" type="number" step="0.01" min="0.01" placeholder="Valor" required className={campo} />
              <input name="diaDoMes" type="number" min="1" max="31" placeholder="Dia" required className={campo} />
              <select name="tipo" required className={campo}>
                <option value="SAIDA">Saída</option>
                <option value="ENTRADA">Entrada</option>
              </select>
              <input name="dataInicio" type="date" defaultValue={hoje} required className={campo} />
              <select name="contaId" required className={campo}>
                {contas.map((c) => (<option key={c.id} value={c.id}>{c.nome}</option>))}
              </select>
              <select name="categoriaId" className={campo}>
                <option value="">sem categoria</option>
                {categorias.map((c) => (<option key={c.id} value={c.id}>{c.nome}</option>))}
              </select>
              <button className={`${botao} sm:col-span-2 sm:justify-self-start`}>Salvar</button>
            </form>
          )}

          <ul className="divide-y divide-fundo">
            {recorrencias.map((r) => (
              <li key={r.id} className="flex justify-between py-2">
                <span className="text-sm text-texto">
                  {r.descricao}
                  <span className="ml-2 text-xs text-texto-suave">dia {r.diaDoMes}</span>
                </span>
                <Valor centavos={r.tipo === 'ENTRADA' ? r.valor : -r.valor} className="text-sm font-medium text-texto" />
              </li>
            ))}
          </ul>
        </Cartao>

        <Cartao titulo="Parcelamentos">
          {semConta ? (
            <p className="text-sm text-texto-suave">Cadastre uma conta primeiro.</p>
          ) : (
            <form action={novoParcelamento} className="mb-4 grid gap-3 sm:grid-cols-2">
              <input name="descricao" placeholder="O que foi comprado" required className={`${campo} sm:col-span-2`} />
              <input name="valorTotalReais" type="number" step="0.01" min="0.01" placeholder="Valor total" required className={campo} />
              <input name="numeroParcelas" type="number" min="1" max="120" placeholder="Parcelas" required className={campo} />
              <label className="block text-xs font-medium text-texto-suave sm:col-span-2">
                Data da compra
                <input name="dataInicio" type="date" defaultValue={hoje} required className={`${campo} mt-1`} />
              </label>
              <select name="contaId" required className={campo}>
                {contas.map((c) => (<option key={c.id} value={c.id}>{c.nome}</option>))}
              </select>
              <select name="categoriaId" className={campo}>
                <option value="">sem categoria</option>
                {categorias.map((c) => (<option key={c.id} value={c.id}>{c.nome}</option>))}
              </select>
              <select name="pessoaId" className={`${campo} sm:col-span-2`}>
                <option value="">meu gasto</option>
                {pessoas.filter((p) => !p.ehDono).map((p) => (
                  <option key={p.id} value={p.id}>de {p.nome}</option>
                ))}
              </select>
              <button className={`${botao} sm:col-span-2 sm:justify-self-start`}>Salvar</button>
            </form>
          )}

          <ul className="divide-y divide-fundo">
            {parcelamentos.map((p) => (
              <li key={p.id} className="flex justify-between py-2">
                <span className="text-sm text-texto">
                  {p.descricao}
                  <span className="ml-2 text-xs text-texto-suave">
                    {p.numeroParcelas}×{p.pessoa && !p.pessoa.ehDono ? ` · de ${p.pessoa.nome}` : ''}
                  </span>
                </span>
                <Valor centavos={p.valorParcela} className="text-sm font-medium text-texto" />
              </li>
            ))}
          </ul>
        </Cartao>

        <Cartao titulo="Antecipações" acessorio="crédito para cobrir obrigação">
          {semConta ? (
            <p className="text-sm text-texto-suave">Cadastre uma conta primeiro.</p>
          ) : (
            <form action={novaAntecipacao} className="mb-4 grid gap-3 sm:grid-cols-2">
              <label className="block text-xs font-medium text-texto-suave">
                Quando
                <input name="data" type="date" defaultValue={hoje} required className={`${campo} mt-1`} />
              </label>
              <label className="block text-xs font-medium text-texto-suave">
                Em quantas parcelas
                <input name="numeroParcelas" type="number" min="1" defaultValue="1" required className={`${campo} mt-1`} />
              </label>
              <label className="block text-xs font-medium text-texto-suave">
                Valor contratado
                <input name="valorBrutoReais" type="number" step="0.01" min="0.01" required className={`${campo} mt-1`} />
              </label>
              <label className="block text-xs font-medium text-texto-suave">
                Valor recebido
                <input name="valorLiquidoReais" type="number" step="0.01" min="0.01" required className={`${campo} mt-1`} />
              </label>
              <select name="contaId" required className={`${campo} sm:col-span-2`}>
                {contas.map((c) => (<option key={c.id} value={c.id}>{c.nome}</option>))}
              </select>
              <button className={`${botao} sm:col-span-2 sm:justify-self-start`}>Salvar</button>
            </form>
          )}

          {antecipacoes.length > 0 && (
            <ul className="divide-y divide-fundo border-t border-fundo pt-2">
              {antecipacoes.map((a) => (
                <li key={a.id} className="flex items-baseline justify-between gap-3 py-2">
                  <span className="text-xs font-medium text-texto-suave">{a.data}</span>
                  <span className="text-xs font-medium text-texto">
                    <Valor centavos={a.valorBruto} /> → <Valor centavos={a.valorLiquido} />
                    <span className="ml-2 text-[var(--color-faixa-laranja)]">
                      {(taxaEfetiva(a.valorBruto, a.valorLiquido) * 100).toFixed(2)}%
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Cartao>
      </main>
    </>
  )
}
