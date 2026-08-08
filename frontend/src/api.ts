const API_BASE = import.meta.env.VITE_API_BASE ?? ''

export type Providers = {
  local: boolean
  azure_ad: boolean
  ldap: boolean
  azure_ready: boolean
  ldap_ready: boolean
  demo_mode: boolean
  app_name: string
}

export type AuthUser = {
  id: number
  username: string
  email: string
  display_name: string
  role: string
  auth_provider: string
}

export type TokenBundle = {
  access_token: string
  refresh_token: string
  token_type: string
  provider: string
  user: AuthUser
}

function authHeader(): HeadersInit {
  const token = localStorage.getItem('ontos_access_token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...authHeader(),
      ...(init?.headers || {}),
    },
  })
  if (!res.ok) {
    let detail = res.statusText
    try {
      const body = await res.json()
      detail = body.detail || detail
    } catch {
      /* ignore */
    }
    throw new Error(typeof detail === 'string' ? detail : JSON.stringify(detail))
  }
  return res.json() as Promise<T>
}

export const api = {
  providers: () => request<Providers>('/api/auth/providers'),
  login: (username: string, password: string, provider: 'local' | 'ldap') =>
    request<TokenBundle>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password, provider }),
    }),
  me: () => request<AuthUser>('/api/auth/me'),
  azureLoginUrl: () => request<{ authorize_url: string }>('/api/auth/azure/login'),
  snapshot: () => request<OntologySnapshot>('/api/ontology/snapshot'),
  query: (q: string) => request<QueryResult>(`/api/ontology/query?q=${encodeURIComponent(q)}`),
  blast: (target: string) =>
    request<QueryResult>(`/api/ontology/blast?target=${encodeURIComponent(target)}`),
}

export type GraphNode = {
  id: string
  kind: string
  label: string
  meta: Record<string, unknown>
}

export type GraphEdge = {
  id: string
  kind: string
  source: string
  target: string
  meta: Record<string, unknown>
}

export type OntologySnapshot = {
  ts: number
  host: string
  demo: boolean
  stats: Record<string, number | boolean>
  nodes: GraphNode[]
  edges: GraphEdge[]
  viewer?: string
}

export type QueryResult = {
  query?: string
  reason?: string
  match_ids?: string[]
  nodes: GraphNode[]
  edges: GraphEdge[]
  stats?: Record<string, number>
  target?: string
  viewer?: string
}
