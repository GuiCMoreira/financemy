'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import {
  NOME_COOKIE,
  criarToken,
  comparaSeguro,
  senhaConfigurada,
} from '@/server/sessao'

export type EstadoLogin = { erro: string | null }

export async function entrar(
  _anterior: EstadoLogin,
  formData: FormData,
): Promise<EstadoLogin> {
  const senhaCorreta = senhaConfigurada()
  if (!senhaCorreta) {
    return { erro: 'SENHA_ACESSO não está configurada no servidor.' }
  }

  const informada = String(formData.get('senha') ?? '')

  if (!comparaSeguro(informada, senhaCorreta)) {
    // Mensagem genérica de propósito: distinguir "senha errada" de qualquer
    // outra coisa entregaria informação a quem está tentando adivinhar.
    return { erro: 'Senha incorreta.' }
  }

  const jar = await cookies()
  jar.set(NOME_COOKIE, await criarToken(senhaCorreta), {
    httpOnly: true, // inacessível a JavaScript — barra roubo por XSS
    sameSite: 'lax', // barra envio em requisições de outros sites
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  })

  redirect('/')
}

export async function sair(): Promise<void> {
  const jar = await cookies()
  jar.delete(NOME_COOKIE)
  redirect('/login')
}
