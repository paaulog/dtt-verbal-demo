import { describe, expect, it } from 'vitest'
import { makeProgram } from './fixtures'
import { validateProgram } from './validation'

describe('validação do programa', () => {
  it('aceita os padrões da demo', () => {
    expect(validateProgram(makeProgram('tato'))).toEqual([])
    expect(validateProgram(makeProgram('ouvinte'))).toEqual([])
  })

  it('exige o nível independente no fim da hierarquia', () => {
    const program = makeProgram('tato')
    const reversed = { ...program, promptHierarchy: [...program.promptHierarchy].reverse() }
    expect(validateProgram(reversed).join(' ')).toMatch(/último nível/)
  })

  it('exige ao menos um nível que conte como acerto e critério válido', () => {
    const program = makeProgram('tato', { countsAsCorrect: [] })
    const errors = validateProgram({ ...program, mastery: { ...program.mastery, percent: 0 } })
    expect(errors).toHaveLength(2)
  })
})
