import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import {
  api,
  type AuthUser,
  type GraphNode,
  type OntologySnapshot,
  type Providers,
} from '../api'
import Galaxy, { type GalaxyHandle } from '../components/Galaxy'

type Props = {
  user: AuthUser
  providers: Providers | null
  onLogout: () => void
}

const EXPLORE = [
  { key: 'ssh', label: 'SSH', port: '22', query: 'ssh' },
  { key: 'rdp', label: 'RDP', port: '3389', query: 'rdp' },
  { key: 'tls', label: 'TLS / CERTS', port: '443', query: 'tls certs' },
  { key: 'blast', label: 'BLAST RADIUS', port: '', query: 'blast api-gateway' },
]

export default function PlanetariumPage({ user, providers, onLogout }: Props) {
  const galaxyRef = useRef<GalaxyHandle>(null)
  const [snap, setSnap] = useState<OntologySnapshot | null>(null)
  const [ask, setAsk] = useState('who is listening')
  const [reason, setReason] = useState('full constellation')
  const [matchIds, setMatchIds] = useState<string[]>([])
  const [viewNodes, setViewNodes] = useState<GraphNode[]>([])
  const [viewEdges, setViewEdges] = useState<OntologySnapshot['edges']>([])
  const [selected, setSelected] = useState<GraphNode | null>(null)
  const [activeExplore, setActiveExplore] = useState<string | null>(null)
  const [layers, setLayers] = useState({
    host: true,
    service: true,
    listener: true,
    flow: true,
    ownership: true,
  })
  const [error, setError] = useState('')
  const [now] = useState(() => new Date('2024-05-20T14:31:42'))

  async function loadSnapshot() {
    const data = await api.snapshot()
    setSnap(data)
    setViewNodes(data.nodes)
    setViewEdges(data.edges)
    setMatchIds(data.nodes.map((n) => n.id))
    setReason('full constellation')
    const hub = data.nodes.find((n) => n.label === 'api-gateway-01')
    if (hub) setSelected(hub)
  }

  useEffect(() => {
    loadSnapshot().catch((e) => setError(e instanceof Error ? e.message : 'load failed'))
  }, [])

  async function runQuery(q: string, exploreKey?: string) {
    setError('')
    setAsk(q)
    setActiveExplore(exploreKey ?? null)
    try {
      const result = await api.query(q)
      setViewNodes(result.nodes)
      setViewEdges(result.edges)
      setMatchIds(result.match_ids || result.nodes.map((n) => n.id))
      setReason(result.reason || 'query')
      const hub = result.nodes.find((n) => n.label === 'api-gateway-01')
      if (hub) setSelected(hub)
      else if (result.nodes[0]) setSelected(result.nodes[0])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'query failed')
    }
  }

  function onAsk(e: FormEvent) {
    e.preventDefault()
    void runQuery(ask)
  }

  const filteredNodes = useMemo(() => {
    return viewNodes.filter((n) => {
      if (n.kind === 'host' && !layers.host) return false
      if (n.kind === 'service' && !layers.service) return false
      if ((n.kind === 'listener' || n.kind === 'endpoint' || n.kind === 'cert') && !layers.listener)
        return false
      return true
    })
  }, [viewNodes, layers])

  const filteredEdges = useMemo(() => {
    const ids = new Set(filteredNodes.map((n) => n.id))
    return viewEdges.filter((e) => {
      if (!layers.flow && (e.kind === 'established' || e.kind === 'route')) return false
      return ids.has(e.source) && ids.has(e.target)
    })
  }, [viewEdges, filteredNodes, layers.flow])

  const stats = snap?.stats || {}
  const meta = selected?.meta || {}
  const displayEmail = user.email || 'analyst@ontos.ai'
  const displayRole = user.role || 'Viewer'
  const avatarLetter = (displayEmail[0] || 'A').toUpperCase()
  const inbound = viewEdges.filter((e) => e.target === selected?.id).length
  const outbound = viewEdges.filter((e) => e.source === selected?.id).length

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <img src="/ontos-mark.svg" alt="" />
          <span className="name">ONTOS Planetarium</span>
          {(snap?.demo || providers?.demo_mode) && <span className="badge-demo">DEMO</span>}
        </div>
        <div className="top-title">Living Network Planetarium</div>
        <div className="top-right">
          <button className="icon-btn" type="button" title="Search" aria-label="Search">
            <IconSearch />
          </button>
          <button className="icon-btn" type="button" title="Fullscreen" aria-label="Fullscreen">
            <IconFullscreen />
          </button>
          <button className="icon-btn" type="button" title="Documentation" aria-label="Documentation">
            <IconBook />
          </button>
          <button className="icon-btn" type="button" title="Notifications" aria-label="Notifications">
            <IconBell />
          </button>
          <div className="user-chip">
            <span className="avatar">{avatarLetter}</span>
            <span className="user-meta">
              <span className="user-email">{displayEmail}</span>
              <span className="user-role">{displayRole}</span>
            </span>
            <button className="icon-btn" type="button" onClick={onLogout} title="Sign out">
              ⎋
            </button>
          </div>
        </div>
      </header>

      <div className="main-stage">
        <aside className="panel">
          <form className="ask-bar" onSubmit={onAsk}>
            <span className="ask-prefix">ask:</span>
            <input
              value={ask}
              onChange={(e) => setAsk(e.target.value)}
              placeholder="who is listening"
              aria-label="English ontology query"
            />
            <button type="submit">Ask</button>
          </form>

          <div className="section-label">Explore</div>
          <div className="explore-grid">
            {EXPLORE.map((item) => (
              <button
                key={item.key}
                type="button"
                className={`explore-card ${activeExplore === item.key ? 'active' : ''}`}
                onClick={() => void runQuery(item.query, item.key)}
              >
                <div className="k">{item.label}</div>
                <div className="v">
                  {item.key === 'blast' ? (
                    <span className="blast-glyph" aria-hidden>
                      ◎
                    </span>
                  ) : (
                    <>
                      {item.port} <small>ports</small>
                    </>
                  )}
                </div>
              </button>
            ))}
          </div>

          <div className="section-label">Layers</div>
          {(
            [
              ['host', 'Hosts', stats.hosts ?? 0, 'host'],
              ['service', 'Services', stats.services ?? 0, 'service'],
              ['listener', 'Listeners', stats.listeners ?? 0, 'listener'],
              ['flow', 'Flows', stats.flows ?? 0, 'flow'],
              ['ownership', 'Ownership', stats.ownership ?? 0, 'own'],
            ] as const
          ).map(([key, label, count, dot]) => (
            <div className="layer-row" key={key}>
              <div className="left">
                <span className={`dot ${dot}`} />
                <span>
                  {label} <strong className="layer-count">{String(count)}</strong>
                </span>
              </div>
              <button
                type="button"
                className={`eye ${layers[key] ? 'on' : ''}`}
                onClick={() => setLayers((L) => ({ ...L, [key]: !L[key] }))}
                aria-label={`Toggle ${label}`}
              >
                {layers[key] ? '👁' : '–'}
              </button>
            </div>
          ))}

          <div className="section-label">Filters</div>
          {['Environment', 'Criticality', 'Ownership', 'Data Sensitivity'].map((f) => (
            <div className="filter-row" key={f}>
              <span>{f}</span>
              <select defaultValue="All" aria-label={f}>
                <option>All</option>
              </select>
            </div>
          ))}
          <button
            type="button"
            className="clear-filters"
            onClick={() => void runQuery('full constellation')}
          >
            Clear Filters
          </button>
          {error ? <p className="error">{error}</p> : null}
        </aside>

        <section className="galaxy-wrap">
          <div className="starfield" aria-hidden />
          <div className="legend">
            <span>
              <i className="dot host" /> Hosts
            </span>
            <span>
              <i className="dot service" /> Services
            </span>
            <span>
              <i className="dot listener" /> Listeners
            </span>
            <span>
              <i className="dot flow" /> Edges
            </span>
          </div>

          {filteredNodes.length ? (
            <Galaxy
              ref={galaxyRef}
              nodes={filteredNodes}
              edges={filteredEdges}
              highlightIds={matchIds}
              selectedId={selected?.id ?? null}
              onSelect={setSelected}
            />
          ) : (
            <div className="login-card" style={{ margin: '2rem auto' }}>
              <p>Awaiting ontology feed…</p>
            </div>
          )}

          <div className="zoom-controls">
            <button type="button" title="Recenter" onClick={() => galaxyRef.current?.recenter()}>
              ◎
            </button>
            <button type="button" title="Zoom in" onClick={() => galaxyRef.current?.zoomIn()}>
              +
            </button>
            <button type="button" title="Zoom out" onClick={() => galaxyRef.current?.zoomOut()}>
              −
            </button>
            <button
              type="button"
              title="Reset view"
              onClick={() => void runQuery('full constellation')}
            >
              ⤢
            </button>
          </div>
          <div className="minimap" aria-hidden>
            <Minimap nodes={filteredNodes} edges={filteredEdges} />
          </div>
        </section>

        <aside className="panel right">
          <div className="inspector-title">
            <span>Selected Node</span>
            <button
              type="button"
              className="icon-btn"
              title="Close"
              onClick={() => setSelected(null)}
            >
              ×
            </button>
          </div>
          {selected ? (
            <>
              <div className="inspector-head">
                <div className={`node-glyph ${selected.kind}`}>
                  <Glyph kind={selected.kind} icon={String(meta.icon || '')} />
                </div>
                <div>
                  <h2>{selected.label}</h2>
                  <div className="status-pill">
                    <span className="sdot" />
                    {selected.kind === 'service' ? 'Service' : selected.kind} ·{' '}
                    {String(meta.status || 'Healthy')}
                  </div>
                </div>
              </div>
              <div className="action-row">
                <button type="button" onClick={() => setMatchIds([selected.id])}>
                  Focus
                </button>
                <button type="button" onClick={() => setMatchIds(viewNodes.map((n) => n.id))}>
                  Trace
                </button>
                <button
                  type="button"
                  onClick={() => void runQuery(`blast ${selected.label}`, 'blast')}
                >
                  Blast Radius
                </button>
                <button type="button">More</button>
              </div>

              <div className="section-label">Overview</div>
              <div className="kv">
                <span className="k">Type</span>
                <span className="v">{selected.kind}</span>
              </div>
              <div className="kv">
                <span className="k">Role</span>
                <span className="v">{String(meta.role || selected.kind)}</span>
              </div>
              <div className="kv">
                <span className="k">Environment</span>
                <span className="v">{String(meta.env || 'Prod')}</span>
              </div>
              <div className="kv">
                <span className="k">Criticality</span>
                <span className={`v ${meta.criticality === 'High' ? 'crit-high' : ''}`}>
                  {String(meta.criticality || 'Medium')}
                </span>
              </div>
              <div className="kv">
                <span className="k">Status</span>
                <span className="v status-ok-text">{String(meta.status || 'Healthy')}</span>
              </div>
              <div className="kv">
                <span className="k">First Seen</span>
                <span className="v">{String(meta.first_seen || '2024-01-12')}</span>
              </div>
              <div className="kv">
                <span className="k">Last Seen</span>
                <span className="v">{String(meta.last_seen || '2024-05-20')}</span>
              </div>

              <div className="section-label">Network</div>
              <div className="kv">
                <span className="k">Protocol</span>
                <span className="v">{String(meta.protocol || '—')}</span>
              </div>
              <div className="kv">
                <span className="k">Port</span>
                <span className="v">{String(meta.port ?? '—')}</span>
              </div>
              <div className="kv">
                <span className="k">IP</span>
                <span className="v">{String(meta.ip || '—')}</span>
              </div>
              <div className="kv">
                <span className="k">Listeners</span>
                <span className="v">{String(meta.listeners ?? '—')}</span>
              </div>
              <div className="kv">
                <span className="k">Connections</span>
                <span className="v">{String(meta.connections ?? inbound + outbound)}</span>
              </div>
              <div className="kv">
                <span className="k">Inbound Edges</span>
                <span className="v">{inbound}</span>
              </div>
              <div className="kv">
                <span className="k">Outbound Edges</span>
                <span className="v">{outbound}</span>
              </div>

              <div className="section-label">Process</div>
              <div className="kv">
                <span className="k">Process</span>
                <span className="v">{String(meta.process || '—')}</span>
              </div>
              <div className="kv">
                <span className="k">PID</span>
                <span className="v">{String(meta.pid ?? '—')}</span>
              </div>
              <div className="kv">
                <span className="k">Cmdline</span>
                <span className="v mono">{String(meta.cmdline || '—')}</span>
              </div>
              <div className="kv">
                <span className="k">User</span>
                <span className="v">{String(meta.user || '—')}</span>
              </div>
              <div className="kv">
                <span className="k">Host</span>
                <span className="v linkish">{String(meta.host || snap?.host || '—')}</span>
              </div>

              <div className="section-label">Ownership</div>
              <div className="kv">
                <span className="k">Owner</span>
                <span className="v">{String(meta.owner || '—')}</span>
              </div>
              <div className="kv">
                <span className="k">Team</span>
                <span className="v">{String(meta.team || '—')}</span>
              </div>
              <div className="kv">
                <span className="k">Cost Center</span>
                <span className="v">{String(meta.cost_center || '—')}</span>
              </div>
              <div className="kv">
                <span className="k">Path</span>
                <span className="v mono">{String(meta.path || '—')}</span>
              </div>
              {meta.days_left != null && (
                <div className="kv">
                  <span className="k">Cert days</span>
                  <span className="v">{String(meta.days_left)}</span>
                </div>
              )}
              <div className="active-lens">Lens: {reason}</div>
            </>
          ) : (
            <div className="empty-inspector">
              Select a luminous node in the constellation to inspect ownership, process, and blast
              radius.
            </div>
          )}
        </aside>
      </div>

      <footer className="statusbar">
        <div className="status-ok">
          <span className="status-label">System Status</span>
          <span className="sdot" /> All Systems Operational
        </div>
        <div className="status-center">
          <span>
            Nodes <strong>{String(stats.nodes ?? viewNodes.length)}</strong>
          </span>
          <span>
            Edges <strong>{String(stats.edges ?? viewEdges.length)}</strong>
          </span>
          <span className="changed">
            What Changed <strong>10m ago</strong>
            <span className="spark" />
          </span>
          <span>
            Data as of{' '}
            {now.toLocaleString(undefined, {
              year: 'numeric',
              month: 'short',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            })}
          </span>
        </div>
        <button type="button" className="live-btn">
          <span className="live-pulse" /> Live ▾
        </button>
      </footer>
    </div>
  )
}

