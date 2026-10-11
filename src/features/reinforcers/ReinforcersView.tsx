import { useState } from 'react'
import { db } from '../../data/db'
import { mswoRanking, type MswoRank } from '../../engine/mswo'
import type { Reinforcer } from '../../engine/types'
import type { DemoData } from '../../hooks/useDemoData'
import { newId } from '../../lib/format'

async function saveOrder(ordered: Reinforcer[]) {
  await db.reinforcers.bulkPut(ordered.map((r, index) => ({ ...r, rank: index + 1 })))
}

export function ReinforcersView({ data }: { data: DemoData }) {
  const reinforcers = data.reinforcers
  const [name, setName] = useState('')
  const [kind, setKind] = useState<Reinforcer['kind']>('fisico')
  const [mswo, setMswo] = useState(false)

  const move = (index: number, direction: -1 | 1) => {
    const next = [...reinforcers]
    const target = index + direction
    if (target < 0 || target >= next.length) return
    ;[next[index], next[target]] = [next[target], next[index]]
    void saveOrder(next)
  }

  const add = async () => {
    if (!name.trim() || !data.learner) return
    await db.reinforcers.add({
      id: newId('reforcador'),
      learnerId: data.learner.id,
      name: name.trim(),
      kind,
      rank: reinforcers.length + 1,
      active: true,
    })
    setName('')
  }

  return (
    <div className="stack">
      <h1>Reforçadores</h1>
      <p className="muted">
        A ordem define o reforço diferencial: resposta independente recebe o primeiro reforçador ativo; resposta com dica
        recebe elogio. Reforçadores digitais ficam presos à resposta da tentativa, nunca ao tempo de uso.
      </p>

      {mswo ? (
        <MswoRunner
          items={reinforcers.filter((r) => r.active)}
          onCancel={() => setMswo(false)}
          onApply={async (ranking) => {
            const byId = new Map(reinforcers.map((r) => [r.id, r]))
            const ranked = ranking.map((r) => byId.get(r.itemId)!).filter(Boolean)
            const inactive = reinforcers.filter((r) => !r.active)
            await saveOrder([...ranked, ...inactive])
            setMswo(false)
          }}
        />
      ) : (
        <>
          <section className="card">
            <div className="row row--between">
              <h2>Ranking atual</h2>
              <button type="button" className="button button--primary" onClick={() => setMswo(true)} disabled={reinforcers.filter((r) => r.active).length < 2}>
                Avaliação de preferência (MSWO)
              </button>
            </div>
            <ol className="rank-list">
              {reinforcers.map((reinforcer, index) => (
                <li key={reinforcer.id} className={reinforcer.active ? '' : 'is-inactive'}>
                  <span className="rank-list__pos">{index + 1}</span>
                  <span className="rank-list__name">
                    {reinforcer.name}
                    <span className="badge badge--neutral">{reinforcer.kind === 'digital' ? 'Digital' : 'Físico'}</span>
                  </span>
                  <span className="levels__actions">
                    <button type="button" className="icon-button" aria-label={`Subir ${reinforcer.name}`} onClick={() => move(index, -1)} disabled={index === 0}>
                      ↑
                    </button>
                    <button
                      type="button"
                      className="icon-button"
                      aria-label={`Descer ${reinforcer.name}`}
                      onClick={() => move(index, 1)}
                      disabled={index === reinforcers.length - 1}
                    >
                      ↓
                    </button>
                    <label className="check-inline">
                      <input
                        type="checkbox"
                        checked={reinforcer.active}
                        onChange={() => void db.reinforcers.update(reinforcer.id, { active: !reinforcer.active })}
                      />
                      ativo
                    </label>
                  </span>
                </li>
              ))}
            </ol>
          </section>

          <section className="card">
            <h2>Novo reforçador</h2>
            <form
              className="form-grid"
              onSubmit={(event) => {
                event.preventDefault()
                void add()
              }}
            >
              <label className="field">
                <span>Nome</span>
                <input value={name} onChange={(e) => setName(e.target.value)} maxLength={40} required />
              </label>
              <label className="field">
                <span>Tipo</span>
                <select value={kind} onChange={(e) => setKind(e.target.value as Reinforcer['kind'])}>
                  <option value="fisico">Físico (o adulto entrega)</option>
                  <option value="digital">Digital (na tela)</option>
                </select>
              </label>
              <button type="submit" className="button">
                Adicionar
              </button>
            </form>
          </section>
        </>
      )}
    </div>
  )
}

