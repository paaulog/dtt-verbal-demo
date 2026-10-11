import type { TargetStatus } from './mastery'
import { pick, shuffle, type Random } from './random'
import { initialSound } from './text'
import type { Program, SessionLimits, Target, Trial, TrialType } from './types'
import { DISENGAGEMENT_NO_RESPONSE_STREAK } from './defaults'

export interface Candidate {
  target: Target
  program: Program
  status: TargetStatus
}

export interface Selection {
  target: Target
  program: Program
  type: Exclude<TrialType, 'correcao'>
}

const MASTERED = new Set(['dominado', 'manutencao', 'generalizado'])

function presentations(trials: Trial[], targetId: string): number {
  return trials.filter((trial) => trial.targetId === targetId).length
}

function leastPresented(candidates: Candidate[], trials: Trial[], random: Random): Candidate {
  const counts = candidates.map((candidate) => presentations(trials, candidate.target.id))
  const min = Math.min(...counts)
  return pick(
    candidates.filter((_, index) => counts[index] === min),
    random,
  )
}

/**
 * Escolhe o próximo alvo da sessão (PRD, seção 8, regra 1):
 * 1. sonda de manutenção vencida e ainda não feita na sessão;
 * 2. a cada N tentativas de aquisição, uma intercalada de alvo dominado;
 * 3. alvo em aquisição menos apresentado, sem repetir o mesmo alvo mais de 2 vezes seguidas
 *    e evitando o mesmo som inicial da tentativa anterior quando houver alternativa.
 */
export function selectNext(candidates: Candidate[], sessionTrials: Trial[], random: Random): Selection | null {
  const trials = [...sessionTrials].sort((a, b) => a.timestamp - b.timestamp)
  const probedThisSession = new Set(trials.filter((t) => t.type === 'manutencao').map((t) => t.targetId))
  const due = candidates.find((c) => c.status.probeDue && !probedThisSession.has(c.target.id))
  if (due) return { target: due.target, program: due.program, type: 'manutencao' }

  const acquisition = candidates.filter((c) => c.status.state === 'aquisicao')
  const mastered = candidates.filter((c) => MASTERED.has(c.status.state))

  if (acquisition.length === 0) {
    if (mastered.length === 0) return null
    const chosen = leastPresented(mastered, trials, random)
    return { target: chosen.target, program: chosen.program, type: 'intercalada' }
  }

  let sinceInterleave = 0
  for (let index = trials.length - 1; index >= 0; index -= 1) {
    if (trials[index].type === 'intercalada') break
    if (trials[index].type === 'ensino') sinceInterleave += 1
  }
  const lastTeaching = [...trials].reverse().find((t) => t.type === 'ensino')
  const interleaveEvery =
    candidates.find((c) => c.target.id === lastTeaching?.targetId)?.program.interleaveEvery ??
    acquisition[0].program.interleaveEvery
  if (mastered.length > 0 && interleaveEvery > 0 && sinceInterleave >= interleaveEvery) {
    const chosen = leastPresented(mastered, trials, random)
    return { target: chosen.target, program: chosen.program, type: 'intercalada' }
  }

  const last = trials[trials.length - 1]
  const beforeLast = trials[trials.length - 2]
  let pool = acquisition
  if (last && beforeLast && last.targetId === beforeLast.targetId && acquisition.length > 1) {
    pool = pool.filter((c) => c.target.id !== last.targetId)
  }
  if (last && pool.length > 1) {
    const lastLabel = candidates.find((c) => c.target.id === last.targetId)?.target.label
    if (lastLabel) {
      const sound = initialSound(lastLabel)
      const different = pool.filter((c) => initialSound(c.target.label) !== sound)
      if (different.length > 0) pool = different
    }
  }
  const chosen = leastPresented(pool, trials, random)
  return { target: chosen.target, program: chosen.program, type: 'ensino' }
}

/** Opções de uma tentativa de ouvinte: o alvo mais distratores do mesmo programa, em posições sorteadas. */
export function buildListenerOptions(
  target: Target,
  programTargets: Target[],
  fieldSize: number,
  random: Random,
): string[] {
  const distractors = shuffle(
    programTargets.filter((t) => t.id !== target.id && t.label !== target.label),
    random,
  ).slice(0, Math.max(0, fieldSize - 1))
  return shuffle([target.id, ...distractors.map((t) => t.id)], random)
}

/** Redução de campo: mantém o alvo e um distrator. */
export function reduceField(options: string[], targetId: string): string[] {
  const distractor = options.find((id) => id !== targetId)
  return options.filter((id) => id === targetId || id === distractor)
}

export function combinedLimits(programs: Program[]): SessionLimits {
  return {
    trialsPerSession: Math.min(...programs.map((p) => p.limits.trialsPerSession)),
    minutesPerSession: Math.min(...programs.map((p) => p.limits.minutesPerSession)),
  }
}

export function limitReached(
  limits: SessionLimits,
  trialCount: number,
  startedAt: number,
  now: number,
): 'tentativas' | 'minutos' | null {
  if (trialCount >= limits.trialsPerSession) return 'tentativas'
  if (now - startedAt >= limits.minutesPerSession * 60_000) return 'minutos'
  return null
}

/** Desengajamento: N tentativas seguidas sem resposta. Gera só sugestão de pausa. */
export function isDisengaged(sessionTrials: Trial[], streak = DISENGAGEMENT_NO_RESPONSE_STREAK): boolean {
  if (sessionTrials.length < streak) return false
  return [...sessionTrials]
    .sort((a, b) => a.timestamp - b.timestamp)
    .slice(-streak)
    .every((trial) => trial.result === 'sem_resposta')
}
