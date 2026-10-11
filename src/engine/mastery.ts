import type { Program, Target, TargetState, Trial } from './types'

export const DAY_MS = 24 * 60 * 60 * 1000

export interface SessionScore {
  sessionId: string
  at: number
  percent: number
  trials: number
}

export interface StateChange {
  state: TargetState
  at: number
  reason: string
}

export interface TargetStatus {
  state: TargetState
  masteredAt: number | null
  probesPassed: number
  nextProbeAt: number | null
  probeDue: boolean
  history: StateChange[]
  scores: SessionScore[]
}

function byTime(a: Trial, b: Trial): number {
  return a.timestamp - b.timestamp
}

/** Agrupa tentativas por sessão, em ordem cronológica de sessão. */
export function groupBySession(trials: Trial[]): Trial[][] {
  const groups = new Map<string, Trial[]>()
  for (const trial of [...trials].sort(byTime)) {
    const group = groups.get(trial.sessionId)
    if (group) group.push(trial)
    else groups.set(trial.sessionId, [trial])
  }
  return [...groups.values()].sort((a, b) => a[0].timestamp - b[0].timestamp)
}

export function countsAsCorrect(program: Program, trial: Trial): boolean {
  return trial.result === 'correta' && program.countsAsCorrect.includes(trial.promptLevelId)
}

/**
 * Percentual de acerto de um alvo numa sessão, sobre a base do critério.
 * Só tentativas de ensino entram. Retorna null se não houve tentativa de ensino.
 */
export function sessionScore(program: Program, sessionTrials: Trial[]): number | null {
  const teaching = sessionTrials.filter((trial) => trial.type === 'ensino').sort(byTime)
  if (teaching.length === 0) return null
  const basis = program.mastery.basis === 'primeira' ? teaching.slice(0, 1) : teaching
  const correct = basis.filter((trial) => countsAsCorrect(program, trial)).length
  return Math.round((correct / basis.length) * 1000) / 10
}

/**
 * Deriva o estado do alvo reproduzindo todo o histórico. Mudar o critério de domínio
 * e recalcular altera o estado, o que permite à responsável técnica testar critérios.
 */
export function deriveTargetStatus(
  program: Program,
  target: Target,
  targetTrials: Trial[],
  now: number,
): TargetStatus {
  const sessions = groupBySession(targetTrials.filter((trial) => trial.targetId === target.id))
  const firstAt = sessions[0]?.[0]?.timestamp ?? target.createdAt
  const history: StateChange[] = [{ state: 'aquisicao', at: firstAt, reason: 'Início do ensino' }]
  const scores: SessionScore[] = []
  let state: TargetState = 'aquisicao'
  let consecutive = 0
  let masteredAt: number | null = null
  let probesPassed = 0

  for (const trials of sessions) {
    const sessionEnd = trials[trials.length - 1].timestamp
    const score = sessionScore(program, trials)
    if (score !== null) {
      scores.push({
        sessionId: trials[0].sessionId,
        at: trials[0].timestamp,
        percent: score,
        trials: trials.filter((trial) => trial.type === 'ensino').length,
      })
    }

    if (state === 'aquisicao') {
      if (score === null) continue
      consecutive = score >= program.mastery.percent ? consecutive + 1 : 0
      if (consecutive >= program.mastery.consecutiveSessions) {
        state = 'dominado'
        masteredAt = sessionEnd
        probesPassed = 0
        history.push({
          state,
          at: sessionEnd,
          reason: `${program.mastery.percent}% em ${program.mastery.consecutiveSessions} sessões consecutivas`,
        })
      }
      continue
    }

    for (const probe of trials.filter((trial) => trial.type === 'manutencao')) {
      if (countsAsCorrect(program, probe)) {
        probesPassed += 1
        if (state === 'dominado') {
          state = 'manutencao'
          history.push({ state, at: probe.timestamp, reason: 'Passou na primeira sonda de manutenção' })
        }
      } else {
        state = 'aquisicao'
        consecutive = 0
        masteredAt = null
        probesPassed = 0
        history.push({ state, at: probe.timestamp, reason: 'Falhou na sonda de manutenção' })
        break
      }
    }
  }

  let nextProbeAt: number | null = null
  if (masteredAt !== null && probesPassed < program.maintenanceDays.length) {
    nextProbeAt = masteredAt + program.maintenanceDays[probesPassed] * DAY_MS
  }
  const probeDue = nextProbeAt !== null && now >= nextProbeAt

  if (target.manualState === 'linha_de_base') {
    return { state: 'linha_de_base', masteredAt: null, probesPassed: 0, nextProbeAt: null, probeDue: false, history: [], scores }
  }
  if (target.manualState === 'generalizado') {
    return { state: 'generalizado', masteredAt, probesPassed, nextProbeAt: null, probeDue: false, history, scores }
  }
  return { state, masteredAt, probesPassed, nextProbeAt, probeDue, history, scores }
}

/**
 * Alerta de dependência de dica: o nível de dica mais usado foi o mesmo, e não independente,
 * nas últimas K sessões. Retorna o id do nível ou null. Não altera nada.
 */
export function promptDependencyLevel(program: Program, targetTrials: Trial[]): string | null {
  const k = program.dependencyAlertSessions
  const sessions = groupBySession(targetTrials.filter((trial) => trial.type === 'ensino'))
  if (k <= 0 || sessions.length < k) return null
  const independentId = program.promptHierarchy[program.promptHierarchy.length - 1].id
  const modes = sessions.slice(-k).map((trials) => {
    const counts = new Map<string, number>()
    for (const trial of trials) counts.set(trial.promptLevelId, (counts.get(trial.promptLevelId) ?? 0) + 1)
    return [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0]
  })
  const first = modes[0]
  if (first === independentId) return null
  return modes.every((mode) => mode === first) ? first : null
}