function MswoRunner({
  items,
  onCancel,
  onApply,
}: {
  items: Reinforcer[]
  onCancel: () => void
  onApply: (ranking: MswoRank[]) => void
}) {
  const [roundsTotal, setRoundsTotal] = useState(3)
  const [rounds, setRounds] = useState<string[][]>([])
  const [current, setCurrent] = useState<string[]>([])
  const [started, setStarted] = useState(false)

  const remaining = items.filter((item) => !current.includes(item.id))
  const done = rounds.length >= roundsTotal

  const choose = (id: string) => {
    const next = [...current, id]
    const left = items.filter((item) => !next.includes(item.id))
    if (left.length <= 1) {
      const completed = left.length === 1 ? [...next, left[0].id] : next
      setRounds((r) => [...r, completed])
      setCurrent([])
    } else {
      setCurrent(next)
    }
  }

  const ranking = mswoRanking(
    items.map((i) => i.id),
    rounds,
  )
  const nameOf = (id: string) => items.find((i) => i.id === id)?.name ?? id

  return (
    <section className="card">
      <h2>Avaliação de preferência MSWO</h2>
      {!started ? (
        <div className="stack-sm">
          <p>
            Coloque os itens à frente da criança. A cada escolha, registre o item e retire-o; os demais são reorganizados.
            Para itens físicos o software só registra.
          </p>
          <label className="field field--number">
            <span>Rodadas</span>
            <input type="number" min={1} max={5} value={roundsTotal} onChange={(e) => setRoundsTotal(Math.min(5, Math.max(1, Number(e.target.value))))} />
          </label>
          <div className="row">
            <button type="button" className="button button--primary" onClick={() => setStarted(true)}>
              Começar
            </button>
            <button type="button" className="button button--ghost" onClick={onCancel}>
              Cancelar
            </button>
          </div>
        </div>
      ) : !done ? (
        <div className="stack-sm">
          <p className="adult-bar__title">
            Rodada {rounds.length + 1} de {roundsTotal} · escolha {current.length + 1}
          </p>
          <p className="muted">Toque no item que a criança escolheu.</p>
          <div className="choice-grid">
            {remaining.map((item) => (
              <button key={item.id} type="button" className="choice" onClick={() => choose(item.id)}>
                {item.name}
              </button>
            ))}
          </div>
          {current.length > 0 && <p className="muted">Já escolhidos nesta rodada: {current.map(nameOf).join(', ')}</p>}
          <button type="button" className="button button--ghost" onClick={onCancel}>
            Cancelar
          </button>
        </div>
      ) : (
        <div className="stack-sm">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th scope="col">Posição</th>
                  <th scope="col">Item</th>
                  <th scope="col">Escolhas / apresentações</th>
                  <th scope="col">Percentual</th>
                </tr>
              </thead>
              <tbody>
                {ranking.map((row, index) => (
                  <tr key={row.itemId}>
                    <td>{index + 1}</td>
                    <td>{nameOf(row.itemId)}</td>
                    <td>
                      {row.selected} / {row.presented}
                    </td>
                    <td>{row.percent}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="row">
            <button type="button" className="button button--primary" onClick={() => onApply(ranking)}>
              Aplicar este ranking
            </button>
            <button type="button" className="button button--ghost" onClick={onCancel}>
              Descartar
            </button>
          </div>
        </div>
      )}
    </section>
  )
}
