import { useMemo, useState } from 'react'
import { groupBySession } from '../../engine/mastery'
import { STATE_LABELS } from '../../engine/types'
import type { DemoData } from '../../hooks/useDemoData'
import { formatDate, formatDateTime, formatPercent } from '../../lib/format'
import { PromptLevelChart, ScoreLineChart, type LevelColumn } from './charts'

export function ChartsView({ data }: { data: DemoData }) {
  const [programId, setProgramId] = useState(data.programs[0]?.id ?? '')
  const program = data.programs.find((p) => p.id === programId)
  const programTargets = data.targets.filter((t) => t.programId === programId)
  const withData = programTargets.filter((t) => data.trials.some((trial) => trial.targetId === t.id))
  const [targetId, setTargetId] = useState(withData[0]?.id ?? programTargets[0]?.id ?? '')
  const [showTable, setShowTable] = useState(false)

  const target = programTargets.find((t) => t.id === targetId) ?? withData[0] ?? programTargets[0]
  const status = target ? data.statuses.get(target.id) : undefined

  const columns = useMemo<LevelColumn[]>(() => {
    if (!target) return []
    return groupBySession(data.trials.filter((t) => t.targetId === target.id && t.type === 'ensino')).map((trials) => {
      const counts: Record<string, number> = {}
      for (const trial of trials) counts[trial.promptLevelId] = (counts[trial.promptLevelId] ?? 0) + 1
      return { at: trials[0].timestamp, counts }
    })
  }, [data.trials, target])

  if (!program || !target) return <p className="muted">Nenhum programa disponível.</p>

  const scores = status?.scores ?? []

  return (
    <div className="stack">
      <h1>Gráficos</h1>
      <div className="filters">
        <label className="field">
          <span>Programa</span>
          <select
            value={programId}
            onChange={(event) => {
              setProgramId(event.target.value)
              const first = data.targets.find((t) => t.programId === event.target.value && data.trials.some((x) => x.targetId === t.id))
              setTargetId(first?.id ?? '')
            }}
          >
            {data.programs.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Alvo</span>
          <select value={target.id} onChange={(event) => setTargetId(event.target.value)}>
            {programTargets.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label} ({STATE_LABELS[data.statuses.get(t.id)?.state ?? 'aquisicao']})
              </option>
            ))}
          </select>
        </label>
        <label className="check-inline">
          <input type="checkbox" checked={showTable} onChange={(event) => setShowTable(event.target.checked)} />
          Ver como tabela
        </label>
      </div>

      <section className="card">
        <ScoreLineChart
          title={`${target.label}: acerto por sessão (base: ${program.mastery.basis === 'primeira' ? 'primeira tentativa' : 'todas as tentativas'})`}
          points={scores.map((s) => ({ at: s.at, percent: s.percent, trials: s.trials }))}
          criterion={program.mastery.percent}
          changes={status?.history ?? []}
        />
      </section>

      <section className="card">
        <PromptLevelChart
          title={`${target.label}: níveis de dica nas tentativas de ensino`}
          levels={program.promptHierarchy.map((l) => ({ id: l.id, name: l.name }))}
          columns={columns}
        />
      </section>

      {showTable && (
        <section className="card">
          <h2>Dados por sessão</h2>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th scope="col">Sessão</th>
                  <th scope="col">Acerto</th>
                  <th scope="col">Tentativas</th>
                  {program.promptHierarchy.map((l) => (
                    <th key={l.id} scope="col">
                      {l.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {columns.map((column, index) => (
                  <tr key={column.at}>
                    <td>{formatDate(column.at)}</td>
                    <td>{formatPercent(scores[index]?.percent)}</td>
                    <td>{Object.values(column.counts).reduce((a, b) => a + b, 0)}</td>
                    {program.promptHierarchy.map((l) => (
                      <td key={l.id}>{column.counts[l.id] ?? 0}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section className="card">
        <h2>Histórico de estados</h2>
        <ol className="timeline">
          {(status?.history ?? []).map((change) => (
            <li key={`${change.state}-${change.at}`}>
              <span className={`state state--${change.state}`}>{STATE_LABELS[change.state]}</span>{' '}
              <span className="muted">{formatDateTime(change.at)}</span> · {change.reason}
            </li>
          ))}
        </ol>
        {status?.nextProbeAt && <p className="muted">Próxima sonda de manutenção: {formatDate(status.nextProbeAt)}.</p>}
      </section>
    </div>
  )
}
