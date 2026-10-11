import type { PromptLevel, Program, Trial, TrialResult } from './types'

export interface TrialPlan {
  /** Índice na hierarquia (0 = mais intrusivo). */
  promptLevelIndex: number
  /** Segundos entre a apresentação do SD e a dica. 0 = dica junto com o SD. */
  delaySeconds: number
}

function independentIndex(program: Program): number {
  return program.promptHierarchy.length - 1
}

function teachingTrials(history: Trial[]): Trial[] {
  return history.filter((trial) => trial.type === 'ensino')
}

function levelIndexOf(program: Program, levelId: string): number {
  const index = program.promptHierarchy.findIndex((level) => level.id === levelId)
  return index === -1 ? independentIndex(program) : index
}

export function isDelayStrategy(program: Program): boolean {
  return program.fading.strategy === 'atraso_constante' || program.fading.strategy === 'atraso_progressivo'
}

/**
 * Do mais para o menos intrusivo: começa no nível 0, desce um nível (menos ajuda) após
 * N acertos seguidos no nível atual e sobe um nível (mais ajuda) após erro.
 * O nível é reconstruído a partir do histórico, sem estado escondido.
 */
export function mostToLeastLevel(program: Program, history: Trial[]): number {
  if (program.fading.strategy !== 'mais_para_menos') {
    throw new Error('mostToLeastLevel exige estratégia mais_para_menos')
  }
  const advanceAfter = Math.max(1, program.fading.advanceAfter)
  const lastIndex = independentIndex(program)
  let level = 0
  let streak = 0
  for (const trial of teachingTrials(history)) {
    if (trial.result === 'correta') {
      streak += 1
      if (streak >= advanceAfter && level < lastIndex) {
        level += 1
        streak = 0
      }
    } else {
      level = Math.max(0, level - 1)
      streak = 0
    }
  }
  return level
}

/** Atraso progressivo: avança um passo após acerto e recua um passo após erro. */
export function progressiveDelayStep(program: Program, history: Trial[]): number {
  if (program.fading.strategy !== 'atraso_progressivo') {
    throw new Error('progressiveDelayStep exige estratégia atraso_progressivo')
  }
  const lastStep = Math.max(0, program.fading.steps.length - 1)
  let step = 0
  for (const trial of teachingTrials(history)) {
    step = trial.result === 'correta' ? Math.min(lastStep, step + 1) : Math.max(0, step - 1)
  }
  return step
}

/** Plano da próxima tentativa de ensino de um alvo, a partir do histórico desse alvo. */
export function planTeachingTrial(program: Program, history: Trial[]): TrialPlan {
  const fading = program.fading
  switch (fading.strategy) {
    case 'mais_para_menos':
      return { promptLevelIndex: mostToLeastLevel(program, history), delaySeconds: 0 }
    case 'menos_para_mais':
      return { promptLevelIndex: independentIndex(program), delaySeconds: 0 }
    case 'atraso_constante': {
      const taught = teachingTrials(history).length
      return {
        promptLevelIndex: 0,
        delaySeconds: taught < fading.zeroDelayTrials ? 0 : fading.delaySeconds,
      }
    }
    case 'atraso_progressivo': {
      const step = progressiveDelayStep(program, history)
      return { promptLevelIndex: 0, delaySeconds: fading.steps[step] ?? 0 }
    }
  }
}

/** Sondas (intercaladas e de manutenção) são sempre sem dica. */
export function planProbeTrial(program: Program): TrialPlan {
  return { promptLevelIndex: independentIndex(program), delaySeconds: 0 }
}

/**
 * Plano da tentativa de correção após erro ou sem resposta. Retorna null quando a estratégia
 * é seguir em frente ou quando o limite de repetições já foi atingido.
 */
export function planCorrection(
  program: Program,
  failedTrial: Trial,
  correctionsSoFar: number,
): TrialPlan | null {
  const { strategy, maxRepetitions } = program.errorCorrection
  if (strategy === 'seguir_menos_ajuda') return null
  if (correctionsSoFar >= maxRepetitions) return null
  if (strategy === 'dica_e_registro' || isDelayStrategy(program)) {
    return { promptLevelIndex: 0, delaySeconds: 0 }
  }
  const used = levelIndexOf(program, failedTrial.promptLevelId)
  return { promptLevelIndex: Math.max(0, used - 1), delaySeconds: 0 }
}

export function promptLevelAt(program: Program, index: number): PromptLevel {
  const levels = program.promptHierarchy
  return levels[Math.min(Math.max(index, 0), levels.length - 1)]
}

export function planShowsPrompt(program: Program, plan: TrialPlan): boolean {
  return promptLevelAt(program, plan.promptLevelIndex).type !== 'independente'
}

/**
 * Nível de dica efetivamente usado. Se a criança respondeu antes de a dica aparecer
 * (estratégias de atraso), a resposta conta no nível independente.
 */
export function resolvePromptLevel(
  program: Program,
  plan: TrialPlan,
  promptWasShown: boolean,
  result: TrialResult,
): { promptLevelId: string; independent: boolean } {
  const independentLevel = promptLevelAt(program, independentIndex(program))
  if (!promptWasShown || !planShowsPrompt(program, plan)) {
    return { promptLevelId: independentLevel.id, independent: result === 'correta' }
  }
  return { promptLevelId: promptLevelAt(program, plan.promptLevelIndex).id, independent: false }
}
