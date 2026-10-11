import { useState, type ReactNode } from 'react'
import { db } from '../../data/db'
import { PROMPT_TYPE_LABELS } from '../../engine/defaults'
import type { Fading, Program, PromptLevel, PromptType } from '../../engine/types'
import { newId } from '../../lib/format'
import { validateProgram } from '../../engine/validation'

const ADULT_TYPES = new Set<PromptType>(['gestual', 'fisica'])

const FADING_LABELS: Record<Fading['strategy'], string> = {
  mais_para_menos: 'Do mais para o menos intrusivo',
  menos_para_mais: 'Do menos para o mais intrusivo',
  atraso_constante: 'Atraso constante',
  atraso_progressivo: 'Atraso progressivo',
}

const CORRECTION_LABELS: Record<Program['errorCorrection']['strategy'], string> = {
  reiniciar_com_dica: 'Reiniciar do SD com um nível a mais de dica',
  dica_e_registro: 'Repetir com a dica mais intrusiva',
  seguir_menos_ajuda: 'Seguir para a próxima tentativa',
}

function defaultFading(strategy: Fading['strategy']): Fading {
  switch (strategy) {
    case 'mais_para_menos':
      return { strategy, advanceAfter: 2 }
    case 'menos_para_mais':
      return { strategy }
    case 'atraso_constante':
      return { strategy, zeroDelayTrials: 4, delaySeconds: 4 }
    case 'atraso_progressivo':
      return { strategy, steps: [0, 1, 2, 3, 4] }
  }
}

function Provisional() {
  return <span className="tag">padrão provisório da demo, pendente de validação clínica</span>
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="editor-section">
      <legend>{title}</legend>
      {children}
    </fieldset>
  )
}

function NumberField({
  label,
  value,
  onChange,
  min = 0,
  max,
  step = 1,
  suffix,
}: {
  label: string
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  step?: number
  suffix?: string
}) {
  return (
    <label className="field field--number">
      <span>{label}</span>
      <span className="field__input">
        <input
          type="number"
          inputMode="numeric"
          value={Number.isFinite(value) ? value : ''}
          min={min}
          max={max}
          step={step}
          onChange={(event) => onChange(Number(event.target.value))}
        />
        {suffix && <span className="muted">{suffix}</span>}
      </span>
    </label>
  )
}

