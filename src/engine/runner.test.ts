import { describe, expect, it } from 'vitest'
import { makeProgram, makeTarget, makeTrial } from './fixtures'
import { seededRandom } from './random'
import { nextTrialSpec } from './runner'
import type { Trial } from './types'

const program = makeProgram('ouvinte', {
  fading: { strategy: 'mais_para_menos', advanceAfter: 2 },
  errorCorrection: { strategy: 'reiniciar_com_dica', maxRepetitions: 2 },
})
const targets = ['bola', 'gato', 'casa'].map((label) => makeTarget(label, label, { exemplars: ['1', '2'] }))

function input(sessionTrials: Trial[] = []) {
  return { programs: [program], targets, allTrials: sessionTrials, sessionTrials, now: 0, random: seededRandom(2) }
}

describe('orquestrador de tentativas', () => {
  it('gera tentativa de ensino com opções de ouvinte', () => {
    const spec = nextTrialSpec(input())
    expect(spec?.type).toBe('ensino')
    expect(spec?.options).toHaveLength(3)
    expect(spec?.plan.promptLevelIndex).toBe(0)
  })

  it('gera correção após erro e para no limite de repetições', () => {
    const failed = makeTrial({ targetId: 'bola', operant: 'ouvinte', result: 'incorreta', promptLevelId: 'reducao' })
    const first = nextTrialSpec(input([failed]))
    expect(first).toMatchObject({ type: 'correcao', target: { id: 'bola' } })

    const corrections = [1, 2].map(() =>
      makeTrial({ targetId: 'bola', type: 'correcao', result: 'incorreta', promptLevelId: 'destaque' }),
    )
    const afterLimit = nextTrialSpec(input([failed, ...corrections]))
    expect(afterLimit?.type).not.toBe('correcao')
  })

  it('rotaciona exemplares', () => {
    const shown = makeTrial({ targetId: 'bola', exemplar: '1' })
    const spec = nextTrialSpec({ ...input(), allTrials: [shown], targets: [targets[0]] })
    expect(spec?.exemplar).toBe('2')
  })
})
