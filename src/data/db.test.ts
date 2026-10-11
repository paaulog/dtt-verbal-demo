import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import { DemoDatabase, ensureSeeded, resetDemoData } from './db'

describe('banco local', () => {
  it('semeia uma vez e restaura os dados de exemplo', async () => {
    const database = new DemoDatabase('teste-db')
    await ensureSeeded(database)
    const trials = await database.trials.count()
    expect(await database.learners.count()).toBe(1)
    expect(await database.programs.count()).toBe(5)
    expect(trials).toBeGreaterThan(100)

    await database.trials.clear()
    await ensureSeeded(database)
    expect(await database.trials.count()).toBe(0)

    await resetDemoData(database)
    expect(await database.trials.count()).toBeGreaterThan(100)
    expect((await database.settings.get('settings'))?.soundOn).toBe(true)
    database.close()
  })
})
