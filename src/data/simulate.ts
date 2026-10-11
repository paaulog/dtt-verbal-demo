import { DAY_MS } from '../engine/mastery'
import { planShowsPrompt, resolvePromptLevel } from '../engine/prompts'
import { seededRandom, type Random } from '../engine/random'
import { nextTrialSpec, type TrialSpec } from '../engine/runner'
import { combinedLimits } from '../engine/selection'
import type { AssentEvent, Program, Reinforcer, Session, Target, Trial, TrialResult } from '../engine/types'

/**
 * Gera um histórico fictício usando o próprio motor clínico, para que os gráficos da demo
 * reflitam exatamente as regras implementadas. A "habilidade" de cada alvo cresce com a prática.
 */

interface SimulationResult {
  sessions: Session[]
  trials: Trial[]
  assentEvents: AssentEvent[]
}

function hash(text: string): number {
  let value = 2166136261
  for (const char of text) value = Math.imul(value ^ char.charCodeAt(0), 16777619)
  return (value >>> 0) / 4294967296
}

/** Alvos com aprendizagem lenta, para a demo mostrar alerta de dependência de dica. */
const SLOW_TARGETS = new Set(['uva', 'escova os'])

function skillFor(target: Target, practiced: number): number {
  const slow = SLOW_TARGETS.has(target.label)
  const base = slow ? 0.02 : 0.15 + hash(target.label) * 0.35
  const rate = slow ? 0.003 : 0.05
  return Math.min(0.96, base + rate * practiced)
}

function simulateResponse(
  spec: TrialSpec,
  practiced: number,
  random: Random,
): { result: TrialResult; promptShown: boolean; latencyMs: number } {
  const skill = skillFor(spec.target, practiced)
  const latencyMs = Math.round(800 + random() * 3200)
  const showsPrompt = planShowsPrompt(spec.program, spec.plan)
  if (showsPrompt && spec.plan.delaySeconds === 0) {
    return { result: random() < 0.92 ? 'correta' : 'incorreta', promptShown: true, latencyMs }
  }
  if (!showsPrompt) {
    if (random() < skill) return { result: 'correta', promptShown: false, latencyMs }
    return { result: random() < 0.5 ? 'incorreta' : 'sem_resposta', promptShown: false, latencyMs }
  }
  if (random() < skill) return { result: 'correta', promptShown: false, latencyMs: Math.min(latencyMs, spec.plan.delaySeconds * 1000 - 200) }
  return {
    result: random() < 0.9 ? 'correta' : 'incorreta',
    promptShown: true,
    latencyMs: spec.plan.delaySeconds * 1000 + latencyMs,
  }
}

export function simulateHistory(
  programs: Program[],
  targets: Target[],
  reinforcers: Reinforcer[],
  now: number,
  sessionCount = 10,
  seed = 42,
): SimulationResult {
  const random = seededRandom(seed)
  const sessions: Session[] = []
  const trials: Trial[] = []
  const assentEvents: AssentEvent[] = []
  const limits = combinedLimits(programs)
  const topReinforcer = [...reinforcers].sort((a, b) => a.rank - b.rank)[0]?.name ?? 'Elogio'

  const today = new Date(now)
  today.setHours(14, 0, 0, 0)

  for (let index = 0; index < sessionCount; index += 1) {
    const startedAt = today.getTime() - (sessionCount - index) * 2 * DAY_MS
    const session: Session = {
      id: `sim-${index + 1}`,
      learnerId: programs[0].learnerId,
      programIds: programs.map((p) => p.id),
      startedAt,
      endedAt: null,
      conductedBy: index % 3 === 2 ? 'Psicóloga demo' : 'Aplicador demo',
      context: 'tela',
      ending: null,
    }
    const sessionTrials: Trial[] = []
    let clock = startedAt
    const withdrawalAt = index === 5 ? 12 : Infinity

    while (sessionTrials.length < limits.trialsPerSession) {
      if (sessionTrials.length >= withdrawalAt) {
        assentEvents.push({
          id: `sim-assent-${index}`,
          sessionId: session.id,
          kind: 'retirada_sinal',
          signal: 'Virou o rosto',
          timestamp: clock,
        })
        session.ending = 'retirada_assentimento'
        break
      }
      const spec = nextTrialSpec({
        programs,
        targets,
        allTrials: trials,
        sessionTrials,
        now: clock,
        random,
      })
      if (!spec) break
      const practiced = trials.filter((t) => t.targetId === spec.target.id).length
      const response = simulateResponse(spec, practiced, random)
      const level = resolvePromptLevel(spec.program, spec.plan, response.promptShown, response.result)
      clock += 3000 + Math.max(0, response.latencyMs)
      const trial: Trial = {
        id: `${session.id}-t${sessionTrials.length + 1}`,
        sessionId: session.id,
        targetId: spec.target.id,
        programId: spec.program.id,
        operant: spec.program.operant,
        type: spec.type,
        exemplar: spec.exemplar,
        options: spec.options,
        promptLevelId: level.promptLevelId,
        promptDelaySeconds: spec.plan.delaySeconds,
        latencyMs: response.latencyMs,
        result: response.result,
        independent: level.independent,
        correctionApplied: spec.type === 'correcao' ? spec.program.errorCorrection.strategy : null,
        reinforcer: response.result === 'correta' ? (level.independent ? topReinforcer : 'Elogio') : null,
        timestamp: clock,
      }
      sessionTrials.push(trial)
      trials.push(trial)
      clock += spec.program.itiSeconds * 1000
    }
    session.endedAt = clock
    session.ending ??= sessionTrials.length >= limits.trialsPerSession ? 'limite' : 'normal'
    sessions.push(session)
  }

  return { sessions, trials, assentEvents }
}
