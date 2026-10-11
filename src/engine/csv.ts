import type { Program, Target, Trial } from './types'

const HEADERS = [
  'tentativa_id',
  'sessao_id',
  'data_hora',
  'programa',
  'operante',
  'alvo',
  'tipo',
  'exemplar',
  'opcoes',
  'nivel_dica',
  'atraso_dica_s',
  'latencia_ms',
  'resultado',
  'independente',
  'correcao',
  'reforcador',
]

function escape(value: string | number | boolean | null): string {
  if (value === null) return ''
  const text = String(value)
  return /[",;\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

/** Uma linha por tentativa, com todos os campos do modelo de dados (PRD, seção 7). */
export function trialsToCsv(trials: Trial[], programs: Program[], targets: Target[]): string {
  const programById = new Map(programs.map((p) => [p.id, p]))
  const targetById = new Map(targets.map((t) => [t.id, t]))
  const rows = [...trials]
    .sort((a, b) => a.timestamp - b.timestamp)
    .map((trial) => {
      const program = programById.get(trial.programId)
      const level = program?.promptHierarchy.find((l) => l.id === trial.promptLevelId)
      return [
        trial.id,
        trial.sessionId,
        new Date(trial.timestamp).toISOString(),
        program?.name ?? trial.programId,
        trial.operant,
        targetById.get(trial.targetId)?.label ?? trial.targetId,
        trial.type,
        trial.exemplar,
        trial.options.map((id) => targetById.get(id)?.label ?? id).join('|'),
        level?.name ?? trial.promptLevelId,
        trial.promptDelaySeconds,
        trial.latencyMs,
        trial.result,
        trial.independent,
        trial.correctionApplied,
        trial.reinforcer,
      ]
        .map(escape)
        .join(',')
    })
  return [HEADERS.join(','), ...rows].join('\n')
}
