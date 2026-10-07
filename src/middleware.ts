import { NextResponse, type NextRequest } from 'next/server'
import { NOME_COOKIE, tokenValido, senhaConfigurada } from '@/server/sessao'

/**
 * O matcher protege tudo e abre exceções, em vez de listar o que proteger.
 *
 * Numa aplicação com dados financeiros, esquecer de incluir uma rota nova numa
 * lista de proteção é falha silenciosa — a rota nasce aberta e ninguém percebe.
 * Esquecer de excluir uma rota pública apenas incomoda.
 */
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icon.svg|robots.txt).*)'],
}

export async function middleware(request: NextRequest) {
  const caminho = request.nextUrl.pathname
  const senha = senhaConfigurada()

  // Sem senha configurada a aplicação não libera: um sistema financeiro que
  // abre sozinho porque faltou configuração é pior que um que não sobe.
  if (!senha) {
    if (caminho === '/configuracao-pendente') return NextResponse.next()
    return NextResponse.redirect(new URL('/configuracao-pendente', request.url))
  }

  const autenticado = await tokenValido(request.cookies.get(NOME_COOKIE)?.value, senha)

  if (caminho === '/login') {
    return autenticado
      ? NextResponse.redirect(new URL('/', request.url))
      : NextResponse.next()
  }

  if (caminho === '/configuracao-pendente') {
    return NextResponse.redirect(new URL('/', request.url))
  }

  if (!autenticado) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return NextResponse.next()
}
