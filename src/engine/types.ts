export type Operant = 'ouvinte' | 'tato' | 'ecoico' | 'intraverbal' | 'mando'

export const OPERANT_LABELS: Record<Operant, string> = {
  ouvinte: 'Ouvinte',
  tato: 'Tato',
  ecoico: 'Ecoico',
  intraverbal: 'Intraverbal',
  mando: 'Mando',
}

export type PromptType =
  | 'audio_total'
  | 'audio_parcial'
  | 'figura'
  | 'destaque'
  | 'reducao_campo'
  | 'gestual'
  | 'fisica'
  | 'independente'

export interface PromptLevel {
  id: string
  name: string
  type: PromptType
  /** Quem executa a dica: o software (áudio, destaque) ou o adulto (gesto, ajuda física). */
  executedBy: 'software' | 'adulto'
}

export type Fading =
  | { strategy: 'mais_para_menos'; advanceAfter: number }
  | { strategy: 'menos_para_mais' }
  | { strategy: 'atraso_constante'; zeroDelayTrials: number; delaySeconds: number }
  | { strategy: 'atraso_progressivo'; steps: number[] }

export type FadingStrategy = Fading['strategy']

export interface ErrorCorrection {
  strategy: 'reiniciar_com_dica' | 'dica_e_registro' | 'seguir_menos_ajuda'
  maxRepetitions: number
}

export interface MasteryCriterion {
  percent: number
  consecutiveSessions: number
  /** 'primeira': só a primeira tentativa de ensino do alvo na sessão; 'todas': todas as tentativas de ensino. */
  basis: 'todas' | 'primeira'
}

export interface SessionLimits {
  trialsPerSession: number
  minutesPerSession: number
}

export interface Program {
  id: string
  learnerId: string
  name: string
  operant: Operant
  /** Ordem do mais para o menos intrusivo. O último nível deve ser 'independente'. */
  promptHierarchy: PromptLevel[]
  countsAsCorrect: string[]
  fading: Fading
  latencySeconds: number
  itiSeconds: number
  errorCorrection: ErrorCorrection
  mastery: MasteryCriterion
  maintenanceDays: number[]
  limits: SessionLimits
  /** Uma tentativa intercalada de alvo dominado a cada N tentativas de aquisição. */
  interleaveEvery: number
  /** Número de figuras na tela em tentativas de ouvinte. */
  fieldSize: number
  dependencyAlertSessions: number
}

/** Estado que só a responsável técnica muda. Os demais estados são derivados do histórico. */
export type ManualState = 'linha_de_base' | 'generalizado' | null

export type TargetState = 'linha_de_base' | 'aquisicao' | 'dominado' | 'manutencao' | 'generalizado'

export const STATE_LABELS: Record<TargetState, string> = {
  linha_de_base: 'Linha de base',
  aquisicao: 'Aquisição',
  dominado: 'Dominado',
  manutencao: 'Manutenção',
  generalizado: 'Generalizado',
}

export interface Target {
  id: string
  programId: string
  label: string
  /** Texto exibido ao adulto e falado por síntese de voz. Vazio no mando. */
  sdText: string
  sdSpeech: string
  /** Resposta-modelo usada nas dicas ecoicas. */
  response: string
  acceptedResponses: string[]
  /** Exemplares visuais (emoji ou caminho de imagem). */
  exemplars: string[]
  /** Item a entregar (mando) ou figura de apoio (intraverbal). */
  item?: string
  manualState: ManualState
  externalRef: string
  createdAt: number
}

export type TrialResult = 'correta' | 'incorreta' | 'sem_resposta'

export type TrialType = 'ensino' | 'correcao' | 'intercalada' | 'manutencao'

export interface Trial {
  id: string
  sessionId: string
  targetId: string
  programId: string
  operant: Operant
  type: TrialType
  exemplar: string
  /** Ids dos alvos mostrados como opções (ouvinte), na ordem das posições. */
  options: string[]
  promptLevelId: string
  promptDelaySeconds: number
  latencyMs: number | null
  result: TrialResult
  independent: boolean
  correctionApplied: ErrorCorrection['strategy'] | null
  reinforcer: string | null
  timestamp: number
}

export type SessionEnd = 'normal' | 'limite' | 'pausa' | 'retirada_assentimento'

export interface Session {
  id: string
  learnerId: string
  programIds: string[]
  startedAt: number
  endedAt: number | null
  conductedBy: string
  context: 'tela' | 'mesa'
  ending: SessionEnd | null
}

export interface AssentEvent {
  id: string
  sessionId: string
  kind: 'pausa_crianca' | 'retirada_sinal' | 'desengajamento'
  signal: string
  timestamp: number
}

export interface Reinforcer {
  id: string
  learnerId: string
  name: string
  kind: 'digital' | 'fisico'
  rank: number
  active: boolean
}

export interface Learner {
  id: string
  nickname: string
  createdAt: number
  assentSignals: string[]
}