export function ProgramEditor({ program }: { program: Program }) {
  const [draft, setDraft] = useState<Program>(() => structuredClone(program))
  const [saved, setSaved] = useState(false)
  const errors = validateProgram(draft)

  const update = (patch: Partial<Program>) => {
    setSaved(false)
    setDraft((current) => ({ ...current, ...patch }))
  }

  const updateLevel = (index: number, patch: Partial<PromptLevel>) => {
    const levels = draft.promptHierarchy.map((level, i) => {
      if (i !== index) return level
      const next = { ...level, ...patch }
      if (patch.type) next.executedBy = ADULT_TYPES.has(patch.type) ? 'adulto' : 'software'
      return next
    })
    update({ promptHierarchy: levels })
  }

  const moveLevel = (index: number, direction: -1 | 1) => {
    const levels = [...draft.promptHierarchy]
    const target = index + direction
    if (target < 0 || target >= levels.length) return
    ;[levels[index], levels[target]] = [levels[target], levels[index]]
    update({ promptHierarchy: levels })
  }

  const removeLevel = (index: number) => {
    const removed = draft.promptHierarchy[index]
    update({
      promptHierarchy: draft.promptHierarchy.filter((_, i) => i !== index),
      countsAsCorrect: draft.countsAsCorrect.filter((id) => id !== removed.id),
    })
  }

  const addLevel = () => {
    const levels = [...draft.promptHierarchy]
    levels.splice(Math.max(0, levels.length - 1), 0, {
      id: newId('nivel'),
      name: 'Nova dica',
      type: 'gestual',
      executedBy: 'adulto',
    })
    update({ promptHierarchy: levels })
  }

  const toggleCorrect = (id: string) =>
    update({
      countsAsCorrect: draft.countsAsCorrect.includes(id)
        ? draft.countsAsCorrect.filter((x) => x !== id)
        : [...draft.countsAsCorrect, id],
    })

  const save = async () => {
    if (errors.length > 0) return
    await db.programs.put(draft)
    setSaved(true)
  }

  const fading = draft.fading

  return (
    <section className="card" aria-labelledby={`editor-${program.id}`}>
      <div className="row row--between">
        <h2 id={`editor-${program.id}`}>Configuração do programa</h2>
        <Provisional />
      </div>

      <Section title="Hierarquia de dicas (do mais para o menos intrusivo)">
        <ol className="levels">
          {draft.promptHierarchy.map((level, index) => (
            <li key={level.id} className="levels__item">
              <input
                aria-label={`Nome do nível ${index + 1}`}
                value={level.name}
                onChange={(event) => updateLevel(index, { name: event.target.value })}
                maxLength={40}
              />
              <select
                aria-label={`Tipo do nível ${index + 1}`}
                value={level.type}
                onChange={(event) => updateLevel(index, { type: event.target.value as PromptType })}
              >
                {Object.entries(PROMPT_TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              <label className="check-inline">
                <input
                  type="checkbox"
                  checked={draft.countsAsCorrect.includes(level.id)}
                  onChange={() => toggleCorrect(level.id)}
                />
                conta como acerto
              </label>
              <span className="levels__actions">
                <button type="button" className="icon-button" aria-label="Subir" onClick={() => moveLevel(index, -1)} disabled={index === 0}>
                  ↑
                </button>
                <button
                  type="button"
                  className="icon-button"
                  aria-label="Descer"
                  onClick={() => moveLevel(index, 1)}
                  disabled={index === draft.promptHierarchy.length - 1}
                >
                  ↓
                </button>
                <button type="button" className="icon-button" aria-label="Remover" onClick={() => removeLevel(index)}>
                  ✕
                </button>
              </span>
            </li>
          ))}
        </ol>
        <button type="button" className="button button--small" onClick={addLevel} disabled={draft.promptHierarchy.length >= 8}>
          Adicionar nível
        </button>
      </Section>

      <Section title="Esvanecimento de dicas">
        <label className="field">
          <span>Estratégia</span>
          <select
            value={fading.strategy}
            onChange={(event) => update({ fading: defaultFading(event.target.value as Fading['strategy']) })}
          >
            {Object.entries(FADING_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        {fading.strategy === 'mais_para_menos' && (
          <NumberField
            label="Acertos seguidos para reduzir a dica"
            value={fading.advanceAfter}
            min={1}
            onChange={(advanceAfter) => update({ fading: { ...fading, advanceAfter } })}
          />
        )}
        {fading.strategy === 'atraso_constante' && (
          <div className="form-grid">
            <NumberField
              label="Tentativas com atraso 0 s"
              value={fading.zeroDelayTrials}
              onChange={(zeroDelayTrials) => update({ fading: { ...fading, zeroDelayTrials } })}
            />
            <NumberField
              label="Atraso depois"
              suffix="s"
              value={fading.delaySeconds}
              onChange={(delaySeconds) => update({ fading: { ...fading, delaySeconds } })}
            />
          </div>
        )}
        {fading.strategy === 'atraso_progressivo' && (
          <label className="field">
            <span>Passos de atraso em segundos (separados por vírgula)</span>
            <input
              defaultValue={fading.steps.join(', ')}
              onBlur={(event) =>
                update({
                  fading: {
                    ...fading,
                    steps: event.target.value
                      .split(',')
                      .map((s) => Number(s.trim()))
                      .filter((n) => Number.isFinite(n) && n >= 0),
                  },
                })
              }
            />
          </label>
        )}
        {fading.strategy === 'menos_para_mais' && (
          <p className="muted">A tentativa começa sem dica; a correção sobe um nível na hierarquia.</p>
        )}
      </Section>

      <Section title="Tempo e correção de erro">
        <div className="form-grid">
          <NumberField label="Latência máxima" suffix="s" value={draft.latencySeconds} min={1} onChange={(latencySeconds) => update({ latencySeconds })} />
          <NumberField label="Intervalo entre tentativas" suffix="s" value={draft.itiSeconds} onChange={(itiSeconds) => update({ itiSeconds })} />
          <label className="field">
            <span>Correção após erro</span>
            <select
              value={draft.errorCorrection.strategy}
              onChange={(event) =>
                update({
                  errorCorrection: {
                    ...draft.errorCorrection,
                    strategy: event.target.value as Program['errorCorrection']['strategy'],
                  },
                })
              }
            >
              {Object.entries(CORRECTION_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <NumberField
            label="Máximo de repetições após erro"
            value={draft.errorCorrection.maxRepetitions}
            max={5}
            onChange={(maxRepetitions) => update({ errorCorrection: { ...draft.errorCorrection, maxRepetitions } })}
          />
        </div>
      </Section>

      <Section title="Critério de domínio e manutenção">
        <div className="form-grid">
          <NumberField
            label="Percentual de acerto"
            suffix="%"
            value={draft.mastery.percent}
            min={1}
            max={100}
            onChange={(percent) => update({ mastery: { ...draft.mastery, percent } })}
          />
          <NumberField
            label="Sessões consecutivas"
            value={draft.mastery.consecutiveSessions}
            min={1}
            onChange={(consecutiveSessions) => update({ mastery: { ...draft.mastery, consecutiveSessions } })}
          />
          <label className="field">
            <span>Base de cálculo</span>
            <select
              value={draft.mastery.basis}
              onChange={(event) => update({ mastery: { ...draft.mastery, basis: event.target.value as 'todas' | 'primeira' } })}
            >
              <option value="primeira">Primeira tentativa de ensino da sessão</option>
              <option value="todas">Todas as tentativas de ensino</option>
            </select>
          </label>
          <label className="field">
            <span>Sondas de manutenção (dias após o domínio)</span>
            <input
              defaultValue={draft.maintenanceDays.join(', ')}
              onBlur={(event) =>
                update({
                  maintenanceDays: event.target.value
                    .split(',')
                    .map((s) => Number(s.trim()))
                    .filter((n) => Number.isFinite(n) && n > 0),
                })
              }
            />
          </label>
        </div>
      </Section>

      <Section title="Dose, intercalação e alertas">
        <div className="form-grid">
          <NumberField
            label="Tentativas por sessão"
            value={draft.limits.trialsPerSession}
            min={1}
            onChange={(trialsPerSession) => update({ limits: { ...draft.limits, trialsPerSession } })}
          />
          <NumberField
            label="Minutos por sessão"
            value={draft.limits.minutesPerSession}
            min={1}
            onChange={(minutesPerSession) => update({ limits: { ...draft.limits, minutesPerSession } })}
          />
          <NumberField
            label="Intercalar um dominado a cada"
            suffix="tentativas"
            value={draft.interleaveEvery}
            onChange={(interleaveEvery) => update({ interleaveEvery })}
          />
          {draft.operant === 'ouvinte' && (
            <NumberField label="Figuras na tela" value={draft.fieldSize} min={2} max={4} onChange={(fieldSize) => update({ fieldSize })} />
          )}
          <NumberField
            label="Alerta de dependência após"
            suffix="sessões"
            value={draft.dependencyAlertSessions}
            min={2}
            onChange={(dependencyAlertSessions) => update({ dependencyAlertSessions })}
          />
        </div>
      </Section>

      {errors.length > 0 && (
        <ul className="callout callout--warning" role="alert">
          {errors.map((error) => (
            <li key={error}>{error}</li>
          ))}
        </ul>
      )}
      <div className="row">
        <button type="button" className="button button--primary" onClick={() => void save()} disabled={errors.length > 0}>
          Salvar programa
        </button>
        <button type="button" className="button button--ghost" onClick={() => setDraft(structuredClone(program))}>
          Descartar alterações
        </button>
        {saved && (
          <span className="muted" role="status">
            Salvo. Os estados dos alvos foram recalculados com o histórico.
          </span>
        )}
      </div>
    </section>
  )
}
