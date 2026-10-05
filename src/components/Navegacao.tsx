'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const ITENS = [
  { href: '/', rotulo: 'Painel' },
  { href: '/lancamentos', rotulo: 'Lançamentos' },
  { href: '/contas', rotulo: 'Contas' },
  { href: '/relatorios', rotulo: 'Relatórios' },
  { href: '/pessoas', rotulo: 'Pessoas' },
  { href: '/cadastros', rotulo: 'Cadastros' },
] as const

/**
 * Barra superior no desktop e inferior no mobile, ao alcance do polegar.
 * Com seis itens, o mobile rola horizontalmente em vez de espremer: rótulo
 * cortado é pior que rolagem, porque o usuário não sabe o que está perdendo.
 */
export function Navegacao() {
  const atual = usePathname()

  const classe = (href: string) =>
    atual === href ? 'text-roxo' : 'text-texto-suave hover:text-texto'

  return (
    <>
      <nav className="fixed inset-x-0 top-0 z-20 hidden h-[68px] items-center gap-7 bg-fundo px-12 lg:flex">
        <span className="text-lg font-bold text-roxo">Caixa</span>
        {ITENS.map((i) => (
          <Link
            key={i.href}
            href={i.href}
            aria-current={atual === i.href ? 'page' : undefined}
            className={`text-sm font-medium transition-colors ${classe(i.href)}`}
          >
            {i.rotulo}
          </Link>
        ))}
      </nav>

      <nav className="fixed inset-x-0 bottom-0 z-20 flex overflow-x-auto border-t border-cinza bg-fundo lg:hidden">
        {ITENS.map((i) => (
          <Link
            key={i.href}
            href={i.href}
            aria-current={atual === i.href ? 'page' : undefined}
            className={`shrink-0 flex-1 whitespace-nowrap px-4 py-3.5 text-center text-xs font-bold ${classe(i.href)}`}
          >
            {i.rotulo}
          </Link>
        ))}
      </nav>
    </>
  )
}