function Glyph({ kind, icon }: { kind: string; icon: string }) {
  const label = icon || kind
  return <span aria-hidden>{label === 'gateway' ? '◇' : label === 'lock' ? '⬡' : '◎'}</span>
}

function Minimap({ nodes, edges }: { nodes: GraphNode[]; edges: OntologySnapshot['edges'] }) {
  const points = useMemo(() => {
    return nodes.slice(0, 50).map((_, i) => {
      const a = (i / 50) * Math.PI * 2
      const r = 16 + (i % 6) * 5.5
      return [70 + Math.cos(a) * r, 45 + Math.sin(a) * r * 0.72] as const
    })
  }, [nodes])

  return (
    <svg className="minimap-canvas" viewBox="0 0 140 90">
      {edges.slice(0, 60).map((e, i) => {
        const a = points[i % points.length]
        const b = points[(i * 3 + 1) % points.length]
        if (!a || !b) return null
        return (
          <line
            key={e.id}
            x1={a[0]}
            y1={a[1]}
            x2={b[0]}
            y2={b[1]}
            stroke="rgba(80,200,230,0.28)"
            strokeWidth="0.8"
          />
        )
      })}
      {points.map((p, i) => (
        <circle key={i} cx={p[0]} cy={p[1]} r={i === 0 ? 2.4 : 1.5} fill="rgba(120,220,255,0.75)" />
      ))}
    </svg>
  )
}

function IconSearch() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-3.5-3.5" />
    </svg>
  )
}
function IconFullscreen() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
    </svg>
  )
}
function IconBook() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M4 5a2 2 0 012-2h12v18H6a2 2 0 01-2-2V5z" />
      <path d="M8 7h8M8 11h8" />
    </svg>
  )
}
function IconBell() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M6 17h12l-1.5-2V10a4.5 4.5 0 10-9 0v5L6 17z" />
      <path d="M10 19a2 2 0 004 0" />
    </svg>
  )
}
