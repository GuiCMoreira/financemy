'use client'

import { useActionState, useState } from 'react'
import { configurarInicio, type EstadoInicio } from '@/app/acoes'

const campo =
  'w-full rounded-card border border-cinza bg-fundo px-3 py-2 text-sm text-texto placeholder:text-texto-suave'
const rotulo = 'block text-xs font-medium text-texto-suave'

const INICIAL: EstadoInicio = { erro: null }

/**
 * Tela de primeira execução. Pede o mínimo para o sistema funcionar: quem é
 * você e onde o dinheiro está. Categorias vêm prontas; o resto entra pela
 * tela de cadastros.
 */
export function PrimeiroAcesso() {
  const [estado, acao, enviando] = useActionState(configurarInicio, INICIAL)
  const [tipo, setTipo] = useState<'CORRENTE' | 'CARTAO' | 'DINHEIRO'>('CORRENTE')

  return (
    <>
      <header className="faixa-roxa bg-roxo px-6 pt-12 pb-9 lg:px-12 lg:pt-[84px]">
        <p className="mx-auto max-w-lg text-lg font-bold text-white">
          Bem-vindo ao Caixa
        </p>
      </header>

      <main className="mx-auto max-w-lg space-y-5 p-5 pb-24">
        <p className="text-sm text-texto-suave">
          Vamos configurar o básico. Você pode mudar tudo depois, e as categorias mais
          comuns já vêm prontas.
        </p>

        <form action={acao} className="space-y-4 rounded-bloco bg-superficie p-6">
          <label className={rotulo}>
            Seu nome
            <input
              name="nome"
              placeholder="Como quer ser chamado"
              required
              maxLength={40}
              className={`${campo} mt-1`}
            />
          </label>

          <label className={rotulo}>
            Primeira conta
            <input
              name="nomeConta"
              defaultValue="Conta corrente"
              required
              maxLength={40}
              className={`${campo} mt-1`}
            />
          </label>

          <label className={rotulo}>
            Tipo
            <select
              name="tipoConta"
              value={tipo}
              onChange={(e) => setTipo(e.target.value as typeof tipo)}
              className={`${campo} mt-1`}
            >
              <option value="CORRENTE">Conta corrente</option>
              <option value="CARTAO">Cartão de crédito</option>
              <option value="DINHEIRO">Dinheiro</option>
            </select>
          </label>

          {tipo === 'CARTAO' ? (
            <div className="flex gap-3">
              <label className={`flex-1 ${rotulo}`}>
                Fecha dia
                <input
                  name="diaFechamento"
                  type="number"
                  min="1"
                  max="31"
                  defaultValue="15"
                  className={`${campo} mt-1`}
                />
              </label>
              <label className={`flex-1 ${rotulo}`}>
                Vence dia
                <input
                  name="diaVencimento"
                  type="number"
                  min="1"
                  max="31"
                  defaultValue="22"
                  className={`${campo} mt-1`}
                />
              </label>
            </div>
          ) : (
            <label className={rotulo}>
              Saldo atual
              <input
                name="saldoInicialReais"
                type="number"
                step="0.01"
                defaultValue="0"
                className={`${campo} mt-1`}
              />
            </label>
          )}

          <button
            disabled={enviando}
            className="w-full rounded-pill bg-roxo px-4 py-2.5 text-sm font-bold text-white hover:bg-roxo-escuro disabled:opacity-60"
          >
            {enviando ? 'Salvando…' : 'Começar'}
          </button>

          {estado.erro && (
            <div
              role="alert"
              className="rounded-card bg-fundo p-3 text-xs text-[var(--color-faixa-laranja)]"
            >
              <p className="font-bold">Não consegui salvar.</p>
              <p className="mt-1 break-words font-mono">{estado.erro}</p>
            </div>
          )}
        </form>
      </main>
    </>
  )
}
