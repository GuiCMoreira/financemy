/**
 * Sessão por senha única, para instância pessoal self-hosted.
 *
 * Não há cadastro nem múltiplos usuários: quem tem a senha é o dono. O cookie
 * guarda um token assinado com HMAC derivado da própria senha, então trocar a
 * senha invalida todas as sessões automaticamente — comportamento desejável
 * quando a suspeita é justamente de que alguém a descobriu.
 *
 * Usa Web Crypto porque o middleware do Next roda em Edge runtime, onde
 * `node:crypto` não está disponível por completo.
 */

export const NOME_COOKIE = 'caixa_sessao'
const DURACAO_MS = 1000 * 60 * 60 * 24 * 30 // 30 dias

/**
 * Devolve `ArrayBuffer` e não `Uint8Array`: o tipo genérico
 * `Uint8Array<ArrayBufferLike>` não satisfaz `BufferSource` da Web Crypto nas
 * libs recentes do TypeScript.
 */
function paraBytes(texto: string): ArrayBuffer {
  const bytes = new TextEncoder().encode(texto)
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)
}

function paraHex(buffer: ArrayBuffer): string {
  return [...new Uint8Array(buffer)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

async function assinar(mensagem: string, segredo: string): Promise<string> {
  const chave = await crypto.subtle.importKey(
    'raw',
    paraBytes(segredo),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  return paraHex(await crypto.subtle.sign('HMAC', chave, paraBytes(mensagem)))
}

/**
 * Comparação em tempo constante.
 *
 * Uma comparação com `===` vaza informação pelo tempo de resposta: strings que
 * diferem no primeiro caractere retornam mais rápido que as que diferem no
 * último, e isso permite descobrir o valor correto caractere a caractere.
 */
export function comparaSeguro(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diferenca = 0
  for (let i = 0; i < a.length; i += 1) {
    diferenca |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return diferenca === 0
}

/** Token no formato `expiracaoEmMs.assinatura`. */
export async function criarToken(senha: string, agora = Date.now()): Promise<string> {
  const expiracao = String(agora + DURACAO_MS)
  return `${expiracao}.${await assinar(expiracao, senha)}`
}

export async function tokenValido(
  token: string | undefined,
  senha: string,
  agora = Date.now(),
): Promise<boolean> {
  if (!token) return false

  const partes = token.split('.')
  if (partes.length !== 2) return false

  const [expiracao, assinatura] = partes
  if (!/^\d+$/.test(expiracao)) return false
  if (Number(expiracao) < agora) return false

  return comparaSeguro(assinatura, await assinar(expiracao, senha))
}

/**
 * A senha de acesso. Ausente, a aplicação recusa requisições em vez de liberar:
 * um sistema financeiro que abre sozinho porque faltou configuração é pior que
 * um que não sobe.
 */
export function senhaConfigurada(): string | null {
  const senha = process.env.SENHA_ACESSO
  return senha && senha.length > 0 ? senha : null
}
