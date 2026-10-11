import { useEffect, useRef, useState, type ReactNode, type RefObject } from 'react'
import type { StateChange } from '../../engine/mastery'
import { STATE_LABELS } from '../../engine/types'
import { formatDate, formatPercent } from '../../lib/format'

export interface ScorePoint {
  at: number
  percent: number
  trials: number
}

const PAD = { top: 30, right: 16, bottom: 32, left: 44 }

interface Frame {
  width: number
  height: number
  plotW: number
  plotH: number
  x: (index: number, count: number) => number
  y: (percent: number) => number
}

function makeFrame(width: number): Frame {
  const height = width < 480 ? 200 : 240
  const plotW = width - PAD.left - PAD.right
  const plotH = height - PAD.top - PAD.bottom
  return {
    width,
    height,
    plotW,
    plotH,
    x: (index, count) => (count <= 1 ? PAD.left + plotW / 2 : PAD.left + (index / (count - 1)) * plotW),
    y: (percent) => PAD.top + plotH - (percent / 100) * plotH,
  }
}

/** Mede a largura real do container para desenhar em pixels, sem escalar o texto. */
function useFrame(): [RefObject<HTMLDivElement | null>, Frame] {
  const ref = useRef<HTMLDivElement | null>(null)
  const [width, setWidth] = useState(640)
  useEffect(() => {
    const element = ref.current
    if (!element) return
    const observer = new ResizeObserver(([entry]) => setWidth(Math.max(280, Math.round(entry.contentRect.width))))
    observer.observe(element)
    return () => observer.disconnect()
  }, [])
  return [ref, makeFrame(width)]
}

function Tooltip({ x, y, frame, children }: { x: number; y: number; frame: Frame; children: ReactNode }) {
  const clampedX = Math.min(Math.max(x, 70), frame.width - 70)
  return (
    <div className="viz-tooltip" style={{ left: clampedX, top: y }} role="status">
      {children}
    </div>
  )
}

function YAxis({ frame }: { frame: Frame }) {
  return (
    <g className="viz-axis">
      {[0, 25, 50, 75, 100].map((tick) => (
        <g key={tick}>
          <line x1={PAD.left} x2={frame.width - PAD.right} y1={frame.y(tick)} y2={frame.y(tick)} className="viz-grid" />
          <text x={PAD.left - 8} y={frame.y(tick)} dy="0.32em" textAnchor="end">
            {tick}%
          </text>
        </g>
      ))}
    </g>
  )
}

/** Mostra só alguns rótulos de data quando há muitas sessões em tela estreita. */
function labelStep(count: number, plotW: number): number {
  const fit = Math.max(1, Math.floor(plotW / 52))
  return Math.max(1, Math.ceil(count / fit))
}

