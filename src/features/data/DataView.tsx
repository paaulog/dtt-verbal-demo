import { useState } from 'react'
import { db, resetDemoData, type Settings } from '../../data/db'
import { trialsToCsv } from '../../engine/csv'
import type { DemoData } from '../../hooks/useDemoData'
import { downloadText, formatDateTime } from '../../lib/format'
import { SessionSummary } from '../session/SessionSummary'

export function DataView({ data }: { data: DemoData }) {
  const [viewing, setViewing] = useState<string | null>(null)
  const [resetting, setResetting] = useState(false)
  const { settings } = data

  const updateSettings = (patch: Partial<Settings>) => void db.settings.put({ ...settings, ...patch })

  if (viewing) {
    return (
      <div className="stack">
        <button type="button" className="button button--ghost no-print" onClick={() => setViewing(null)}>
          ← Voltar
        </button>
        <SessionSummary data={data} sessionId={viewing} />
      </div>
    )
  }

  const exportCsv = () => {
    const csv = trialsToCsv(data.trials, data.programs, data.targets)
    downloadText(`dtt-demo-tentativas-${new Date().toISOString().slice(0, 10)}.csv`, csv)
  }

  const reset = async () => {
    if (!window.confirm('Isto apaga todos os dados deste aparelho e recarrega o aprendiz fictício. Continuar?')) return
    setResetting(true)
    await resetDemoData()
    setResetting(false)
  }

  return (
    <div className="stack">
      <h1>Dados e preferências</h1>

      <section className="card">
        <h2>Exportar</h2>
        <p className="muted">Uma linha por tentativa, com todos os campos registrados. {data.trials.length} tentativas no aparelho.</p>
        <button type="button" className="button button--primary" onClick={exportCsv}>
          Baixar CSV
        </button>
      </section>

      <section className="card">
        <h2>Interface da sessão</h2>
        <label className="check-row">
          <input type="checkbox" checked={settings.soundOn} onChange={(e) => updateSettings({ soundOn: e.target.checked })} />
          <span>Voz sintetizada para instruções e modelos ecoicos</span>
        </label>
        <label className="check-row">
          <input
            type="checkbox"
            checked={settings.lowStimulation}
            onChange={(e) => updateSettings({ lowStimulation: e.target.checked })}
          />
          <span>Modo de baixa estimulação (sem animações, cores mais suaves)</span>
        </label>
        <label className="field field--number">
          <span>Duração do reforçador digital</span>
          <span className="field__input">
            <input
              type="number"
              min={0}
              max={5000}
              step={250}
              value={settings.reinforcementMs}
              onChange={(e) => updateSettings({ reinforcementMs: Math.max(0, Number(e.target.value)) })}
            />
            <span className="muted">ms (0 desliga a animação)</span>
          </span>
        </label>
        <label className="field">
          <span>Nome padrão de quem conduz</span>
          <input value={settings.conductor} maxLength={60} onChange={(e) => updateSettings({ conductor: e.target.value })} />
        </label>
      </section>

      <section className="card">
        <h2>Sessões registradas</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th scope="col">Início</th>
                <th scope="col">Conduzida por</th>
                <th scope="col">Tentativas</th>
                <th scope="col">Resumo</th>
              </tr>
            </thead>
            <tbody>
              {[...data.sessions].reverse().map((session) => (
                <tr key={session.id}>
                  <td>{formatDateTime(session.startedAt)}</td>
                  <td>{session.conductedBy}</td>
                  <td>{data.trials.filter((t) => t.sessionId === session.id).length}</td>
                  <td>
                    <button type="button" className="button button--small" onClick={() => setViewing(session.id)}>
                      Abrir
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card card--danger">
        <h2>Restaurar dados de exemplo</h2>
        <p className="muted">Apaga sessões, alterações de programas e reforçadores feitas neste aparelho.</p>
        <button type="button" className="button button--warning" onClick={() => void reset()} disabled={resetting}>
          {resetting ? 'Restaurando…' : 'Restaurar dados de exemplo'}
        </button>
      </section>
    </div>
  )
}
