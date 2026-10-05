import { prisma } from '@/server/db'
import { listarLancamentos } from '@/server/lancamentos'
import { obterDono } from '@/server/configuracao'
import { Cabecalho } from '@/components/Cabecalho'
import { Cartao } from '@/components/Cartao'
import { Valor } from '@/components/Valor'
import { PrimeiroAcesso } from '@/components/PrimeiroAcesso'
import { alterarStatus } from '@/app/acoes'
import { novoLancamento } from './acoes'

export const dynamic = 'force-dynamic'

const campo =
  'w-full rounded-card border border-cinza bg-fundo px-3 py-2 text-sm text-texto placeholder:text-texto-suave'
const botao =
  'rounded-pill bg-roxo px-4 py-2 text-sm font-medium text-white hover:bg-roxo-escuro'

const ROTULO_STATUS = {
  PREVISTO: 'previsto',
  EFETIVADO: 'efetivado',
  ATRASADO: 'atrasado',
} as const

const COR_STATUS = {
  PREVISTO: 'text-texto-suave',
  EFETIVADO: 'text-[var(--color-faixa-verde)]',
  ATRASADO: 'text-[var(--color-faixa-laranja)]',
} as const

type Busca = {
  competencia?: string
  contaId?: string
  categoriaId?: string
  pessoaId?: string
  status?: string
}