/** Percentual de acerto por sessão, com linha do critério e mudanças de fase. */
export function ScoreLineChart({
  points,
  criterion,
  changes,
  title,
}: {
  points: ScorePoint[]
  criterion: number
  changes: StateChange[]
  title: string
}) {
  const [ref, frame] = useFrame()
  const [hover, setHover] = useState<number | null>(null)
  const count = points.length

  const phaseX = (at: number): number | null => {
    const index = points.findIndex((p) => p.at > at)
    if (index === 0) return null
    if (index === -1) return frame.x(count - 1, count) + Math.min(12, frame.plotW / Math.max(1, count - 1) / 2)
    return (frame.x(index - 1, count) + frame.x(index, count)) / 2
  }
  const phases = changes
    .filter((c) => c.reason !== 'Início do ensino')
    .map((c) => ({ change: c, x: phaseX(c.at) }))
    .filter((p): p is { change: StateChange; x: number } => p.x !== null)
  const columnWidth = count > 1 ? frame.plotW / (count - 1) : frame.plotW
  const step = labelStep(count, frame.plotW)
  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${frame.x(i, count)},${frame.y(p.percent)}`).join(' ')

  return (
    <figure className="viz">
      <figcaption className="viz-title">{title}</figcaption>
      <div className="viz-frame" ref={ref}>
        {count === 0 ? (
          <p className="muted">Ainda não há sessões com tentativas de ensino deste alvo.</p>
        ) : (
          <svg
            width={frame.width}
            height={frame.height}
            viewBox={`0 0 ${frame.width} ${frame.height}`}
            role="img"
            aria-label={`${title}. ${count} sessões. Última: ${formatPercent(points[count - 1].percent)}.`}
          >
            <YAxis frame={frame} />
            <line
              x1={PAD.left}
              x2={frame.width - PAD.right}
              y1={frame.y(criterion)}
              y2={frame.y(criterion)}
              className="viz-criterion"
            />
            <text x={PAD.left + 6} y={frame.y(criterion) - 6} className="viz-label">
              Critério {criterion}%
            </text>
            {phases.map(({ change, x }) => {
              const nearRight = x > frame.width - 100
              return (
                <g key={change.at}>
                  <line x1={x} x2={x} y1={PAD.top - 8} y2={PAD.top + frame.plotH} className="viz-phase" />
                  <text x={nearRight ? x - 4 : x + 4} y={PAD.top - 14} textAnchor={nearRight ? 'end' : 'start'} className="viz-label">
                    {STATE_LABELS[change.state]}
                  </text>
                </g>
              )
            })}
            <path d={path} className="viz-line" />
            {points.map((p, i) => (
              <circle key={p.at} cx={frame.x(i, count)} cy={frame.y(p.percent)} r={hover === i ? 6 : 4.5} className="viz-dot" />
            ))}
            {points.map((p, i) =>
              i % step === 0 || i === count - 1 ? (
                <text key={`x-${p.at}`} x={frame.x(i, count)} y={frame.height - 10} textAnchor="middle" className="viz-axis-text">
                  {formatDate(p.at)}
                </text>
              ) : null,
            )}
            {hover !== null && (
              <line
                x1={frame.x(hover, count)}
                x2={frame.x(hover, count)}
                y1={PAD.top}
                y2={PAD.top + frame.plotH}
                className="viz-crosshair"
              />
            )}
            {points.map((p, i) => (
              <rect
                key={`hit-${p.at}`}
                x={frame.x(i, count) - columnWidth / 2}
                y={PAD.top}
                width={columnWidth}
                height={frame.plotH}
                fill="transparent"
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
                onTouchStart={() => setHover(i)}
              />
            ))}
          </svg>
        )}
        {hover !== null && points[hover] && (
          <Tooltip x={frame.x(hover, count)} y={frame.y(points[hover].percent)} frame={frame}>
            <strong>{formatDate(points[hover].at)}</strong>
            <span>{formatPercent(points[hover].percent)} de acerto</span>
            <span>{points[hover].trials} tentativas de ensino</span>
          </Tooltip>
        )}
      </div>
    </figure>
  )
}

export interface LevelSeries {
  id: string
  name: string
}

export interface LevelColumn {
  at: number
  counts: Record<string, number>
}

/** Distribuição dos níveis de dica por sessão (barras 100% empilhadas, rampa ordinal). */
export function PromptLevelChart({ levels, columns, title }: { levels: LevelSeries[]; columns: LevelColumn[]; title: string }) {
  const [ref, frame] = useFrame()
  const [hover, setHover] = useState<number | null>(null)
  const rampIndex = (i: number) => (levels.length <= 1 ? 7 : Math.round((i * 7) / (levels.length - 1)))
  const slot = frame.plotW / Math.max(1, columns.length)
  const barW = Math.max(6, Math.min(36, slot * 0.6))
  const GAP = 2
  const step = labelStep(columns.length, frame.plotW)

  return (
    <figure className="viz">
      <figcaption className="viz-title">{title}</figcaption>
      <ul className="viz-legend">
        {levels.map((level, i) => (
          <li key={level.id}>
            <span className="viz-swatch" style={{ background: `var(--ramp-${rampIndex(i)})` }} aria-hidden="true" />
            {level.name}
          </li>
        ))}
      </ul>
      <div className="viz-frame" ref={ref}>
        {columns.length === 0 ? (
          <p className="muted">Sem tentativas de ensino registradas.</p>
        ) : (
          <svg
            width={frame.width}
            height={frame.height}
            viewBox={`0 0 ${frame.width} ${frame.height}`}
            role="img"
            aria-label={`${title}. ${columns.length} sessões.`}
          >
            <YAxis frame={frame} />
            {columns.map((column, ci) => {
              const total = levels.reduce((sum, l) => sum + (column.counts[l.id] ?? 0), 0)
              const cx = PAD.left + slot * ci + slot / 2
              let cursor = PAD.top + frame.plotH
              // Independente embaixo, junto à linha de base; dicas mais intrusivas em cima.
              const segments = levels
                .map((level, li) => ({ level, li, value: column.counts[level.id] ?? 0 }))
                .reverse()
                .filter((s) => s.value > 0)
              return (
                <g key={column.at} opacity={hover === null || hover === ci ? 1 : 0.55}>
                  {segments.map((segment, si) => {
                    const h = total ? (segment.value / total) * frame.plotH : 0
                    const y = cursor - h
                    cursor = y
                    const isTop = si === segments.length - 1
                    const gap = isTop ? 0 : GAP
                    return (
                      <rect
                        key={segment.level.id}
                        x={cx - barW / 2}
                        y={y + gap}
                        width={barW}
                        height={Math.max(0, h - gap)}
                        rx={isTop ? 4 : 0}
                        style={{ fill: `var(--ramp-${rampIndex(segment.li)})` }}
                      />
                    )
                  })}
                  {(ci % step === 0 || ci === columns.length - 1) && (
                    <text x={cx} y={frame.height - 10} textAnchor="middle" className="viz-axis-text">
                      {formatDate(column.at)}
                    </text>
                  )}
                  <rect
                    x={cx - slot / 2}
                    y={PAD.top}
                    width={slot}
                    height={frame.plotH}
                    fill="transparent"
                    onMouseEnter={() => setHover(ci)}
                    onMouseLeave={() => setHover(null)}
                    onTouchStart={() => setHover(ci)}
                  />
                </g>
              )
            })}
          </svg>
        )}
        {hover !== null && columns[hover] && (
          <Tooltip x={PAD.left + slot * hover + slot / 2} y={PAD.top + 10} frame={frame}>
            <strong>{formatDate(columns[hover].at)}</strong>
            {levels.map((level) => (
              <span key={level.id}>
                {level.name}: {columns[hover].counts[level.id] ?? 0}
              </span>
            ))}
          </Tooltip>
        )}
      </div>
    </figure>
  )
}
