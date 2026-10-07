'use client'

import { useActionState } from 'react'
import { entrar, type EstadoLogin } from './acoes'

const INICIAL: EstadoLogin = { erro: null }

export default function Login() {
  const [estado, acao, enviando] = useActionState(entrar, INICIAL)

  return (
    <main className="grid min-h-dvh place-items-center p-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <p className="text-2xl font-bold text-roxo">Caixa</p>
          <p className="mt-1 text-sm text-texto-suave">Controle financeiro pessoal</p>
        </div>

        <form action={acao} className="space-y-4 rounded-bloco bg-superficie p-6">
          <label className="block text-xs font-medium text-texto-suave">
            Senha de acesso
            <input
              name="senha"
              type="password"
              autoFocus
              autoComplete="current-password"
              required
              className="mt-1 w-full rounded-card border border-cinza bg-fundo px-3 py-2 text-sm text-texto"
            />
          </label>

          <button
            disabled={enviando}
            className="w-full rounded-pill bg-roxo px-4 py-2.5 text-sm font-bold text-white hover:bg-roxo-escuro disabled:opacity-60"
          >
            {enviando ? 'Entrando…' : 'Entrar'}
          </button>

          {estado.erro && (
            <p
              role="alert"
              className="text-center text-xs font-medium text-[var(--color-faixa-laranja)]"
            >
              {estado.erro}
            </p>
          )}
        </form>
      </div>
    </main>
  )
}
