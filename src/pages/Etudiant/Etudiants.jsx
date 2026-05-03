import { useState, useEffect } from 'react'
import { useCrud } from '../../services/useCrud'
import { etudiantService, filiereService } from '../../services/api'
import Toast from '../../components/Toast'
import ConfirmDialog from '../../components/ConfirmDialog'
import RecuInscription from './Recu'
import './Etudiants.css'

const EMPTY = {
  nom: '',
  prenom: '',
  sexe: 'M',
  email: '',
  telephone: '',
  filiere: ''
}

export default function Etudiants() {

  const { items, loading, create, update, remove } = useCrud(etudiantService)

  const [filieres, setFilieres]           = useState([])
  const [modal, setModal]                 = useState(false)
  const [form, setForm]                   = useState(EMPTY)
  const [editing, setEditing]             = useState(null)
  const [toast, setToast]                 = useState(null)
  const [confirm, setConfirm]             = useState(null)
  const [search, setSearch]               = useState('')
  const [filterFiliere, setFilterFiliere] = useState('')
  const [recu, setRecu]                   = useState(null)

  /* ── Charger filières ── */
  useEffect(() => {
    filiereService.getAll()
      .then(r => {
        const d = r.data
        const list = Array.isArray(d) ? d : d['hydra:member'] || d.member || []
        setFilieres(list)
      })
      .catch(console.error)
  }, [])

  /* ── Helpers ── */
  const getFiliereId = (f) => {
    if (!f) return null
    if (typeof f === 'string') return f.split('/').pop()
    if (f?.id) return f.id
    if (f?.['@id']) return f['@id'].split('/').pop()
    return null
  }

  const getFiliereName = (e) => {
    const fid = getFiliereId(e.filieres)
    const f = filieres.find(f => f.id == fid)
    return f ? (f.libelle || f.nom || f.code) : '—'
  }

  /* ── CRUD ── */
  const openCreate = () => { setForm(EMPTY); setEditing(null); setModal(true) }

  const openEdit = (e) => {
    setForm({
      nom:       e.nom || '',
      prenom:    e.prenom || '',
      sexe:      e.sexe || 'M',
      email:     e.email || '',
      telephone: e.telephone || '',
      filiere:   getFiliereId(e.filieres) || ''
    })
    setEditing(e)
    setModal(true)
  }

  const handleSubmit = async () => {
    try {
      const payload = {
        nom:       form.nom,
        prenom:    form.prenom,
        sexe:      form.sexe,
        email:     form.email,
        telephone: form.telephone,
        filieres:  form.filiere ? `/api/filieres/${form.filiere}` : null
      }
      if (editing) await update(editing.id, payload)
      else await create(payload)
      setModal(false)
      setToast({ msg: editing ? 'Étudiant modifié !' : 'Étudiant ajouté !', type: 'success' })
    } catch (e) {
      console.error(e)
      setToast({ msg: 'Erreur enregistrement', type: 'error' })
    }
  }

  const handleDelete = async (id) => {
    try {
      await remove(id)
      setToast({ msg: 'Étudiant supprimé', type: 'success' })
    } catch {
      setToast({ msg: 'Erreur suppression', type: 'error' })
    }
    setConfirm(null)
  }

  /* ── Filtrage ── */
  const filtered = items.filter(e => {
    const matchSearch = `${e.nom} ${e.prenom}`.toLowerCase().includes(search.toLowerCase())
    const fid = getFiliereId(e.filieres)
    const matchFiliere = !filterFiliere || fid == filterFiliere
    return matchSearch && matchFiliere
  })

  /* ════════════ RENDU ════════════ */
  return (
    <div>

      <div className="page-header">
        <h2>Étudiants</h2>
        <p>Gestion des étudiants</p>
      </div>

      <div className="card">
        <div className="search-bar">
          <input
            className="search-input"
            placeholder="Rechercher..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <select
            className="form-select"
            value={filterFiliere}
            onChange={e => setFilterFiliere(e.target.value)}
          >
            <option value="">Toutes filières</option>
            {filieres.map(f => (
              <option key={f.id} value={f.id}>{f.libelle || f.nom}</option>
            ))}
          </select>
          <button className="btn btn-primary" onClick={openCreate}>
            + Ajouter
          </button>
        </div>

        {loading ? (
          <div style={{ padding: 40, textAlign: 'center' }}>Chargement...</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>
            Aucun étudiant trouvé.
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Étudiant</th>
                  <th>Email</th>
                  <th>Téléphone</th>
                  <th>Filière</th>
                  <th>Sexe</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(e => (
                  <tr key={e.id}>
                    <td><strong>{e.prenom} {e.nom}</strong></td>
                    <td>{e.email}</td>
                    <td>{e.telephone}</td>
                    <td>{getFiliereName(e)}</td>
                    <td>{e.sexe === 'M' ? 'Masculin' : 'Féminin'}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button className="btn-icon" title="Modifier"
                          onClick={() => openEdit(e)}>✏️</button>
                        <button className="btn-icon" title="Reçu d'inscription"
                          onClick={() => setRecu(e)}>🖨️</button>
                        <button className="btn-icon danger" title="Supprimer"
                          onClick={() => setConfirm(e)}>🗑️</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Modal formulaire ── */}
      {modal && (
        <div className="etu-overlay" onClick={() => setModal(false)}>
          <div className="etu-modal" onClick={e => e.stopPropagation()}>

            <div className="etu-header">
              <div className="etu-badge">
                🎓 {editing ? 'Modification' : 'Création'}
              </div>
              <h2 className="etu-title">
                {editing ? "Modifier l'étudiant" : 'Nouvel étudiant'}
              </h2>
              <p className="etu-subtitle">
                {editing
                  ? "Mettez à jour les informations de l'étudiant"
                  : 'Remplissez les informations pour ajouter un étudiant'}
              </p>
              <button className="etu-close" onClick={() => setModal(false)}>✕</button>
            </div>

            <div className="etu-body">
              <p className="etu-section-label">Informations personnelles</p>
              <div className="etu-grid">

                <div className="etu-field">
                  <label className="etu-label">Prénom *</label>
                  <input className="etu-input" placeholder="Ex: Kouamé"
                    value={form.prenom}
                    onChange={e => setForm({ ...form, prenom: e.target.value })} />
                </div>

                <div className="etu-field">
                  <label className="etu-label">Nom *</label>
                  <input className="etu-input" placeholder="Ex: Diallo"
                    value={form.nom}
                    onChange={e => setForm({ ...form, nom: e.target.value })} />
                </div>

                <div className="etu-field full">
                  <label className="etu-label">Email</label>
                  <input className="etu-input" type="email" placeholder="exemple@email.com"
                    value={form.email}
                    onChange={e => setForm({ ...form, email: e.target.value })} />
                </div>

                <div className="etu-field">
                  <label className="etu-label">Téléphone</label>
                  <input className="etu-input" placeholder="+225 00 00 00 00"
                    value={form.telephone}
                    onChange={e => setForm({ ...form, telephone: e.target.value })} />
                </div>

                <div className="etu-field">
                  <label className="etu-label">Filière</label>
                  <select className="etu-select" value={form.filiere}
                    onChange={e => setForm({ ...form, filiere: e.target.value })}>
                    <option value="">-- Choisir --</option>
                    {filieres.map(f => (
                      <option key={f.id} value={f.id}>{f.libelle || f.nom}</option>
                    ))}
                  </select>
                </div>

                <div className="etu-field full">
                  <label className="etu-label">Sexe</label>
                  <div className="etu-sexe-group">
                    <button type="button"
                      className={`etu-sexe-pill ${form.sexe === 'M' ? 'active' : ''}`}
                      onClick={() => setForm({ ...form, sexe: 'M' })}>
                       Masculin
                    </button>
                    <button type="button"
                      className={`etu-sexe-pill ${form.sexe === 'F' ? 'active' : ''}`}
                      onClick={() => setForm({ ...form, sexe: 'F' })}>
                       Féminin
                    </button>
                  </div>
                </div>

              </div>
            </div>

            <div className="etu-footer">
              <button className="etu-btn-cancel" onClick={() => setModal(false)}>
                Annuler
              </button>
              <button className="etu-btn-submit" onClick={handleSubmit}
                disabled={!form.nom || !form.prenom}>
                {editing ? '✏️ Enregistrer' : "✚ Créer l'étudiant"}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ── Modal reçu — composant séparé ── */}
      <RecuInscription
        recu={recu}
        getFiliereName={getFiliereName}
        onClose={() => setRecu(null)}
      />

      {confirm && (
        <ConfirmDialog
          message={`Supprimer ${confirm.prenom} ${confirm.nom} ?`}
          onConfirm={() => handleDelete(confirm.id)}
          onCancel={() => setConfirm(null)}
        />
      )}

      {toast && (
        <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />
      )}

    </div>
  )
}