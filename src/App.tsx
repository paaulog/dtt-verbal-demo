import { useEffect, useState } from 'react'
import { ensureSeeded } from './data/db'
import { DEMO_NOTICE } from './engine/notice'
import { ChartsView } from './features/charts/ChartsView'
import { DataView } from './features/data/DataView'
import { HomeView } from './features/home/HomeView'
import { ProgramsView } from './features/programs/ProgramsView'
import { ReinforcersView } from './features/reinforcers/ReinforcersView'
import { SessionView } from './features/session/SessionView'
import { useDemoData } from './hooks/useDemoData'

export type Tab = 'inicio' | 'sessao' | 'programas' | 'graficos' | 'reforcadores' | 'dados'

const TABS: Array<{ id: Tab; label: string }> = [
  { id: 'inicio', label: 'Início' },
  { id: 'sessao', label: 'Sessão' },
  { id: 'programas', label: 'Programas' },
  { id: 'graficos', label: 'Gráficos' },
  { id: 'reforcadores', label: 'Reforçadores' },
  { id: 'dados', label: 'Dados' },
]

function tabFromHash(): Tab {
  const hash = window.location.hash.replace('#', '') as Tab
  return TABS.some((tab) => tab.id === hash) ? hash : 'inicio'
}

export default function App() {
  const [tab, setTab] = useState<Tab>(tabFromHash)
  const [seedError, setSeedError] = useState<string | null>(null)
  const [sessionActive, setSessionActive] = useState(false)
  const data = useDemoData()

  useEffect(() => {
    ensureSeeded().catch((error: unknown) => {
      setSeedError(error instanceof Error ? error.message : String(error))
    })
  }, [])

  useEffect(() => {
    const onHash = () => setTab(tabFromHash())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  const go = (next: Tab) => {
    window.location.hash = next
    setTab(next)
  }

  return (
    <div className={`app ${sessionActive ? 'app--session' : ''}`}>
      <div className="demo-banner" role="note">
        {DEMO_NOTICE}
      </div>
      {!sessionActive && (
        <header className="topbar">
          <div className="brand">
            <span className="brand__mark" aria-hidden="true" />
            <span>DTT Verbal</span>
            {data?.learner && <span className="brand__learner">{data.learner.nickname}</span>}
          </div>
          <nav className="tabs" aria-label="Seções">
            {TABS.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`tabs__item ${tab === item.id ? 'is-active' : ''}`}
                aria-current={tab === item.id ? 'page' : undefined}
                onClick={() => go(item.id)}
              >
                {item.label}
              </button>
            ))}
          </nav>
        </header>
      )}
      <main className={sessionActive ? 'main main--session' : 'main'}>
        {seedError && (
          <p className="callout callout--warning" role="alert">
            Não foi possível abrir o banco local do navegador: {seedError}. Verifique se o navegador permite
            armazenamento local (o modo privado pode bloquear).
          </p>
        )}
        {!data && !seedError && <p className="muted">Carregando dados de exemplo…</p>}
        {data && tab === 'inicio' && <HomeView data={data} onNavigate={go} />}
        {data && tab === 'sessao' && <SessionView data={data} onActiveChange={setSessionActive} onNavigate={go} />}
        {data && tab === 'programas' && <ProgramsView data={data} />}
        {data && tab === 'graficos' && <ChartsView data={data} />}
        {data && tab === 'reforcadores' && <ReinforcersView data={data} />}
        {data && tab === 'dados' && <DataView data={data} />}
      </main>
    </div>
  )
}
