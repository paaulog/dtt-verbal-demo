import Dexie, { type EntityTable } from 'dexie'
import type { AssentEvent, Learner, Program, Reinforcer, Session, Target, Trial } from '../engine/types'
import { buildLibrary, learner, LEARNER_ID, reinforcers } from './library'
import { simulateHistory } from './simulate'

export interface Settings {
  key: 'settings'
  lowStimulation: boolean
  soundOn: boolean
  reinforcementMs: number
  conductor: string
}

export const DEFAULT_SETTINGS: Settings = {
  key: 'settings',
  lowStimulation: false,
  soundOn: true,
  reinforcementMs: 1500,
  conductor: 'Aplicador demo',
}

export class DemoDatabase extends Dexie {
  learners!: EntityTable<Learner, 'id'>
  programs!: EntityTable<Program, 'id'>
  targets!: EntityTable<Target, 'id'>
  sessions!: EntityTable<Session, 'id'>
  trials!: EntityTable<Trial, 'id'>
  assentEvents!: EntityTable<AssentEvent, 'id'>
  reinforcers!: EntityTable<Reinforcer, 'id'>
  settings!: EntityTable<Settings, 'key'>

  constructor(name = 'dtt-verbal-demo') {
    super(name)
    this.version(1).stores({
      learners: 'id',
      programs: 'id, learnerId',
      targets: 'id, programId',
      sessions: 'id, learnerId, startedAt',
      trials: 'id, sessionId, targetId, programId, timestamp',
      assentEvents: 'id, sessionId',
      reinforcers: 'id, learnerId',
      settings: 'key',
    })
  }
}

export const db = new DemoDatabase()

/** Apaga tudo e recarrega o aprendiz fictício com 10 sessões simuladas. */
export async function resetDemoData(database: DemoDatabase = db, now = Date.now()): Promise<void> {
  const { programs, targets } = buildLibrary()
  const history = simulateHistory(programs, targets, reinforcers, now)
  await database.transaction('rw', database.tables, async () => {
    await Promise.all(database.tables.map((table) => table.clear()))
    await database.learners.add({ ...learner, createdAt: now })
    await database.programs.bulkAdd(programs)
    await database.targets.bulkAdd(targets.map((t) => ({ ...t, createdAt: history.sessions[0]?.startedAt ?? now })))
    await database.reinforcers.bulkAdd(reinforcers)
    await database.sessions.bulkAdd(history.sessions)
    await database.trials.bulkAdd(history.trials)
    await database.assentEvents.bulkAdd(history.assentEvents)
    await database.settings.put(DEFAULT_SETTINGS)
  })
}

export async function ensureSeeded(database: DemoDatabase = db): Promise<void> {
  const count = await database.learners.count()
  if (count === 0) await resetDemoData(database)
}

export { LEARNER_ID }
