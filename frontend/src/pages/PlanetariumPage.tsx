import { useEffect, useMemo, useState, type FormEvent } from 'react'
import {
  api,
  type AuthUser,
  type GraphNode,
  type OntologySnapshot,
  type Providers,
} from '../api'
import Galaxy from '../components/Galaxy'

const CHIPS = [
  'who is listening',
  'remote access',
  'expiring certs',
  'cloud agents',
  'chatty outbound HTTPS',
  'database',
]

type Props = {
  user: AuthUser
  providers: Providers | null
  onLogout: () => void
}

export default function PlanetariumPage({ user, providers, onLogout }: Props) {
  const [snap, setSnap] = useState<OntologySnapshot | null>(null)
  const [ask, setAsk] = useState('who is listening')
  const [reason, setReason] = useState('full constellation')
  const [matchIds, setMatchIds] = useState<string[]>([])
  const [viewNodes, setViewNodes] = useState<GraphNode[]>([])
  const [viewEdges, setViewEdges] = useState<OntologySnapshot['edges']>([])
  const [selected, setSelected] = useState<GraphNode | null>(null)
  const [error, setError] = useState('')

  async function loadSnapshot() {
    const data = await api.snapshot()
    setSnap(data)
    setViewNodes(data.nodes)
    setViewEdges(data.edges)
    setMatchIds(data.nodes.map((n) => n.id))
    setReason('full constellation')
  }

  useEffect(() => {
    loadSnapshot().catch((e) => setError(e instanceof Error ? e.message : 'load failed'))
  }, [])

  async function runQuery(q: string) {
    setError('')
    setAsk(q)
    try {
      const result = await api.query(q)
      setViewNodes(result.nodes)
      setViewEdges(result.edges)
      setMatchIds(result.match_ids || result.nodes.map((n) => n.id))
      setReason(result.reason || 'query')
      setSelected(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'query failed')
    }
  }

  function onAsk(e: FormEvent) {
    e.preventDefault()
    void runQuery(ask)
  }

  const stats = useMemo(() => snap?.stats || {}, [snap])

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <img src="/ontos-mark.svg" alt="" />
          <h1>ONTOS PLANETARIUM</h1>
          {snap?.demo || providers?.demo_mode ? <span className="badge">DEMO DATA</span> : null}
        </div>
        <div className="user-meta">
          <span>
            {user.display_name || user.username} · {user.auth_provider} · {user.role}
          </span>
          <button className="btn" type="button" onClick={onLogout}>
            Sign out
          </button>
        </div>
      </header>

      <div className="main-stage">
        <aside className="panel">
          <h2>Ask the constellation</h2>
          <form className="ask-bar" onSubmit={onAsk}>
            <input
              value={ask}
              onChange={(e) => setAsk(e.target.value)}
              placeholder="who is listening"
              aria-label="English ontology query"
            />
            <button type="submit">Ask</button>
          </form>
          <div className="chips">
            {CHIPS.map((c) => (
              <button key={c} type="button" className="chip" onClick={() => void runQuery(c)}>
                {c}
              </button>
            ))}
          </div>

          <h2>Orbital telemetry</h2>
          <div className="stat-grid">
            <div className="stat">
              <div className="n">{String(stats.nodes ?? viewNodes.length)}</div>
              <div className="l">Nodes</div>
            </div>
            <div className="stat">
              <div className="n">{String(stats.edges ?? viewEdges.length)}</div>
              <div className="l">Edges</div>
            </div>
            <div className="stat">
              <div className="n">{String(stats.listeners ?? '—')}</div>
              <div className="l">Listeners</div>
            </div>
            <div className="stat">
              <div className="n">{String(stats.certs_expiring_30d ?? '—')}</div>
              <div className="l">Certs ≤30d</div>
            </div>
          </div>

          <div className="inspector-row" style={{ marginTop: '1rem' }}>
            <div className="k">Active lens</div>
            <div className="v">{reason}</div>
          </div>
          {error ? <p className="error">{error}</p> : null}
        </aside>

        <section className="galaxy-wrap">
          {viewNodes.length ? (
            <Galaxy
              nodes={viewNodes}
              edges={viewEdges}
              highlightIds={matchIds}
              selectedId={selected?.id ?? null}
              onSelect={setSelected}
            />
          ) : (
            <div className="login-card" style={{ margin: '2rem auto' }}>
              <p>Awaiting ontology feed…</p>
            </div>
          )}
        </section>

        <aside className="panel right">
          <h2>Inspector</h2>
          {selected ? (
            <>
              <div className="inspector-row">
                <div className="k">Label</div>
                <div className="v">{selected.label}</div>
              </div>
              <div className="inspector-row">
                <div className="k">Kind</div>
                <div className="v">{selected.kind}</div>
              </div>
              <div className="inspector-row">
                <div className="k">Node ID</div>
                <div className="v">{selected.id}</div>
              </div>
              {Object.entries(selected.meta || {}).map(([k, v]) => (
                <div className="inspector-row" key={k}>
                  <div className="k">{k}</div>
                  <div className="v">{String(v)}</div>
                </div>
              ))}
              <button
                className="btn"
                type="button"
                style={{ marginTop: '0.5rem' }}
                onClick={() => void runQuery(`blast ${selected.label}`)}
              >
                Blast radius
              </button>
            </>
          ) : (
            <div className="inspector-row">
              <div className="k">Selection</div>
              <div className="v">Click a star in the galaxy</div>
            </div>
          )}

          <h2 style={{ marginTop: '1.25rem' }}>Host</h2>
          <div className="inspector-row">
            <div className="k">Ontology host</div>
            <div className="v">{snap?.host || '—'}</div>
          </div>
          <div className="inspector-row">
            <div className="k">Viewer</div>
            <div className="v">{user.username}</div>
          </div>
        </aside>
      </div>
    </div>
  )
}
