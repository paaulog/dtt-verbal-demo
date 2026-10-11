import type { Operant, Program, PromptLevel } from './types'

/**
 * Valores-padrão provisórios da demo. Todos estão pendentes de validação clínica
 * pela responsável técnica (PRD, seção 5.3).
 */

export const VOCAL_HIERARCHY: PromptLevel[] = [
  { id: 'eco_total', name: 'Modelo ecoico total', type: 'audio_total', executedBy: 'software' },
  { id: 'eco_parcial', name: 'Modelo ecoico parcial', type: 'audio_parcial', executedBy: 'software' },
  { id: 'figura', name: 'Dica visual (figura ou palavra)', type: 'figura', executedBy: 'software' },
  { id: 'indep', name: 'Independente', type: 'independente', executedBy: 'software' },
]

export const LISTENER_HIERARCHY: PromptLevel[] = [
  { id: 'destaque', name: 'Destaque visual', type: 'destaque', executedBy: 'software' },
  { id: 'reducao', name: 'Redução de campo', type: 'reducao_campo', executedBy: 'software' },
  { id: 'gestual', name: 'Gestual (adulto aponta)', type: 'gestual', executedBy: 'adulto' },
  { id: 'indep', name: 'Independente', type: 'independente', executedBy: 'software' },
]

export const PROMPT_TYPE_LABELS: Record<PromptLevel['type'], string> = {
  audio_total: 'Áudio: modelo total',
  audio_parcial: 'Áudio: modelo parcial',
  figura: 'Figura de apoio',
  destaque: 'Destaque da resposta',
  reducao_campo: 'Redução de campo',
  gestual: 'Gestual (adulto)',
  fisica: 'Física (adulto)',
  independente: 'Independente',
}

export const DEFAULT_ASSENT_SIGNALS = [
  'Saiu da mesa',
  'Empurrou o tablet',
  'Virou o rosto',
  'Chorou',
  'Disse "não"',
]

export function defaultProgram(
  id: string,
  learnerId: string,
  name: string,
  operant: Operant,
): Program {
  const hierarchy = operant === 'ouvinte' ? LISTENER_HIERARCHY : VOCAL_HIERARCHY
  return {
    id,
    learnerId,
    name,
    operant,
    promptHierarchy: hierarchy.map((level) => ({ ...level })),
    countsAsCorrect: ['indep'],
    fading:
      operant === 'intraverbal' || operant === 'tato'
        ? { strategy: 'atraso_constante', zeroDelayTrials: 4, delaySeconds: 4 }
        : { strategy: 'mais_para_menos', advanceAfter: 2 },
    latencySeconds: 5,
    itiSeconds: 2,
    errorCorrection: { strategy: 'reiniciar_com_dica', maxRepetitions: 2 },
    mastery: { percent: 90, consecutiveSessions: 2, basis: 'primeira' },
    maintenanceDays: [7, 14, 28],
    limits: { trialsPerSession: 30, minutesPerSession: 10 },
    interleaveEvery: 3,
    fieldSize: 3,
    dependencyAlertSessions: 4,
  }
}

export const DISENGAGEMENT_NO_RESPONSE_STREAK = 3
