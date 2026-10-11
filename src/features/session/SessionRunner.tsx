import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { db } from '../../data/db'
import { DISENGAGEMENT_NO_RESPONSE_STREAK } from '../../engine/defaults'
import { planShowsPrompt, promptLevelAt, resolvePromptLevel } from '../../engine/prompts'
import { nextTrialSpec, type TrialSpec } from '../../engine/runner'
import { combinedLimits, isDisengaged, limitReached, reduceField } from '../../engine/selection'
import { firstSyllable } from '../../engine/text'
import {
  OPERANT_LABELS,
  type AssentEvent,
  type Session,
  type SessionEnd,
  type Trial,
  type TrialResult,
} from '../../engine/types'
import type { DemoData } from '../../hooks/useDemoData'
import { newId } from '../../lib/format'
import { speak, stopSpeaking } from '../../lib/speech'

type Phase = 'ready' | 'presenting' | 'consequence' | 'iti' | 'paused'

interface Props {
  data: DemoData
  programIds: string[]
  conductor: string
  onFinish: (sessionId: string) => void
}

const TYPE_LABELS: Record<Trial['type'], string> = {
  ensino: 'Ensino',
  correcao: 'Correção',
  intercalada: 'Intercalada (dominado)',
  manutencao: 'Sonda de manutenção',
}

