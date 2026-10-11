import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo } from 'react'
import { db, DEFAULT_SETTINGS, type Settings } from '../data/db'
import type { TargetStatus } from '../engine/mastery'
import { statusMap } from '../engine/runner'
import type { AssentEvent, Learner, Operant, Program, Reinforcer, Session, Target, Trial } from '../engine/types'

const PROGRAM_ORDER: Operant[] = ['ouvinte', 'tato', 'ecoico', 'intraverbal', 'mando']

export interface DemoData {
  learner: Learner | undefined
  programs: Program[]
  targets: Target[]
  sessions: Session[]
  trials: Trial[]
  assentEvents: AssentEvent[]
  reinforcers: Reinforcer[]
  settings: Settings
  statuses: Map<string, TargetStatus>
}

export function useDemoData(): DemoData | null {
  const raw = useLiveQuery(async () => {
    const [learners, programs, targets, sessions, trials, assentEvents, reinforcers, settings] = await Promise.all([
      db.learners.toArray(),
      db.programs.toArray(),
      db.targets.toArray(),
      db.sessions.orderBy('startedAt').toArray(),
      db.trials.orderBy('timestamp').toArray(),
      db.assentEvents.toArray(),
      db.reinforcers.toArray(),
      db.settings.get('settings'),
    ])
    return { learner: learners[0], programs, targets, sessions, trials, assentEvents, reinforcers, settings }
  })

  return useMemo(() => {
    if (!raw || !raw.learner) return null
    const statuses = statusMap(raw.programs, raw.targets, raw.trials, Date.now())
    return {
      ...raw,
      programs: [...raw.programs].sort((a, b) => PROGRAM_ORDER.indexOf(a.operant) - PROGRAM_ORDER.indexOf(b.operant)),
      reinforcers: [...raw.reinforcers].sort((a, b) => a.rank - b.rank),
      settings: raw.settings ?? DEFAULT_SETTINGS,
      statuses,
    }
  }, [raw])
}
