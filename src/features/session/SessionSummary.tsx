import { sessionScore } from '../../engine/mastery'
import { STATE_LABELS } from '../../engine/types'
import type { DemoData } from '../../hooks/useDemoData'
import { formatDateTime, formatPercent } from '../../lib/format'

interface Props {
  data: DemoData
  sessionId: string
  onNewSession?: () => void
  onCharts?: () => void
}

const ENDING_LABELS: Record<string, string> = {
  normal: 'Encerrada pelo adulto',
  limite: 'Limite de tentativas ou minutos atingido',
  pausa: 'Encerrada durante pausa',
  retirada_assentimento: 'Encerrada por retirada de assentimento',
}

const EVENT_LABELS: Record<string, string> = {
  pausa_crianca: 'Pausa pedida pela criança',
  retirada_sinal: 'Sinal de retirada de assentimento',
  desengajamento: 'Pausa por desengajamento',
}

export function SessionSummary({ data, sessionId, onNewSession, onCharts }: Props) {
  const session = data.sessions.find((s) => s.id === sessionId)
  const trials = data.trials.filter((t) => t.sessionId === sessionId)
  const events = data.assentEvents.filter((e) => e.sessionId === sessionId)

  if (!session) return <p className="muted">Carregando resumo…</p>

  const independent = trials.filter((t) => t.independent).length
  const targetIds = [...new Set(trials.map((t) => t.targetId))]
  const rows = targetIds.map((targetId) => {
    const target = data.targets.find((t) => t.id === targetId)!
    const program = data.programs.find((p) => p.id === target.programId)!
    const targetTrials = trials.filter((t) => t.targetId === targetId)
    return {
      target,
      program,
      count: targetTrials.length,
      independent: targetTrials.filter((t) => t.independent).length,
      score: sessionScore(program, targetTrials),
      state: data.statuses.get(targetId)?.state,
    }
  })
  const changes = data.targets.flatMap((target) =>
    (data.statuses.get(target.id)?.history ?? [])
      .filter((change) => change.at >= session.startedAt && change.at <= (session.endedAt ?? Date.now()) && change.reason !== 'Início do ensino')
      .map((change) => ({ target, change })),
  )

  return (
    <div className="stack summary">
      <div className="row row--between no-print">
        <h1>Resumo da sessão</h1>
        <div className="row">
          <button type="button" className="button" onClick={() => window.print()}>
            Imprimir ou salvar PDF
          </button>
          {onCharts && (
            <button type="button" className="button" onClick={onCharts}>
              Gráficos
            </button>
          )}
          {onNewSession && (
            <button type="button" className="button button--primary" onClick={onNewSession}>
              Nova sessão
            </button>
          )}
        </div>
      </div>
      <h1 className="print-only">Resumo da sessão (demonstração, dados fictícios)</h1>
      <dl className="facts card">
        <div>
          <dt>Início</dt>
          <dd>{formatDateTime(session.startedAt)}</dd>
        </div>
        <div>
          <dt>Conduzida por</dt>
          <dd>{session.conductedBy}</dd>
        </div>
        <div>
          <dt>Tentativas</dt>
          <dd>{trials.length}</dd>
        </div>
        <div>
          <dt>Independentes</dt>
          <dd>
            {independent} ({formatPercent(trials.length ? (independent / trials.length) * 100 : null)})
          </dd>
        </div>
        <div>
          <dt>Encerramento</dt>
          <dd>{ENDING_LABELS[session.ending ?? 'normal']}</dd>
        </div>
      </dl>

      {changes.length > 0 && (
        <section className="card">
          <h2>Mudanças de estado</h2>
          <ul>
            {changes.map(({ target, change }) => (
              <li key={`${target.id}-${change.at}`}>
                <strong>{target.label}</strong>: {STATE_LABELS[change.state]} ({change.reason})
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="card">
        <h2>Por alvo</h2>
        {rows.length === 0 ? (
          <p className="muted">Nenhuma tentativa registrada.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th scope="col">Alvo</th>
                  <th scope="col">Programa</th>
                  <th scope="col">Tentativas</th>
                  <th scope="col">Independentes</th>
                  <th scope="col">Pontuação do critério</th>
                  <th scope="col">Estado atual</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.target.id}>
                    <td>{row.target.label}</td>
                    <td>{row.program.name}</td>
                    <td>{row.count}</td>
                    <td>{row.independent}</td>
                    <td>{formatPercent(row.score)}</td>
                    <td>{row.state ? STATE_LABELS[row.state] : '–'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="card">
        <h2>Assentimento</h2>
        {events.length === 0 ? (
          <p className="muted">Nenhuma pausa ou sinal de retirada registrado.</p>
        ) : (
          <ul>
            {events.map((event) => (
              <li key={event.id}>
                {formatDateTime(event.timestamp)}: {EVENT_LABELS[event.kind]}
                {event.signal ? ` (${event.signal})` : ''}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