function clock(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000))
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`
}

export function SessionRunner({ data, programIds, conductor, onFinish }: Props) {
  const programs = useMemo(() => data.programs.filter((p) => programIds.includes(p.id)), [data.programs, programIds])
  const targets = useMemo(
    () => data.targets.filter((t) => programIds.includes(t.programId)),
    [data.targets, programIds],
  )
  const limits = useMemo(() => combinedLimits(programs), [programs])
  const { settings, reinforcers, learner } = data

  const [session] = useState<Session>(() => ({
    id: newId('sessao'),
    learnerId: learner!.id,
    programIds,
    startedAt: Date.now(),
    endedAt: null,
    conductedBy: conductor,
    context: 'tela',
    ending: null,
  }))
  const [sessionTrials, setSessionTrials] = useState<Trial[]>([])
  const [spec, setSpec] = useState<TrialSpec | null | undefined>(undefined)
  const [phase, setPhase] = useState<Phase>('ready')
  const [promptShown, setPromptShown] = useState(false)
  const [visibleOptions, setVisibleOptions] = useState<string[]>([])
  const [outcome, setOutcome] = useState<{ result: TrialResult; message: string } | null>(null)
  const [signalPicker, setSignalPicker] = useState(false)
  const [disengageDismissedAt, setDisengageDismissedAt] = useState(-1)
  const [now, setNow] = useState(Date.now())

  const timers = useRef<number[]>([])
  const presentedAt = useRef(0)
  const promptShownRef = useRef(false)
  const deleted = useRef(new Set<string>())
  const finished = useRef(false)

  const clearTimers = () => {
    timers.current.forEach((id) => window.clearTimeout(id))
    timers.current = []
  }
  const later = (fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms))
  }

  const mergedTrials = useCallback(
    (current: Trial[]) => {
      const ids = new Set(current.map((t) => t.id))
      const stored = data.trials.filter((t) => !ids.has(t.id) && !deleted.current.has(t.id))
      return [...stored, ...current]
    },
    [data.trials],
  )

  const computeNext = useCallback(
    (current: Trial[]) =>
      nextTrialSpec({
        programs,
        targets,
        allTrials: mergedTrials(current),
        sessionTrials: current,
        now: Date.now(),
        random: Math.random,
      }),
    [programs, targets, mergedTrials],
  )

  const finish = useCallback(
    async (ending: SessionEnd) => {
      if (finished.current) return
      finished.current = true
      clearTimers()
      stopSpeaking()
      await db.sessions.update(session.id, { endedAt: Date.now(), ending })
      onFinish(session.id)
    },
    [onFinish, session.id],
  )

  useEffect(() => {
    void db.sessions.add(session)
    setSpec(computeNext([]))
    return () => {
      clearTimers()
      stopSpeaking()
    }
    // A sessão é criada uma única vez, na montagem.
  }, [])

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(interval)
  }, [])

  useEffect(() => {
    if (phase === 'ready' && limitReached(limits, sessionTrials.length, session.startedAt, now) === 'minutos') {
      void finish('limite')
    }
  }, [now, phase, limits, sessionTrials.length, session.startedAt, finish])

  const level = spec ? promptLevelAt(spec.program, spec.plan.promptLevelIndex) : null
  const plannedPrompt = spec ? planShowsPrompt(spec.program, spec.plan) : false

  const applyPrompt = (current: TrialSpec) => {
    const promptLevel = promptLevelAt(current.program, current.plan.promptLevelIndex)
    promptShownRef.current = true
    setPromptShown(true)
    if (promptLevel.type === 'audio_total') later(() => speak(current.target.response, settings.soundOn), 900)
    if (promptLevel.type === 'audio_parcial')
      later(() => speak(firstSyllable(current.target.response), settings.soundOn), 900)
    if (promptLevel.type === 'reducao_campo') setVisibleOptions(reduceField(current.options, current.target.id))
  }

  const present = () => {
    if (!spec) return
    clearTimers()
    presentedAt.current = Date.now()
    promptShownRef.current = false
    setPromptShown(false)
    setOutcome(null)
    setVisibleOptions(spec.options)
    setPhase('presenting')
    if (spec.program.operant !== 'mando') speak(spec.target.sdSpeech, settings.soundOn)
    if (planShowsPrompt(spec.program, spec.plan)) {
      if (spec.plan.delaySeconds === 0) applyPrompt(spec)
      else later(() => applyPrompt(spec), spec.plan.delaySeconds * 1000)
    }
  }

  const record = (result: TrialResult) => {
    if (!spec || phase !== 'presenting') return
    clearTimers()
    stopSpeaking()
    const resolved = resolvePromptLevel(spec.program, spec.plan, promptShownRef.current, result)
    const top = reinforcers.find((r) => r.active)
    let reinforcer: string | null = null
    let message: string
    if (result !== 'correta') {
      message = 'Sem reforço. Siga para a próxima tentativa.'
    } else if (spec.program.operant === 'mando') {
      reinforcer = spec.target.item ?? spec.target.label
      message = `Entregue ${reinforcer} agora.`
    } else if (resolved.independent && top) {
      reinforcer = top.name
      message = `Resposta independente. Reforçador: ${top.name}.`
    } else {
      reinforcer = 'Elogio'
      message = 'Resposta com dica. Elogie.'
    }
    const trial: Trial = {
      id: newId('tentativa'),
      sessionId: session.id,
      targetId: spec.target.id,
      programId: spec.program.id,
      operant: spec.program.operant,
      type: spec.type,
      exemplar: spec.exemplar,
      options: visibleOptions,
      promptLevelId: resolved.promptLevelId,
      promptDelaySeconds: spec.plan.delaySeconds,
      latencyMs: Date.now() - presentedAt.current,
      result,
      independent: resolved.independent,
      correctionApplied: spec.type === 'correcao' ? spec.program.errorCorrection.strategy : null,
      reinforcer,
      timestamp: Date.now(),
    }
    const updated = [...sessionTrials, trial]
    setSessionTrials(updated)
    void db.trials.add(trial)
    setOutcome({ result, message })
    setPhase('consequence')
    const consequenceMs = result === 'correta' ? Math.max(600, settings.reinforcementMs) : 900
    later(() => {
      setPhase('iti')
      later(() => {
        const reached = limitReached(limits, updated.length, session.startedAt, Date.now())
        if (reached) {
          void finish('limite')
          return
        }
        const next = computeNext(updated)
        if (!next) {
          void finish('normal')
          return
        }
        setSpec(next)
        setPhase('ready')
      }, spec.program.itiSeconds * 1000)
    }, consequenceMs)
  }

  const pause = async (kind: AssentEvent['kind'], signal = '') => {
    clearTimers()
    stopSpeaking()
    setSignalPicker(false)
    setPhase('paused')
    await db.assentEvents.add({ id: newId('assentimento'), sessionId: session.id, kind, signal, timestamp: Date.now() })
  }

  const resume = () => {
    setOutcome(null)
    setPhase('ready')
  }

  const undo = async () => {
    const last = sessionTrials[sessionTrials.length - 1]
    if (!last) return
    clearTimers()
    stopSpeaking()
    deleted.current.add(last.id)
    await db.trials.delete(last.id)
    const remaining = sessionTrials.slice(0, -1)
    setSessionTrials(remaining)
    setOutcome(null)
    setSpec(computeNext(remaining))
    setPhase('ready')
  }

  const disengaged = isDisengaged(sessionTrials) && sessionTrials.length !== disengageDismissedAt
  const elapsed = now - session.startedAt

  if (spec === undefined) return <p className="muted">Preparando a sessão…</p>

  if (spec === null && sessionTrials.length === 0) {
    return (
      <div className="stack narrow">
        <p className="callout callout--warning">
          Os programas escolhidos não têm alvos em aquisição nem dominados. Inicie o ensino de algum alvo na aba Programas.
        </p>
        <button type="button" className="button" onClick={() => void finish('normal')}>
          Voltar
        </button>
      </div>
    )
  }

  const current = spec!
  const target = current.target
  const operant = current.program.operant
  const promptVisible = phase === 'presenting' && promptShown
  const targetById = new Map(targets.map((t) => [t.id, t]))
  const lowStim = settings.lowStimulation

  return (
    <div className={`session ${lowStim ? 'session--low' : ''}`}>
      <section className="child-area" aria-label="Área da criança">
        <button
          type="button"
          className="pause-button"
          onClick={() => void pause('pausa_crianca')}
          disabled={phase === 'paused'}
        >
          <span aria-hidden="true">✋</span> Pausa
        </button>

        {phase === 'paused' && (
          <div className="child-calm">
            <span className="child-calm__icon" aria-hidden="true">
              ✋
            </span>
            <p>Pausa</p>
          </div>
        )}

        {(phase === 'ready' || phase === 'iti') && <div className="child-idle" aria-hidden="true" />}

        {phase === 'presenting' && operant === 'ouvinte' && (
          <div className={`options options--${visibleOptions.length}`}>
            {visibleOptions.map((id, index) => {
              const option = targetById.get(id)
              if (!option) return null
              const emoji = id === target.id ? current.exemplar : option.exemplars[(sessionTrials.length + index) % option.exemplars.length]
              const highlighted = promptVisible && level?.type === 'destaque' && id === target.id
              return (
                <button
                  key={id}
                  type="button"
                  className={`option ${highlighted ? 'option--highlight' : ''}`}
                  aria-label={option.label}
                  onClick={() => record(id === target.id ? 'correta' : 'incorreta')}
                >
                  <span aria-hidden="true">{emoji}</span>
                </button>
              )
            })}
          </div>
        )}

        {phase === 'presenting' && operant !== 'ouvinte' && (
          <div className="stimulus">
            {operant === 'tato' && <span className="stimulus__emoji">{current.exemplar}</span>}
            {operant === 'ecoico' && (
              <button
                type="button"
                className="stimulus__emoji stimulus__replay"
                aria-label="Ouvir de novo"
                onClick={() => speak(target.sdSpeech, settings.soundOn)}
              >
                🔊
              </button>
            )}
            {operant === 'intraverbal' && <span className="stimulus__emoji">💬</span>}
            {operant === 'mando' && !promptVisible && <span className="stimulus__empty" />}
            {promptVisible && level?.type === 'figura' && (
              <span className="stimulus__prompt">
                {operant === 'intraverbal' || operant === 'mando' ? (
                  <span className="stimulus__emoji stimulus__emoji--small">{target.item && operant === 'intraverbal' ? target.item : current.exemplar}</span>
                ) : (
                  <span className="stimulus__word">{target.response}</span>
                )}
              </span>
            )}
          </div>
        )}

        {phase === 'consequence' && outcome?.result === 'correta' && (
          <div className={lowStim || settings.reinforcementMs === 0 ? 'reward reward--calm' : 'reward'} aria-hidden="true">
            {lowStim || settings.reinforcementMs === 0 ? '✓' : '★'}
          </div>
        )}
        {phase === 'consequence' && outcome?.result !== 'correta' && <div className="child-idle" aria-hidden="true" />}
      </section>

      <aside className="adult-bar" aria-label="Controles do adulto">
        <div className="adult-bar__meta">
          <span>
            Tentativa {Math.min(sessionTrials.length + 1, limits.trialsPerSession)} de {limits.trialsPerSession}
          </span>
          <span>
            {clock(elapsed)} de {limits.minutesPerSession}:00
          </span>
        </div>

        {disengaged && phase !== 'paused' && (
          <div className="callout callout--warning" role="status">
            <p>
              <strong>Sugestão:</strong> {DISENGAGEMENT_NO_RESPONSE_STREAK} tentativas seguidas sem resposta. Considere pausar.
            </p>
            <div className="row">
              <button type="button" className="button" onClick={() => void pause('desengajamento')}>
                Pausar
              </button>
              <button type="button" className="button button--ghost" onClick={() => setDisengageDismissedAt(sessionTrials.length)}>
                Continuar
              </button>
            </div>
          </div>
        )}

        {phase === 'paused' ? (
          <div className="stack-sm">
            <p className="adult-bar__title">Sessão em pausa</p>
            <p className="muted">O evento foi registrado. Retome só se a criança estiver disponível.</p>
            <button type="button" className="button button--primary button--large" onClick={resume}>
              Retomar
            </button>
            <button type="button" className="button" onClick={() => void finish('pausa')}>
              Encerrar sessão
            </button>
          </div>
        ) : (
          <>
            <div className="trial-card">
              <p className="trial-card__program">
                {current.program.name} · {OPERANT_LABELS[operant]}
              </p>
              <p className="adult-bar__title">{target.label}</p>
              <p>
                <span className={`badge ${current.type === 'ensino' ? 'badge--neutral' : 'badge--info'}`}>
                  {TYPE_LABELS[current.type]}
                </span>
              </p>
              {operant === 'mando' ? (
                <p>
                  Deixe <strong>{target.item ?? target.label}</strong> à vista e fora do alcance. Espere a criança pedir.
                </p>
              ) : (
                <p>
                  Instrução (falada pelo app): <strong>“{target.sdText}”</strong>
                </p>
              )}
              <p>
                Resposta esperada: <strong>{target.response}</strong>
              </p>
              <p className="muted">
                {plannedPrompt
                  ? `Dica: ${level?.name}${current.plan.delaySeconds > 0 ? ` após ${current.plan.delaySeconds} s` : ' junto com a instrução'}`
                  : 'Sem dica nesta tentativa'}
              </p>
              {promptVisible && level?.executedBy === 'adulto' && (
                <p className="callout callout--info" role="status">
                  Faça agora: {level.type === 'gestual' ? `aponte para ${target.label}` : `ajude fisicamente a tocar em ${target.label}`}.
                </p>
              )}
              {promptVisible && (level?.type === 'audio_total' || level?.type === 'audio_parcial') && (
                <p className="callout callout--info" role="status">
                  Dica dada: “{level.type === 'audio_total' ? target.response : firstSyllable(target.response)}”
                </p>
              )}
            </div>

            {phase === 'ready' && (
              <button type="button" className="button button--primary button--large" onClick={present}>
                Apresentar
              </button>
            )}

            {phase === 'presenting' && operant !== 'ouvinte' && (
              <div className="score">
                <button type="button" className="score__button score__button--ok" onClick={() => record('correta')}>
                  Correta
                </button>
                <button type="button" className="score__button score__button--wrong" onClick={() => record('incorreta')}>
                  Incorreta
                </button>
                <button type="button" className="score__button" onClick={() => record('sem_resposta')}>
                  Sem resposta
                </button>
              </div>
            )}

            {phase === 'presenting' && operant === 'ouvinte' && (
              <div className="stack-sm">
                <p className="muted">A criança responde tocando na figura.</p>
                <button type="button" className="score__button" onClick={() => record('sem_resposta')}>
                  Sem resposta
                </button>
              </div>
            )}

            {(phase === 'consequence' || phase === 'iti') && outcome && (
              <p className={`callout ${outcome.result === 'correta' ? 'callout--ok' : 'callout--neutral'}`} role="status">
                {outcome.message}
              </p>
            )}
          </>
        )}

        <div className="adult-bar__footer">
          {signalPicker ? (
            <div className="stack-sm">
              <p className="adult-bar__title">Qual sinal você observou?</p>
              {(learner?.assentSignals ?? []).map((signal) => (
                <button key={signal} type="button" className="button" onClick={() => void pause('retirada_sinal', signal)}>
                  {signal}
                </button>
              ))}
              <button type="button" className="button button--ghost" onClick={() => setSignalPicker(false)}>
                Cancelar
              </button>
            </div>
          ) : (
            <>
              <button type="button" className="button button--warning" onClick={() => setSignalPicker(true)}>
                Sinal de retirada de assentimento
              </button>
              <div className="row">
                <button
                  type="button"
                  className="button button--ghost"
                  onClick={() => void undo()}
                  disabled={sessionTrials.length === 0 || phase === 'consequence' || phase === 'iti'}
                >
                  Desfazer última
                </button>
                <button type="button" className="button button--ghost" onClick={() => void finish('normal')}>
                  Encerrar
                </button>
              </div>
            </>
          )}
        </div>
      </aside>
    </div>
  )
}
