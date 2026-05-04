import './Header.css'
import { useState, useRef, useEffect } from 'react'

export default function Header({ user, onLogout }) {
  const [open, setOpen] = useState(false)
  const ref = useRef()

  useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    onLogout()
  }

  // Initiales de l'utilisateur connecté
  const initiales = user
    ? `${user.nom?.[0] ?? ''}${user.prenom?.[0] ?? ''}`.toUpperCase()
    : 'CA'

  const nomAffiche = user?.nom ?? user?.prenom ?? 'Utilisateur'

  return (
    <header className="header">

      {/* LEFT */}
      <div className="header-left">
        <h1 className="header-title">Gestion d'absences</h1>
        <div className="search-box">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/>
            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input placeholder="Rechercher..." />
        </div>
      </div>

      {/* RIGHT */}
      <div className="header-right" ref={ref}>

        {/* Notification */}
        <div className="notif">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 8a6 6 0 10-12 0c0 7-3 7-3 7h18s-3 0-3-7"/>
            <path d="M13.73 21a2 2 0 01-3.46 0"/>
          </svg>
          <span className="notif-badge">3</span>
        </div>

        {/* Profil */}
        <div className="profile" onClick={() => setOpen(!open)}>
          <div className="avatar">{initiales}</div>
          <div className="info">
            <span className="name">{nomAffiche}</span>
            <span className="role">Admin</span>
          </div>
        </div>

        {/* Dropdown */}
        {open && (
          <div className="dropdown">
            <button className="dropdown-item">Mon profil</button>
            <button className="dropdown-item">Paramètres</button>
            <div className="dropdown-divider" />
            <button className="dropdown-item danger" onClick={handleLogout}>
              Se déconnecter
            </button>
          </div>
        )}
      </div>
    </header>
  )
}