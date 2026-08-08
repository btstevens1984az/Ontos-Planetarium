import { useMemo, useState, type FormEvent } from 'react'
import { api, type Providers, type TokenBundle } from '../api'

type Props = {
  providers: Providers | null
  onAuthed: (bundle: TokenBundle) => void
}

export default function LoginPage({ providers, onAuthed }: Props) {
  const [username, setUsername] = useState('admin')
  const [password, setPassword] = useState('ChangeMeNow!')
  const [provider, setProvider] = useState<'local' | 'ldap'>('local')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const options = useMemo(() => {
    const list: Array<'local' | 'ldap'> = []
    if (!providers || providers.local) list.push('local')
    if (providers?.ldap) list.push('ldap')
    return list
  }, [providers])

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      const bundle = await api.login(username.trim(), password, provider)
      onAuthed(bundle)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign-in failed')
    } finally {
      setBusy(false)
    }
  }

  async function azureSignIn() {
    setError('')
    try {
      const { authorize_url } = await api.azureLoginUrl()
      window.location.href = authorize_url
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Azure AD not ready')
    }
  }

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={onSubmit}>
        <div className="brand" style={{ marginBottom: '0.75rem' }}>
          <img src="/ontos-mark.svg" alt="" />
          <h1>Ontos Planetarium</h1>
        </div>
        <p>Living Network Truth Galaxy — secure operator access.</p>

        <div className="provider-row">
          <span className={`provider-pill ${providers?.local ? 'on' : ''}`}>Local</span>
          <span className={`provider-pill ${providers?.ldap_ready ? 'on' : ''}`}>Active Directory</span>
          <span className={`provider-pill ${providers?.azure_ready ? 'on' : ''}`}>Azure AD</span>
          {providers?.demo_mode ? <span className="provider-pill on">Demo</span> : null}
        </div>

        {options.length > 1 ? (
          <div className="field">
            <label htmlFor="provider">Directory</label>
            <select
              id="provider"
              value={provider}
              onChange={(e) => setProvider(e.target.value as 'local' | 'ldap')}
            >
              {options.includes('local') ? <option value="local">Local account</option> : null}
              {options.includes('ldap') ? (
                <option value="ldap">Active Directory / LDAP</option>
              ) : null}
            </select>
          </div>
        ) : null}

        <div className="field">
          <label htmlFor="user">Username</label>
          <input
            id="user"
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </div>
        <div className="field">
          <label htmlFor="pass">Password</label>
          <input
            id="pass"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        {error ? <p className="error">{error}</p> : null}

        <button className="btn-primary" type="submit" disabled={busy}>
          {busy ? 'Authenticating…' : 'Enter Planetarium'}
        </button>

        {providers?.azure_ad ? (
          <button className="btn-secondary" type="button" onClick={azureSignIn}>
            Sign in with Microsoft Entra ID
          </button>
        ) : null}

        <p style={{ marginTop: '1rem', fontSize: '0.85rem' }}>
          Default demo: <code>admin</code> / <code>ChangeMeNow!</code> — change via env before
          production.
        </p>
      </form>
    </div>
  )
}
