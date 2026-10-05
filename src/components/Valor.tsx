'use client'

import { formatarBRL } from '@/domain/dinheiro'
import type { Centavos } from '@/domain/dinheiro'
import { usarPreferencias } from './Preferencias'

type Props = {
  centavos: Centavos
  className?: string
}

/**
 * Quando os valores estão ocultos, a censura preserva a largura aproximada do
 * número original. Substituir tudo por um bloco fixo faria a página saltar a
 * cada toque no olho.
 */
export function Valor({ centavos, className = '' }: Props) {
  const { oculto } = usarPreferencias()

  if (!oculto) {
    return <span className={className}>{formatarBRL(centavos)}</span>
  }

  const digitos = Math.max(3, formatarBRL(centavos).replace(/\D/g, '').length)

  return (
    <span className={className} aria-label="valor oculto">
      {'•'.repeat(digitos)}
    </span>
  )
}
