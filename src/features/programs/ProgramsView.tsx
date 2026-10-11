import { useState } from 'react'
import { db } from '../../data/db'
import { formatDate, formatPercent, newId } from '../../lib/format'
import { promptDependencyLevel } from '../../engine/mastery'
import { OPERANT_LABELS, STATE_LABELS, type Program, type Target } from '../../engine/types'
import type { DemoData } from '../../hooks/useDemoData'
import { ProgramEditor } from './ProgramEditor'

interface Props {
  data: DemoData
}

export function ProgramsView({ data }: Props) {
  const [openId, setOpenId] = useState<string>(data.programs[0]?.id ?? '')
  const program = data.programs.find((p) => p.id === openId)

  return (
    <div className="stack">
      <h1>Programas</h1>
      <p className="muted">
        Só a responsável técnica altera programas e critérios. Os valores-padrão são provisórios e estão pendentes de
        validação clínica.
      </p>
      <div className="segmented" role="tablist" aria-label="Programa">
        {data.programs.map((p) => (
          <button
            key={p.id}
            type="button"
            role="tab"
            aria-selected={p.id === openId}
            className={`segmented__item ${p.id === openId ? 'is-active' : ''}`}
            onClick={() => setOpenId(p.id)}
          >
            {p.name}
          </button>
        ))}
      </div>
      {program && <TargetsTable key={`targets-${program.id}`} data={data} program={program} />}
      {program && <ProgramEditor key={`editor-${program.id}`} program={program} />}
    </div>
  )
}

function TargetsTable({ data, program }: { data: DemoData; program: Program }) {
  const targets = data.targets.filter((t) => t.programId === program.id)
  const [adding, setAdding] = useState(false)

  const setManual = (target: Target, manualState: Target['manualState']) => db.targets.update(target.id, { manualState })

  return (
    <section className="card" aria-labelledby={`alvos-${program.id}`}>
      <div className="row row--between">
        <h2 id={`alvos-${program.id}`}>
          Alvos de {OPERANT_LABELS[program.operant].toLowerCase()} ({targets.length})
        </h2>
        <button type="button" className="button" onClick={() => setAdding((v) => !v)}>
          {adding ? 'Cancelar' : 'Novo alvo'}
        </button>
      </div>
      {adding && <NewTargetForm program={program} onDone={() => setAdding(false)} />}
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th scope="col">Alvo</th>
              <th scope="col">Estado</th>
              <th scope="col">Última pontuação</th>
              <th scope="col">Próxima sonda</th>
              <th scope="col">Referência externa</th>
              <th scope="col">Ações</th>
            </tr>
          </thead>
          <tbody>
            {targets.map((target) => {
              const status = data.statuses.get(target.id)
              const last = status?.scores.at(-1)
              const dependency =
                status?.state === 'aquisicao'
                  ? promptDependencyLevel(
                      program,
                      data.trials.filter((t) => t.targetId === target.id),
                    )
                  : null
              return (
                <tr key={target.id}>
                  <td>
                    <span className="target-emoji" aria-hidden="true">
                      {target.exemplars[0]}
                    </span>{' '}
                    {target.label}
                    {dependency && (
                      <span className="badge badge--warning" title="Mesmo nível de dica nas últimas sessões">
                        Dependência de dica
                      </span>
                    )}
                  </td>
                  <td>
                    <span className={`state state--${status?.state ?? 'aquisicao'}`}>
                      {status ? STATE_LABELS[status.state] : '–'}
                    </span>
                  </td>
                  <td>{formatPercent(last?.percent)}</td>
                  <td>
                    {status?.nextProbeAt ? (
                      <>
                        {formatDate(status.nextProbeAt)}
                        {status.probeDue && <span className="badge badge--info">Vencida</span>}
                      </>
                    ) : (
                      '–'
                    )}
                  </td>
                  <td>
                    <input
                      className="input-inline"
                      aria-label={`Referência externa de ${target.label}`}
                      placeholder="ex.: código do protocolo"
                      defaultValue={target.externalRef}
                      maxLength={40}
                      onBlur={(event) => void db.targets.update(target.id, { externalRef: event.target.value.trim() })}
                    />
                  </td>
                  <td className="actions">
                    {target.manualState === 'linha_de_base' && (
                      <button type="button" className="button button--small" onClick={() => void setManual(target, null)}>
                        Iniciar ensino
                      </button>
                    )}
                    {target.manualState === null && status && ['dominado', 'manutencao'].includes(status.state) && (
                      <button
                        type="button"
                        className="button button--small"
                        onClick={() => {
                          if (window.confirm('Confirme que houve sonda fora da tela (objeto real, outra pessoa ou outro ambiente).'))
                            void setManual(target, 'generalizado')
                        }}
                      >
                        Marcar generalizado
                      </button>
                    )}
                    {target.manualState === 'generalizado' && (
                      <button type="button" className="button button--small button--ghost" onClick={() => void setManual(target, null)}>
                        Desfazer generalizado
                      </button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function NewTargetForm({ program, onDone }: { program: Program; onDone: () => void }) {
  const [label, setLabel] = useState('')
  const [response, setResponse] = useState('')
  const [sd, setSd] = useState(program.operant === 'tato' ? 'O que é isso?' : '')
  const [exemplars, setExemplars] = useState('')

  const save = async () => {
    const list = exemplars
      .split(/[\s,]+/)
      .map((item) => item.trim())
      .filter(Boolean)
    const sdText = program.operant === 'mando' ? '' : sd.trim() || (program.operant === 'ouvinte' ? `Mostra o ${label}` : `Fala: ${label}`)
    const target: Target = {
      id: newId('alvo'),
      programId: program.id,
      label: label.trim(),
      sdText,
      sdSpeech: sdText,
      response: (response.trim() || label).trim(),
      acceptedResponses: [(response.trim() || label).trim()],
      exemplars: list.length ? list : ['❓'],
      item: program.operant === 'mando' ? label.trim() : undefined,
      manualState: 'linha_de_base',
      externalRef: '',
      createdAt: Date.now(),
    }
    await db.targets.add(target)
    onDone()
  }

  return (
    <form
      className="form-grid"
      onSubmit={(event) => {
        event.preventDefault()
        if (label.trim()) void save()
      }}
    >
      <label className="field">
        <span>Nome do alvo</span>
        <input required value={label} onChange={(e) => setLabel(e.target.value)} maxLength={40} />
      </label>
      <label className="field">
        <span>Resposta esperada</span>
        <input value={response} onChange={(e) => setResponse(e.target.value)} placeholder={label} maxLength={40} />
      </label>
      {program.operant !== 'mando' && (
        <label className="field">
          <span>Instrução (SD)</span>
          <input value={sd} onChange={(e) => setSd(e.target.value)} maxLength={80} />
        </label>
      )}
      <label className="field">
        <span>Exemplares (emoji separados por espaço)</span>
        <input value={exemplars} onChange={(e) => setExemplars(e.target.value)} placeholder="🚗 🚙 🚕" />
      </label>
      <p className="muted form-grid__full">O alvo entra em linha de base. Use “Iniciar ensino” quando decidir ensiná-lo.</p>
      <button type="submit" className="button button--primary">
        Adicionar alvo
      </button>
    </form>
  )
}
