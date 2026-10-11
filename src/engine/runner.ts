import { deriveTargetStatus, type TargetStatus } from './mastery'
import { planCorrection, planProbeTrial, planTeachingTrial, type TrialPlan } from './prompts'
import type { Random } from './random'
import { buildListenerOptions, selectNext, type Candidate } from './selection'
import type { Program, Target, Trial, TrialType } from './types'

export interface TrialSpec {
  target: Target
  program: Program
  type: TrialType
  plan: TrialPlan
  options: string[]
  exemplar: string
}

export interface RunnerInput {
  programs: Program[]
  targets: Target[]
  allTrials: Trial[]
  sessionTrials: Trial[]
  now: number
  random: Random
}

export function statusMap(programs: Program[], targets: Target[], trials: Trial[], now: number): Map<string, TargetStatus> {
  const programById = new Map(programs.map((p) => [p.id, p]))
  const trialsByTarget = new Map<string, Trial[]>()
  for (const trial of trials) {
    const list = trialsByTarget.get(trial.targetId)
    if (list) list.push(trial)
    else trialsByTarget.set(trial.targetId, [trial])
  }
  const result = new Map<string, TargetStatus>()
  for (const target of targets) {
    const program = programById.get(target.programId)
    if (!program) continue
    result.set(target.id, deriveTargetStatus(program, target, trialsByTarget.get(target.id) ?? [], now))
  }
  return result
}

function pendingCorrection(input: RunnerInput): { trial: Trial; plan: TrialPlan; program: Program } | null {
  const trials = [...input.sessionTrials].sort((a, b) => a.timestamp - b.timestamp)
  const last = trials[trials.length - 1]
  if (!last || last.result === 'correta') return null
  if (last.type !== 'ensino' && last.type !== 'correcao') return null
  const program = input.programs.find((p) => p.id === last.programId)
  if (!program) return null
  let corrections = 0
  for (let index = trials.length - 1; index >= 0; index -= 1) {
    if (trials[index].type !== 'correcao' || trials[index].targetId !== last.targetId) break
    corrections += 1
  }
  const plan = planCorrection(program, last, corrections)
  return plan ? { trial: last, plan, program } : null
}

function exemplarFor(target: Target, allTrials: Trial[]): string {
  if (target.exemplars.length === 0) return ''
  const shown = allTrials.filter((trial) => trial.targetId === target.id).length
  return target.exemplars[shown % target.exemplars.length]
}

/** Define a próxima tentativa da sessão: correção pendente ou novo alvo escolhido pelas regras. */
export function nextTrialSpec(input: RunnerInput): TrialSpec | null {
  const { programs, targets, allTrials, random } = input
  const correction = pendingCorrection(input)
  let target: Target | undefined
  let program: Program | undefined
  let type: TrialType
  let plan: TrialPlan

  if (correction) {
    target = targets.find((t) => t.id === correction.trial.targetId)
    program = correction.program
    type = 'correcao'
    plan = correction.plan
    if (!target) return null
  } else {
    const statuses = statusMap(programs, targets, allTrials, input.now)
    const candidates: Candidate[] = targets
      .map((t) => ({ target: t, program: programs.find((p) => p.id === t.programId), status: statuses.get(t.id) }))
      .filter((c): c is Candidate => Boolean(c.program && c.status))
    const selection = selectNext(candidates, input.sessionTrials, random)
    if (!selection) return null
    target = selection.target
    program = selection.program
    type = selection.type
    const history = allTrials.filter((trial) => trial.targetId === target!.id)
    plan = type === 'ensino' ? planTeachingTrial(program, history) : planProbeTrial(program)
  }

  const options =
    program.operant === 'ouvinte'
      ? buildListenerOptions(
          target,
          targets.filter((t) => t.programId === program!.id),
          program.fieldSize,
          random,
        )
      : []
  return { target, program, type, plan, options, exemplar: exemplarFor(target, allTrials) }
}
