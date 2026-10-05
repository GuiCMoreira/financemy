import { describe, it, expect } from 'vitest'
import { validarTransferencia } from './validacoes'

describe('validarTransferencia', () => {
  it('aceita contas diferentes com valor positivo', () => {
    expect(validarTransferencia('a', 'b', 10000)).toBeNull()
  })

  it('recusa origem igual ao destino', () => {
    expect(validarTransferencia('a', 'a', 10000)).toMatch(/mesma conta/i)
  })

  it('recusa valor zero', () => {
    expect(validarTransferencia('a', 'b', 0)).toMatch(/maior que zero/i)
  })

  it('recusa valor negativo', () => {
    expect(validarTransferencia('a', 'b', -100)).toMatch(/maior que zero/i)
  })
})
