import { describe, it, expect } from 'vitest'
import { criarToken, tokenValido, comparaSeguro } from './sessao'

const SENHA = 'senha-de-teste-123'
const AGORA = 1_800_000_000_000

describe('comparaSeguro', () => {
  it('aceita strings iguais', () => {
    expect(comparaSeguro('abc', 'abc')).toBe(true)
  })

  it('recusa strings diferentes', () => {
    expect(comparaSeguro('abc', 'abd')).toBe(false)
  })

  it('recusa tamanhos diferentes', () => {
    expect(comparaSeguro('abc', 'abcd')).toBe(false)
  })

  it('recusa string vazia contra preenchida', () => {
    expect(comparaSeguro('', 'abc')).toBe(false)
  })
})

describe('token de sessão', () => {
  it('aceita token recém-criado', async () => {
    const t = await criarToken(SENHA, AGORA)
    expect(await tokenValido(t, SENHA, AGORA)).toBe(true)
  })

  it('recusa token de outra senha', async () => {
    const t = await criarToken(SENHA, AGORA)
    expect(await tokenValido(t, 'outra-senha', AGORA)).toBe(false)
  })

  it('recusa token expirado', async () => {
    const t = await criarToken(SENHA, AGORA)
    const trintaEUmDias = 1000 * 60 * 60 * 24 * 31
    expect(await tokenValido(t, SENHA, AGORA + trintaEUmDias)).toBe(false)
  })

  it('recusa token ausente', async () => {
    expect(await tokenValido(undefined, SENHA, AGORA)).toBe(false)
  })

  it('recusa token malformado', async () => {
    expect(await tokenValido('qualquer-coisa', SENHA, AGORA)).toBe(false)
    expect(await tokenValido('a.b.c', SENHA, AGORA)).toBe(false)
    expect(await tokenValido('.assinatura', SENHA, AGORA)).toBe(false)
  })

  it('recusa assinatura adulterada mantendo a expiração', async () => {
    const t = await criarToken(SENHA, AGORA)
    const [expiracao] = t.split('.')
    const forjado = `${expiracao}.${'0'.repeat(64)}`
    expect(await tokenValido(forjado, SENHA, AGORA)).toBe(false)
  })

  it('recusa expiração esticada — a assinatura não confere', async () => {
    const t = await criarToken(SENHA, AGORA)
    const [, assinatura] = t.split('.')
    const esticado = `${AGORA + 99_999_999_999}.${assinatura}`
    expect(await tokenValido(esticado, SENHA, AGORA)).toBe(false)
  })
})
