import { describe, expect, it } from 'vitest'
import { makeProgram, makeTrial } from './fixtures'
import {
  mostToLeastLevel,
  planCorrection,
  planProbeTrial,
  planTeachingTrial,
  progressiveDelayStep,
  resolvePromptLevel,
} from './prompts'

const mtl = makeProgram('ecoico', { fading: { strategy: 'mais_para_menos', advanceAfter: 2 } })

describe('do mais para o menos intrusivo', () => {
  it('começa no nível mais intrusivo', () => {
    expect(mostToLeastLevel(mtl, [])).toBe(0)
  })

  it('desce um nível após 2 acertos seguidos', () => {
    const history = [makeTrial(), makeTrial()]
    expect(mostToLeastLevel(mtl, history)).toBe(1)
  })

  it('sobe um nível após erro e zera a sequência', () => {
    const history = [makeTrial(), makeTrial(), makeTrial({ result: 'incorreta' }), makeTrial()]
    expect(mostToLeastLevel(mtl, history)).toBe(0)
  })

  it('não passa do nível independente', () => {
    const history = Array.from({ length: 20 }, () => makeTrial())
    expect(mostToLeastLevel(mtl, history)).toBe(mtl.promptHierarchy.length - 1)
  })

  it('ignora tentativas de correção e sondas', () => {
    const history = [makeTrial({ type: 'correcao' }), makeTrial({ type: 'intercalada' }), makeTrial()]
    expect(mostToLeastLevel(mtl, history)).toBe(0)
  })
})

describe('atraso constante', () => {
  const program = makeProgram('tato', {
    fading: { strategy: 'atraso_constante', zeroDelayTrials: 2, delaySeconds: 4 },
  })

  it('usa atraso 0 nas primeiras K tentativas e depois X segundos', () => {
    expect(planTeachingTrial(program, [])).toEqual({ promptLevelIndex: 0, delaySeconds: 0 })
    expect(planTeachingTrial(program, [makeTrial()])).toEqual({ promptLevelIndex: 0, delaySeconds: 0 })
    expect(planTeachingTrial(program, [makeTrial(), makeTrial()])).toEqual({
      promptLevelIndex: 0,
      delaySeconds: 4,
    })
  })
})

describe('atraso progressivo', () => {
  const program = makeProgram('tato', { fading: { strategy: 'atraso_progressivo', steps: [0, 1, 2, 3] } })

  it('avança um passo por acerto e recua por erro', () => {
    const history = [makeTrial(), makeTrial(), makeTrial({ result: 'sem_resposta' })]
    expect(progressiveDelayStep(program, history)).toBe(1)
    expect(planTeachingTrial(program, history).delaySeconds).toBe(1)
  })

  it('não passa do último passo', () => {
    const history = Array.from({ length: 10 }, () => makeTrial())
    expect(planTeachingTrial(program, history).delaySeconds).toBe(3)
  })
})

describe('do menos para o mais intrusivo', () => {
  it('apresenta a tentativa de ensino sem dica', () => {
    const program = makeProgram('ecoico', { fading: { strategy: 'menos_para_mais' } })
    expect(planTeachingTrial(program, [])).toEqual({
      promptLevelIndex: program.promptHierarchy.length - 1,
      delaySeconds: 0,
    })
  })
})

describe('correção de erro', () => {
  it('reinicia com um nível mais intrusivo e respeita o limite de repetições', () => {
    const program = makeProgram('ecoico', {
      fading: { strategy: 'mais_para_menos', advanceAfter: 2 },
      errorCorrection: { strategy: 'reiniciar_com_dica', maxRepetitions: 2 },
    })
    const failed = makeTrial({ promptLevelId: 'figura', result: 'incorreta' })
    expect(planCorrection(program, failed, 0)).toEqual({ promptLevelIndex: 1, delaySeconds: 0 })
    expect(planCorrection(program, failed, 2)).toBeNull()
  })

  it('dica e registro usa a dica mais intrusiva', () => {
    const program = makeProgram('ecoico', {
      errorCorrection: { strategy: 'dica_e_registro', maxRepetitions: 1 },
    })
    expect(planCorrection(program, makeTrial({ result: 'incorreta' }), 0)).toEqual({
      promptLevelIndex: 0,
      delaySeconds: 0,
    })
  })

  it('seguir com menos ajuda não gera repetição', () => {
    const program = makeProgram('ecoico', {
      errorCorrection: { strategy: 'seguir_menos_ajuda', maxRepetitions: 2 },
    })
    expect(planCorrection(program, makeTrial({ result: 'incorreta' }), 0)).toBeNull()
  })

  it('em estratégias de atraso, corrige com dica controladora em 0 s', () => {
    const program = makeProgram('tato', {
      fading: { strategy: 'atraso_constante', zeroDelayTrials: 0, delaySeconds: 4 },
    })
    expect(planCorrection(program, makeTrial({ result: 'sem_resposta' }), 0)).toEqual({
      promptLevelIndex: 0,
      delaySeconds: 0,
    })
  })
})

describe('nível efetivamente usado', () => {
  const program = makeProgram('tato')

  it('resposta antes da dica conta como independente', () => {
    const result = resolvePromptLevel(program, { promptLevelIndex: 0, delaySeconds: 4 }, false, 'correta')
    expect(result).toEqual({ promptLevelId: 'indep', independent: true })
  })

  it('resposta depois da dica registra o nível da dica', () => {
    const result = resolvePromptLevel(program, { promptLevelIndex: 0, delaySeconds: 4 }, true, 'correta')
    expect(result).toEqual({ promptLevelId: 'eco_total', independent: false })
  })

  it('sonda nunca mostra dica', () => {
    const plan = planProbeTrial(program)
    expect(resolvePromptLevel(program, plan, true, 'incorreta')).toEqual({
      promptLevelId: 'indep',
      independent: false,
    })
  })
})
