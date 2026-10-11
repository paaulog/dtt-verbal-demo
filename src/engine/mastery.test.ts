import { describe, expect, it } from 'vitest'
import { makeProgram, makeTarget, makeTrial } from './fixtures'
import { DAY_MS, deriveTargetStatus, promptDependencyLevel, sessionScore } from './mastery'
import type { Trial } from './types'

const target = makeTarget('a', 'bola')

function session(id: string, start: number, results: Array<Partial<Trial>>): Trial[] {
  return results.map((overrides, index) =>
    makeTrial({ sessionId: id, targetId: 'a', timestamp: start + index * 1000, ...overrides }),
  )
}

const ok: Partial<Trial> = { result: 'correta', promptLevelId: 'indep' }
const prompted: Partial<Trial> = { result: 'correta', promptLevelId: 'eco_total', independent: false }
const wrong: Partial<Trial> = { result: 'incorreta', independent: false }

describe('pontuação da sessão', () => {
  it('base primeira tentativa considera só a primeira tentativa de ensino', () => {
    const program = makeProgram('tato', { mastery: { percent: 90, consecutiveSessions: 2, basis: 'primeira' } })
    expect(sessionScore(program, session('s', 0, [wrong, ok, ok]))).toBe(0)
    expect(sessionScore(program, session('s', 0, [ok, wrong, wrong]))).toBe(100)
  })

  it('base todas as tentativas calcula o percentual', () => {
    const program = makeProgram('tato', { mastery: { percent: 90, consecutiveSessions: 2, basis: 'todas' } })
    expect(sessionScore(program, session('s', 0, [ok, wrong, ok, prompted]))).toBe(50)
  })

  it('resposta com dica só conta se o nível estiver marcado como acerto', () => {
    const program = makeProgram('tato', {
      mastery: { percent: 90, consecutiveSessions: 2, basis: 'todas' },
      countsAsCorrect: ['indep', 'eco_total'],
    })
    expect(sessionScore(program, session('s', 0, [prompted, ok]))).toBe(100)
  })

  it('sem tentativa de ensino retorna null', () => {
    const program = makeProgram()
    expect(sessionScore(program, session('s', 0, [{ type: 'intercalada' }]))).toBeNull()
  })
})

describe('estado derivado do alvo', () => {
  const program = makeProgram('tato', {
    mastery: { percent: 90, consecutiveSessions: 2, basis: 'todas' },
    maintenanceDays: [7, 14],
  })

  it('fica em aquisição até atingir o critério em sessões consecutivas', () => {
    const trials = [...session('s1', 0, [ok, ok]), ...session('s2', DAY_MS, [ok, wrong])]
    expect(deriveTargetStatus(program, target, trials, 2 * DAY_MS).state).toBe('aquisicao')
  })

  it('passa a dominado após o critério', () => {
    const trials = [...session('s1', 0, [ok, ok]), ...session('s2', DAY_MS, [ok, ok])]
    const status = deriveTargetStatus(program, target, trials, 2 * DAY_MS)
    expect(status.state).toBe('dominado')
    expect(status.history.map((change) => change.state)).toEqual(['aquisicao', 'dominado'])
    expect(status.probeDue).toBe(false)
  })

  it('agenda a sonda de manutenção e a marca como vencida no prazo', () => {
    const trials = [...session('s1', 0, [ok, ok]), ...session('s2', DAY_MS, [ok, ok])]
    const status = deriveTargetStatus(program, target, trials, DAY_MS + 8 * DAY_MS)
    expect(status.probeDue).toBe(true)
  })

  it('passa a manutenção após a primeira sonda correta', () => {
    const trials = [
      ...session('s1', 0, [ok, ok]),
      ...session('s2', DAY_MS, [ok, ok]),
      ...session('s3', 9 * DAY_MS, [{ ...ok, type: 'manutencao' }]),
    ]
    const status = deriveTargetStatus(program, target, trials, 10 * DAY_MS)
    expect(status.state).toBe('manutencao')
    expect(status.probesPassed).toBe(1)
  })

  it('volta para aquisição se falhar na sonda', () => {
    const trials = [
      ...session('s1', 0, [ok, ok]),
      ...session('s2', DAY_MS, [ok, ok]),
      ...session('s3', 9 * DAY_MS, [{ ...wrong, type: 'manutencao' }]),
    ]
    const status = deriveTargetStatus(program, target, trials, 10 * DAY_MS)
    expect(status.state).toBe('aquisicao')
    expect(status.history.at(-1)?.reason).toMatch(/sonda/)
  })

  it('mudar o critério recalcula o estado', () => {
    const trials = [...session('s1', 0, [ok, ok, ok, ok, wrong]), ...session('s2', DAY_MS, [ok, ok, ok, ok, wrong])]
    expect(deriveTargetStatus(program, target, trials, 2 * DAY_MS).state).toBe('aquisicao')
    const lenient = { ...program, mastery: { ...program.mastery, percent: 80 } }
    expect(deriveTargetStatus(lenient, target, trials, 2 * DAY_MS).state).toBe('dominado')
  })

  it('respeita estados manuais', () => {
    const trials = [...session('s1', 0, [ok, ok]), ...session('s2', DAY_MS, [ok, ok])]
    expect(deriveTargetStatus(program, { ...target, manualState: 'linha_de_base' }, trials, 0).state).toBe(
      'linha_de_base',
    )
    expect(deriveTargetStatus(program, { ...target, manualState: 'generalizado' }, trials, 0).state).toBe(
      'generalizado',
    )
  })
})

describe('alerta de dependência de dica', () => {
  const program = makeProgram('tato', { dependencyAlertSessions: 3 })

  it('alerta quando o mesmo nível com dica domina as últimas K sessões', () => {
    const trials = ['s1', 's2', 's3'].flatMap((id, index) => session(id, index * DAY_MS, [prompted, prompted]))
    expect(promptDependencyLevel(program, trials)).toBe('eco_total')
  })

  it('não alerta com menos de K sessões ou quando o nível é independente', () => {
    expect(promptDependencyLevel(program, session('s1', 0, [prompted]))).toBeNull()
    const trials = ['s1', 's2', 's3'].flatMap((id, index) => session(id, index * DAY_MS, [ok]))
    expect(promptDependencyLevel(program, trials)).toBeNull()
  })
})
