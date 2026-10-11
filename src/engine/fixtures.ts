import { defaultProgram } from './defaults'
import type { Operant, Program, Target, Trial } from './types'

/** Fábricas usadas apenas pelos testes. */

export function makeProgram(operant: Operant = 'tato', overrides: Partial<Program> = {}): Program {
  return { ...defaultProgram('p1', 'l1', 'Programa teste', operant), ...overrides }
}

export function makeTarget(id: string, label: string, overrides: Partial<Target> = {}): Target {
  return {
    id,
    programId: 'p1',
    label,
    sdText: 'O que é isso?',
    sdSpeech: 'O que é isso?',
    response: label,
    acceptedResponses: [label],
    exemplars: ['x'],
    manualState: null,
    externalRef: '',
    createdAt: 0,
    ...overrides,
  }
}

let counter = 0

export function makeTrial(overrides: Partial<Trial> = {}): Trial {
  counter += 1
  return {
    id: `t${counter}`,
    sessionId: 's1',
    targetId: 'a',
    programId: 'p1',
    operant: 'tato',
    type: 'ensino',
    exemplar: 'x',
    options: [],
    promptLevelId: 'indep',
    promptDelaySeconds: 0,
    latencyMs: 1000,
    result: 'correta',
    independent: true,
    correctionApplied: null,
    reinforcer: null,
    timestamp: counter * 1000,
    ...overrides,
  }
}
