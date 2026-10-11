import { describe, expect, it } from 'vitest'
import { makeProgram, makeTarget, makeTrial } from './fixtures'
import type { TargetStatus } from './mastery'
import { seededRandom } from './random'
import {
  buildListenerOptions,
  combinedLimits,
  isDisengaged,
  limitReached,
  reduceField,
  selectNext,
  type Candidate,
} from './selection'
import type { TargetState } from './types'

const program = makeProgram('tato', { interleaveEvery: 3 })

function status(state: TargetState, probeDue = false): TargetStatus {
  return { state, masteredAt: null, probesPassed: 0, nextProbeAt: null, probeDue, history: [], scores: [] }
}

function candidate(id: string, label: string, state: TargetState, probeDue = false): Candidate {
  return { target: makeTarget(id, label), program, status: status(state, probeDue) }
}

describe('seleção do próximo alvo', () => {
  it('prioriza sonda de manutenção vencida', () => {
    const candidates = [candidate('a', 'bola', 'aquisicao'), candidate('b', 'gato', 'dominado', true)]
    expect(selectNext(candidates, [], seededRandom(1))).toMatchObject({ type: 'manutencao' })
  })

  it('não repete a sonda já feita na sessão', () => {
    const candidates = [candidate('a', 'bola', 'aquisicao'), candidate('b', 'gato', 'dominado', true)]
    const trials = [makeTrial({ targetId: 'b', type: 'manutencao' })]
    expect(selectNext(candidates, trials, seededRandom(1))).toMatchObject({ type: 'ensino' })
  })

  it('intercala um alvo dominado a cada N tentativas de aquisição', () => {
    const candidates = [candidate('a', 'bola', 'aquisicao'), candidate('b', 'gato', 'dominado')]
    const trials = [1, 2, 3].map(() => makeTrial({ targetId: 'a', type: 'ensino' }))
    expect(selectNext(candidates, trials, seededRandom(1))).toMatchObject({
      type: 'intercalada',
      target: { id: 'b' },
    })
  })

  it('não repete o mesmo alvo mais de 2 vezes seguidas', () => {
    const candidates = [candidate('a', 'bola', 'aquisicao'), candidate('b', 'bala', 'aquisicao')]
    const trials = [makeTrial({ targetId: 'a' }), makeTrial({ targetId: 'a' })]
    for (let seed = 0; seed < 20; seed += 1) {
      expect(selectNext(candidates, trials, seededRandom(seed))?.target.id).toBe('b')
    }
  })

  it('evita o mesmo som inicial quando há alternativa', () => {
    const candidates = [
      candidate('a', 'casa', 'aquisicao'),
      candidate('b', 'queijo', 'aquisicao'),
      candidate('c', 'sapo', 'aquisicao'),
    ]
    const trials = [makeTrial({ targetId: 'a' })]
    for (let seed = 0; seed < 20; seed += 1) {
      expect(selectNext(candidates, trials, seededRandom(seed))?.target.id).toBe('c')
    }
  })

  it('escolhe o alvo menos apresentado', () => {
    const candidates = [candidate('a', 'bola', 'aquisicao'), candidate('b', 'gato', 'aquisicao')]
    const trials = [makeTrial({ targetId: 'a' }), makeTrial({ targetId: 'b' }), makeTrial({ targetId: 'a' })]
    expect(selectNext(candidates, trials, seededRandom(3))?.target.id).toBe('b')
  })

  it('retorna null sem alvos disponíveis', () => {
    expect(selectNext([candidate('a', 'bola', 'linha_de_base')], [], seededRandom(1))).toBeNull()
  })
})

describe('opções de ouvinte', () => {
  const targets = ['bola', 'gato', 'casa', 'pato'].map((label) => makeTarget(label, label))

  it('inclui o alvo e o número pedido de figuras, sem repetir', () => {
    const options = buildListenerOptions(targets[0], targets, 3, seededRandom(5))
    expect(options).toHaveLength(3)
    expect(options).toContain('bola')
    expect(new Set(options).size).toBe(3)
  })

  it('sorteia posições diferentes entre tentativas', () => {
    const positions = new Set(
      Array.from({ length: 30 }, (_, seed) => buildListenerOptions(targets[0], targets, 3, seededRandom(seed)).indexOf('bola')),
    )
    expect(positions.size).toBe(3)
  })

  it('redução de campo mantém alvo e um distrator', () => {
    expect(reduceField(['gato', 'bola', 'casa'], 'bola')).toEqual(['gato', 'bola'])
  })
})

describe('limites e desengajamento', () => {
  it('usa o menor limite entre os programas', () => {
    const other = makeProgram('ouvinte', { limits: { trialsPerSession: 20, minutesPerSession: 15 } })
    expect(combinedLimits([program, other])).toEqual({ trialsPerSession: 20, minutesPerSession: 10 })
  })

  it('encerra por tentativas ou minutos', () => {
    const limits = { trialsPerSession: 30, minutesPerSession: 10 }
    expect(limitReached(limits, 30, 0, 1000)).toBe('tentativas')
    expect(limitReached(limits, 5, 0, 10 * 60_000)).toBe('minutos')
    expect(limitReached(limits, 5, 0, 1000)).toBeNull()
  })

  it('detecta 3 tentativas seguidas sem resposta', () => {
    const trials = [makeTrial(), ...[1, 2, 3].map(() => makeTrial({ result: 'sem_resposta' }))]
    expect(isDisengaged(trials)).toBe(true)
    expect(isDisengaged(trials.slice(0, 3))).toBe(false)
  })
})
