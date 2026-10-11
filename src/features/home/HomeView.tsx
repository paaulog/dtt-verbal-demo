import type { Tab } from '../../App'
import { promptDependencyLevel } from '../../engine/mastery'
import { OPERANT_LABELS, type Operant } from '../../engine/types'
import type { DemoData } from '../../hooks/useDemoData'
import { formatDate, formatDateTime } from '../../lib/format'

const OPERANTS: Operant[] = ['ouvinte', 'tato', 'ecoico', 'intraverbal', 'mando']

interface Props {
  data: DemoData
  onNavigate: (tab: Tab) => void
}

export function HomeView({ data, onNavigate }: Props) {
  const { programs, targets, statuses, trials, sessions } = data

  const tiles = OPERANTS.map((operant) => {
    const programIds = new Set(programs.filter((p) => p.operant === operant).map((p) => p.id))
    const operantTargets = targets.filter((t) => programIds.has(t.programId))
    const active = operantTargets.filter((t) => statuses.get(t.id)?.state !== 'linha_de_base')
    const mastered = active.filter((t) => {
      const state = statuses.get(t.id)?.state
      return state === 'dominado' || state === 'manutencao' || state === 'generalizado'
    })
    return { operant, mastered: mastered.length, active: active.length, total: operantTargets.length }
  })

  const probesDue = targets.filter((t) => statuses.get(t.id)?.probeDue)
  const dependency = targets.flatMap((target) => {
    const program = programs.find((p) => p.id === target.programId)
    if (!program || statuses.get(target.id)?.state !== 'aquisicao') return []
    const levelId = promptDependencyLevel(
      program,
      trials.filter((t) => t.targetId === target.id),
    )
    if (!levelId) return []
    const level = program.promptHierarchy.find((l) => l.id === levelId)
    return [{ target, program, levelName: level?.name ?? levelId }]
  })

  const lastSession = sessions[sessions.length - 1]
  const lastTrials = lastSession ? trials.filter((t) => t.sessionId === lastSession.id) : []
  const lastIndependent = lastTrials.filter((t) => t.independent).length

  return (
    <div className="stack">
      <section className="hero">
        <div>
          <h1>Ensino por tentativas discretas para operantes verbais</h1>
          <p className="muted">
            Um adulto conduz a sessão e confirma cada resposta. O software apresenta os estímulos, aplica dicas e
            esvanecimento, calcula o domínio e registra tudo no aparelho.
          </p>
        </div>
        <button type="button" className="button button--primary button--large" onClick={() => onNavigate('sessao')}>
          Iniciar sessão
        </button>
      </section>

      <section aria-labelledby="operantes-titulo">
        <h2 id="operantes-titulo">Alvos dominados por operante</h2>
        <div className="tiles">
          {tiles.map((tile) => (
            <article key={tile.operant} className="tile">
              <h3 className="tile__label">{OPERANT_LABELS[tile.operant]}</h3>
              <p className="tile__value">
                {tile.mastered}
                <span className="tile__of"> de {tile.active}</span>
              </p>
              <div
                className="meter"
                role="img"
                aria-label={`${tile.mastered} de ${tile.active} alvos ativos dominados`}
              >
                <span style={{ width: `${tile.active ? (tile.mastered / tile.active) * 100 : 0}%` }} />
              </div>
              <p className="tile__note">
                {tile.total - tile.active > 0 ? `${tile.total - tile.active} em linha de base` : 'Todos ativos'}
              </p>
            </article>
          ))}
        </div>
      </section>

      <div className="grid-2">
        <section className="card" aria-labelledby="alertas-titulo">
          <h2 id="alertas-titulo">Para a responsável técnica</h2>
          {probesDue.length === 0 && dependency.length === 0 && <p className="muted">Nenhum alerta no momento.</p>}
          <ul className="alert-list">
            {probesDue.map((target) => (
              <li key={`probe-${target.id}`}>
                <span className="badge badge--info">Sonda vencida</span> {target.label}: sonda de manutenção prevista
                desde {formatDate(statuses.get(target.id)!.nextProbeAt!)}. Entra automaticamente na próxima sessão.
              </li>
            ))}
            {dependency.map(({ target, program, levelName }) => (
              <li key={`dep-${target.id}`}>
                <span className="badge badge--warning">Dependência de dica</span> {target.label} ({program.name}): nível
                “{levelName}” predominou nas últimas {program.dependencyAlertSessions} sessões. Revise a estratégia de
                esvanecimento. Nada foi alterado automaticamente.
              </li>
            ))}
          </ul>
        </section>

        <section className="card" aria-labelledby="ultima-titulo">
          <h2 id="ultima-titulo">Última sessão</h2>
          {lastSession ? (
            <dl className="facts">
              <div>
                <dt>Data</dt>
                <dd>{formatDateTime(lastSession.startedAt)}</dd>
              </div>
              <div>
                <dt>Conduzida por</dt>
                <dd>{lastSession.conductedBy}</dd>
              </div>
              <div>
                <dt>Tentativas</dt>
                <dd>{lastTrials.length}</dd>
              </div>
              <div>
                <dt>Independentes</dt>
                <dd>{lastIndependent}</dd>
              </div>
            </dl>
          ) : (
            <p className="muted">Nenhuma sessão registrada.</p>
          )}
          <button type="button" className="button" onClick={() => onNavigate('graficos')}>
            Ver gráficos
          </button>
        </section>
      </div>

      <section className="card card--quiet">
        <h2>Sobre esta demonstração</h2>
        <p>
          Os parâmetros clínicos (critério de domínio, atrasos, hierarquia de dicas, limites) são padrões provisórios e
          estão pendentes de validação por profissional habilitado. A demo não tem reconhecimento de fala: o adulto
          pontua as respostas vocais. Os dados ficam só neste aparelho e podem ser restaurados na aba Dados.
        </p>
      </section>
    </div>
  )
}