export default async function Lancamentos({
  searchParams,
}: {
  searchParams: Promise<Busca>
}) {
  const dono = await obterDono()
  if (!dono) return <PrimeiroAcesso />

  const f = await searchParams
  const competencia = f.competencia || new Date().toISOString().slice(0, 7)

  const [lancamentos, contas, categorias, pessoas] = await Promise.all([
    listarLancamentos({
      competencia,
      contaId: f.contaId || undefined,
      categoriaId: f.categoriaId || undefined,
      pessoaId: f.pessoaId || undefined,
      status: (f.status as 'PREVISTO' | 'EFETIVADO' | 'ATRASADO') || undefined,
    }),
    prisma.conta.findMany({ where: { ativa: true }, orderBy: { nome: 'asc' } }),
    prisma.categoria.findMany({ where: { ativa: true }, orderBy: { nome: 'asc' } }),
    prisma.pessoa.findMany({ where: { ativa: true }, orderBy: { nome: 'asc' } }),
  ])

  const total = lancamentos.reduce(
    (s, l) => s + (l.tipo === 'ENTRADA' ? l.valor : -l.valor),
    0,
  )
  const hoje = new Date().toISOString().slice(0, 10)

  return (
    <>
      <Cabecalho
        titulo="Lançamentos"
        rotulo="Resultado do filtro"
        valor={total}
        complemento={`${lancamentos.length} lançamentos em ${competencia}`}
      />

      <main className="mx-auto max-w-6xl space-y-5 p-5 pb-24 lg:px-12 lg:pb-12">
        {/* Filtros como estado de URL: a visão fica compartilhável, recarregável
            e navegável pelo botão voltar. */}
        <Cartao titulo="Filtrar">
          <form method="get" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <label className="block text-xs font-medium text-texto-suave">
              Competência
              <input
                name="competencia"
                type="month"
                defaultValue={competencia}
                className={`${campo} mt-1`}
              />
            </label>
            <label className="block text-xs font-medium text-texto-suave">
              Conta
              <select name="contaId" defaultValue={f.contaId ?? ''} className={`${campo} mt-1`}>
                <option value="">todas</option>
                {contas.map((c) => (
                  <option key={c.id} value={c.id}>{c.nome}</option>
                ))}
              </select>
            </label>
            <label className="block text-xs font-medium text-texto-suave">
              Categoria
              <select
                name="categoriaId"
                defaultValue={f.categoriaId ?? ''}
                className={`${campo} mt-1`}
              >
                <option value="">todas</option>
                {categorias.map((c) => (
                  <option key={c.id} value={c.id}>{c.nome}</option>
                ))}
              </select>
            </label>
            <label className="block text-xs font-medium text-texto-suave">
              Pessoa
              <select name="pessoaId" defaultValue={f.pessoaId ?? ''} className={`${campo} mt-1`}>
                <option value="">todas</option>
                {pessoas.map((p) => (
                  <option key={p.id} value={p.id}>{p.nome}</option>
                ))}
              </select>
            </label>
            <label className="block text-xs font-medium text-texto-suave">
              Situação
              <select name="status" defaultValue={f.status ?? ''} className={`${campo} mt-1`}>
                <option value="">todas</option>
                <option value="PREVISTO">previsto</option>
                <option value="EFETIVADO">efetivado</option>
                <option value="ATRASADO">atrasado</option>
              </select>
            </label>
            <button className={`${botao} sm:col-span-2 lg:col-span-5 lg:justify-self-start`}>
              Aplicar
            </button>
          </form>
        </Cartao>

        <Cartao titulo="Novo lançamento">
          <form action={novoLancamento} className="grid gap-3 sm:grid-cols-2">
            <input name="descricao" placeholder="O que foi" required className={campo} />
            <input
              name="valorReais"
              type="number"
              step="0.01"
              min="0.01"
              placeholder="Valor"
              required
              className={campo}
            />
            <select name="tipo" required className={campo}>
              <option value="SAIDA">Saída</option>
              <option value="ENTRADA">Entrada</option>
            </select>
            <input name="data" type="date" defaultValue={hoje} required className={campo} />
            <select name="contaId" required className={campo}>
              {contas.map((c) => (
                <option key={c.id} value={c.id}>{c.nome}</option>
              ))}
            </select>
            <select name="categoriaId" className={campo}>
              <option value="">sem categoria</option>
              {categorias.map((c) => (
                <option key={c.id} value={c.id}>{c.nome}</option>
              ))}
            </select>
            <select name="pessoaId" className={campo}>
              <option value="">meu gasto</option>
              {pessoas
                .filter((p) => !p.ehDono)
                .map((p) => (
                  <option key={p.id} value={p.id}>de {p.nome}</option>
                ))}
            </select>
            <select name="status" className={campo}>
              <option value="EFETIVADO">efetivado</option>
              <option value="PREVISTO">previsto</option>
            </select>
            <button className={`${botao} sm:col-span-2 sm:justify-self-start`}>Salvar</button>
          </form>
        </Cartao>

        <Cartao titulo="Extrato">
          {lancamentos.length === 0 ? (
            <p className="text-sm text-texto-suave">
              Nenhum lançamento com esses filtros.
            </p>
          ) : (
            <ul className="divide-y divide-fundo">
              {lancamentos.map((l) => (
                <li
                  key={l.id}
                  className="py-3 first:pt-0 sm:flex sm:items-center sm:justify-between sm:gap-4"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-texto">{l.descricao}</div>
                    <div className="text-xs font-medium text-texto-suave">
                      {l.data.slice(8, 10)}/{l.data.slice(5, 7)} · {l.conta.nome}
                      {l.categoria ? ` · ${l.categoria.nome}` : ''}
                      {l.pessoa && !l.pessoa.ehDono ? ` · de ${l.pessoa.nome}` : ''}
                    </div>
                  </div>

                  <div className="mt-2 flex shrink-0 items-center gap-3 sm:mt-0">
                    <Valor
                      centavos={l.tipo === 'ENTRADA' ? l.valor : -l.valor}
                      className={`text-sm font-bold ${
                        l.tipo === 'ENTRADA'
                          ? 'text-[var(--color-faixa-verde)]'
                          : 'text-texto'
                      }`}
                    />
                    <form action={alterarStatus} className="flex items-center gap-2">
                      <input type="hidden" name="lancamentoId" value={l.id} />
                      <label className="sr-only" htmlFor={`st-${l.id}`}>
                        Situação de {l.descricao}
                      </label>
                      <select
                        id={`st-${l.id}`}
                        name="status"
                        defaultValue={l.status}
                        className={`rounded-pill bg-fundo px-3 py-1.5 text-xs font-medium ${COR_STATUS[l.status]}`}
                      >
                        {(['PREVISTO', 'EFETIVADO', 'ATRASADO'] as const).map((s) => (
                          <option key={s} value={s}>{ROTULO_STATUS[s]}</option>
                        ))}
                      </select>
                      <button className="text-xs font-bold text-roxo hover:underline">
                        salvar
                      </button>
                    </form>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Cartao>
      </main>
    </>
  )
}
