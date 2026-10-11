import { useEffect, useState } from 'react'
import type { Tab } from '../../App'
import { OPERANT_LABELS } from '../../engine/types'
import type { DemoData } from '../../hooks/useDemoData'
import { speechAvailable } from '../../lib/speech'
import { SessionRunner } from './SessionRunner'
import { SessionSummary } from './SessionSummary'

interface Props {
  data: DemoData
  onActiveChange: (active: boolean) => void
  onNavigate: (tab: Tab) => void
}

type Stage = { kind: 'setup' } | { kind: 'running'; programIds: string[]; conductor: string } | { kind: 'done'; sessionId: string }

export function SessionView({ data, onActiveChange, onNavigate }: Props) {
  const [stage, setStage] = useState<Stage>({ kind: 'setup' })
  const [selected, setSelected] = useState<string[]>(() => data.programs.slice(0, 2).map((p) => p.id))
  const [conductor, setConductor] = useState(data.settings.conductor)
  const [voiceOk, setVoiceOk] = useState(true)

  useEffect(() => {
    onActiveChange(stage.kind === 'running')
    return () => onActiveChange(false)
  }, [stage.kind, onActiveChange])

  useEffect(() => {
    const timer = window.setTimeout(() => setVoiceOk(speechAvailable()), 600)
    return () => window.clearTimeout(timer)
  }, [])

  if (stage.kind === 'running') {
    return (
      <SessionRunner
        data={data}
        programIds={stage.programIds}
        conductor={stage.conductor}
        onFinish={(sessionId) => setStage({ kind: 'done', sessionId })}
      />
    )
  }

  if (stage.kind === 'done') {
    return (
      <SessionSummary
        data={data}
        sessionId={stage.sessionId}
        onNewSession={() => setStage({ kind: 'setup' })}
        onCharts={() => onNavigate('graficos')}
      />
    )
  }

  const toggle = (id: string) =>
    setSelected((current) => (current.includes(id) ? current.filter((x) => x !== id) : [...current, id]))

  return (
    <div className="stack narrow">
      <h1>Nova sessão</h1>
      <p className="muted">
        Use um tablet ou celular. A área da criança mostra os estímulos; a barra do adulto mostra o que fazer e os botões
        de pontuação. A criança pode tocar em <strong>Pausa</strong> a qualquer momento.
      </p>
      {!voiceOk && (
        <p className="callout callout--warning" role="status">
          Este aparelho não tem voz em português disponível. Os comandos e modelos ecoicos aparecerão só em texto para o
          adulto falar.
        </p>
      )}
      <fieldset className="card">
        <legend>Programas desta sessão</legend>
        {data.programs.map((program) => {
          const active = data.targets.filter((t) => {
            const state = data.statuses.get(t.id)?.state
            return t.programId === program.id && state !== 'linha_de_base'
          }).length
          return (
            <label key={program.id} className="check-row">
              <input type="checkbox" checked={selected.includes(program.id)} onChange={() => toggle(program.id)} />
              <span>
                <strong>{program.name}</strong>
                <span className="muted">
                  {' '}
                  · {OPERANT_LABELS[program.operant]} · {active} alvos ativos · até {program.limits.trialsPerSession}{' '}
                  tentativas
                </span>
              </span>
            </label>
          )
        })}
      </fieldset>
      <label className="field">
        <span>Quem conduz</span>
        <input value={conductor} onChange={(event) => setConductor(event.target.value)} maxLength={60} />
      </label>
      <button
        type="button"
        className="button button--primary button--large"
        disabled={selected.length === 0 || !conductor.trim()}
        onClick={() => setStage({ kind: 'running', programIds: selected, conductor: conductor.trim() })}
      >
        Começar sessão
      </button>
      {selected.length === 0 && <p className="muted">Escolha ao menos um programa.</p>}
    </div>
  )
}
