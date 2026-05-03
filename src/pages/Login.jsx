import { useState } from 'react'
import { userService } from '../services/api'
import './Login.css'

export default function Login({ onLogin }) {
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!form.email || !form.password) {
      setError('Veuillez remplir tous les champs.')
      return
    }
    setLoading(true)
    try {
      const res = await userService.getAll()
      const users = res.data?.member || []
      const found = users.find(u => u.email === form.email && u.password === form.password)
      if (found) {
        localStorage.setItem('user', JSON.stringify(found))
        onLogin(found)
      } else {
        setError('Email ou mot de passe incorrect.')
      }
    } catch {
      setError('Erreur de connexion au serveur.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="lp">
      <div className="lp-card">

        <div className="lp-logo">
          <svg width="22" height="22" viewBox="0 0 40 40" fill="none">
            <path d="M12 30L20 12L28 30" stroke="white" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M15 24H25" stroke="white" strokeWidth="2.8" strokeLinecap="round"/>
          </svg>
        </div>

        <h1 className="lp-title">Ges-abs</h1>
        <p className="lp-sub">Connectez-vous à votre espace</p>

        <form onSubmit={handleSubmit} className="lp-form">

          <div className="lp-field">
            <label htmlFor="email">Email</label>
            <div className="lp-wrap">
              <svg className="lp-ico" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                <polyline points="22,6 12,13 2,6"/>
              </svg>
              <input
                id="email"
                type="email"
                placeholder="exemple@email.com"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                autoComplete="email"
              />
            </div>
          </div>

          <div className="lp-field">
            <label htmlFor="password">Mot de passe</label>
            <div className="lp-wrap">
              <svg className="lp-ico" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                autoComplete="current-password"
              />
              <button type="button" className="lp-eye" onClick={() => setShowPassword(!showPassword)} tabIndex={-1}>
                {showPassword ? (
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                    <line x1="1" y1="1" x2="23" y2="23"/>
                  </svg>
                ) : (
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                )}
              </button>
            </div>
          </div>

          {error && (
            <div className="lp-error">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              {error}
            </div>
          )}

          <button type="submit" className="lp-btn" disabled={loading}>
            {loading ? <span className="lp-spinner" /> : 'Se connecter'}
          </button>

        </form>

        <p className="lp-hint">
          Compte test : <strong>yaochris620@gmail.com</strong> / <strong>password</strong>
        </p>

      </div>
    </div>
  )
}