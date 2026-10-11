import { describe, expect, it } from 'vitest'
import { promptDependencyLevel } from '../engine/mastery'
import { statusMap } from '../engine/runner'
import { buildLibrary, reinforcers } from './library'
import { simulateHistory } from './simulate'

const NOW = new Date('2026-10-11T12:00:00-03:00').getTime()

describe('histórico simulado da demo', () => {
  const { programs, targets } = buildLibrary()
  const result = simulateHistory(programs, targets, reinforcers, NOW)

  it('gera 10 sessões no passado, com tentativas dentro do limite', () => {
    expect(result.sessions).toHaveLength(10)
    for (const session of result.sessions) {
      const count = result.trials.filter((t) => t.sessionId === session.id).length
      expect(count).toBeGreaterThan(0)
      expect(count).toBeLessThanOrEqual(30)
      expect(session.endedAt!).toBeLessThan(NOW)
    }
  })

  it('é determinístico', () => {
    const again = simulateHistory(programs, targets, reinforcers, NOW)
    expect(again.trials.map((t) => t.result)).toEqual(result.trials.map((t) => t.result))
  })

  it('não apresenta alvos em linha de base', () => {
    const baseline = new Set(targets.filter((t) => t.manualState === 'linha_de_base').map((t) => t.id))
    expect(result.trials.some((t) => baseline.has(t.targetId))).toBe(false)
  })

  it('produz estados variados para a demo ter o que mostrar', () => {
    const statuses = statusMap(programs, targets, result.trials, NOW)
    const states = new Set([...statuses.values()].map((s) => s.state))
    expect(states.has('aquisicao')).toBe(true)
    expect(states.has('dominado') || states.has('manutencao')).toBe(true)
  })

  it('registra a retirada de assentimento simulada', () => {
    expect(result.assentEvents).toHaveLength(1)
    expect(result.sessions[5].ending).toBe('retirada_assentimento')
  })

  it('mostra ao menos um alerta de dependência de dica', () => {
    const alerts = targets.filter((target) => {
      const program = programs.find((p) => p.id === target.programId)!
      return promptDependencyLevel(program, result.trials.filter((t) => t.targetId === target.id))
    })
    expect(alerts.length).toBeGreaterThan(0)
  })
})
