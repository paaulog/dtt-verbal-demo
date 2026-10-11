import type { Program } from './types'

/** Regras mínimas para um programa poder ser salvo. Retorna mensagens em português. */
export function validateProgram(program: Program): string[] {
  const errors: string[] = []
  const levels = program.promptHierarchy
  if (levels.length < 2) errors.push('A hierarquia precisa de pelo menos 2 níveis.')
  if (levels.length > 8) errors.push('A hierarquia aceita no máximo 8 níveis.')
  if (levels[levels.length - 1]?.type !== 'independente') errors.push('O último nível da hierarquia deve ser “Independente”.')
  if (levels.filter((l) => l.type === 'independente').length > 1) errors.push('Só pode haver um nível independente.')
  if (levels.some((l) => !l.name.trim())) errors.push('Todo nível precisa de nome.')
  if (program.countsAsCorrect.length === 0) errors.push('Marque ao menos um nível que conta como acerto.')
  if (program.mastery.percent < 1 || program.mastery.percent > 100) errors.push('O percentual do critério deve ficar entre 1 e 100.')
  if (program.mastery.consecutiveSessions < 1) errors.push('Use ao menos 1 sessão consecutiva no critério.')
  if (program.limits.trialsPerSession < 1 || program.limits.minutesPerSession < 1) errors.push('Os limites precisam ser maiores que zero.')
  if (program.fading.strategy === 'atraso_progressivo' && program.fading.steps.length === 0)
    errors.push('Informe os passos do atraso progressivo.')
  return errors
}
