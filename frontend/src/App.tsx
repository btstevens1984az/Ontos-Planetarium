import { useEffect, useMemo, useState } from 'react'
import { api, type AuthUser, type Providers } from './api'
import LoginPage from './pages/LoginPage'
import PlanetariumPage from './pages/PlanetariumPage'

function readHash(): string {
  return window.location.hash.replace(/^#/, '') || '/'
}

export default function App() {
  const [route, setRoute] = useState(readHash)
  const [user, setUser] = useState<AuthUser | null>(null)
  const [providers, setProviders] = useState<Providers | null>(null)
  const [booting, setBooting] = useState(true)

  useEffect(() => {
    const onHash = () => setRoute(readHash())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  useEffect(() => {
    ;(async () => {
      try {
        const p = await api.providers()
        setProviders(p)
      } catch {
        setProviders(null)
      }

      if (route.startsWith('/auth/callback')) {
        const qs = new URLSearchParams(route.split('?')[1] || '')
        const access = qs.get('access_token')
        const refresh = qs.get('refresh_token')
        if (access) {
          localStorage.setItem('ontos_access_token', access)
          if (refresh) localStorage.setItem('ontos_refresh_token', refresh)
          window.location.hash = '/'
        }
      }

      const token = localStorage.getItem('ontos_access_token')
      if (token) {
        try {
          const me = await api.me()
          setUser(me)
        } catch {
          localStorage.removeItem('ontos_access_token')
          localStorage.removeItem('ontos_refresh_token')
          setUser(null)
        }
      }
      setBooting(false)
    })()
  }, [route])

  const authed = useMemo(() => Boolean(user), [user])

  if (booting) {
    return (
      <div className="login-page">
        <div className="login-card">
          <h1>Ontos Planetarium</h1>
          <p>Aligning constellation…</p>
        </div>
      </div>
    )
  }

  if (!authed || !user) {
    return (
      <LoginPage
        providers={providers}
        onAuthed={(bundle) => {
          localStorage.setItem('ontos_access_token', bundle.access_token)
          localStorage.setItem('ontos_refresh_token', bundle.refresh_token)
          setUser(bundle.user)
          window.location.hash = '/'
        }}
      />
    )
  }

  return (
    <PlanetariumPage
      user={user}
      providers={providers}
      onLogout={() => {
        localStorage.removeItem('ontos_access_token')
        localStorage.removeItem('ontos_refresh_token')
        setUser(null)
      }}
    />
  )
}
