'use client'

import { useActionState } from 'react'
import { novaTransferencia, type EstadoTransferencia } from '@/app/contas/acoes'

const campo =
  'w-full rounded-card border border-cinza bg-fundo px-3 py-2 text-sm text-texto placeholder:text-texto-suave'

const INICIAL: EstadoTransferencia = { erro: null }

/**
 * Client component para exibir a recusa em texto. A validação mais comum aqui
 * — origem igual ao destino — precisa dizer o motivo, senão o usuário tenta de
 * novo igual e conclui que o sistema está quebrado.
 */
export function FormTransferencia({
  contas,
  hoje,
}: {
  contas: { id: string; nome: string }[]
  hoje: string
}) {
  const [estado, acao, enviando] = useActionState(novaTransferencia, INICIAL)

  return (
    <form action={acao} className="grid gap-3 sm:grid-cols-2">
      <label className="block text-xs font-medium text-texto-suave">
        Quando
        <input name="data" type="date" defaultValue={hoje} required className={`${campo} mt-1`} />
      </label>
      <label className="block text-xs font-medium text-texto-suave">
        Valor
        <input
          name="valorReais"
          type="number"
          step="0.01"
          min="0.01"
          required
          className={`${campo} mt-1`}
        />
      </label>
      <label className="block text-xs font-medium text-texto-suave">
        De
        <select name="contaOrigemId" required className={`${campo} mt-1`}>
          {contas.map((c) => (
            <option key={c.id} value={c.id}>{c.nome}</option>
          ))}
        </select>
      </label>
      <label className="block text-xs font-medium text-texto-suave">
        Para
        <select name="contaDestinoId" required className={`${campo} mt-1`}>
          {contas.map((c) => (
            <option key={c.id} value={c.id}>{c.nome}</option>
          ))}
        </select>
      </label>

      <button
        disabled={enviando}
        className="rounded-pill bg-roxo px-4 py-2 text-sm font-medium text-white hover:bg-roxo-escuro disabled:opacity-60 sm:col-span-2 sm:justify-self-start"
      >
        {enviando ? 'Transferindo…' : 'Transferir'}
      </button>

      {estado.erro && (
        <p
          role="alert"
          className="text-xs font-medium text-[var(--color-faixa-laranja)] sm:col-span-2"
        >
          {estado.erro}
        </p>
      )}
    </form>
  )
}
