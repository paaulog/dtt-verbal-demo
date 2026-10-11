import { describe, expect, it } from 'vitest'
import { DEMO_NOTICE } from './notice'

describe('aviso de demonstração', () => {
  it('deixa claro que não é para uso com pacientes', () => {
    expect(DEMO_NOTICE).toMatch(/Não use com pacientes/)
  })
})
