import { useState, useEffect } from 'react'
import { useCrud } from '../../services/useCrud'
import { matiereService, filiereService } from '../../services/api'
import Toast from '../../components/Toast'
import ConfirmDialog from '../../components/ConfirmDialog'

const EMPTY = { nom: '', coefficient: '', volumeHoraire: '', filieres: [] }

export default function Matieres() {
  const { items, loading, create, update, remove } = useCrud(matiereService)
  const [filieres, setFilieres] = useState([])

  const [modal, setModal]     = useState(false)
  const [form, setForm]       = useState(EMPTY)
  const [editing, setEditing] = useState(null)
  const [toast, setToast]     = useState(null)
  const [confirm, setConfirm] = useState(null)
  const [search, setSearch]   = useState('')

  useEffect(() => {
    filiereService.getAll()
      .then(res => setFilieres(res.data?.member || []))
      .catch(() => setFilieres([]))
  }, [])

  const openCreate = () => { setForm(EMPTY); setEditing(null); setModal(true) }

  const openEdit = (m) => {
    setForm({
      nom: m.nom || '',
      coefficient: m.coefficient || '',
      volumeHoraire: m.volumeHoraire || '',
      filieres: m.filieres || []
    })
    setEditing(m)
    setModal(true)
  }

  const toggleFiliere = (iri) => {
    setForm(prev => ({
      ...prev,
      filieres: prev.filieres.includes(iri)
        ? prev.filieres.filter(f => f !== iri)
        : [...prev.filieres, iri]
    }))
  }

  const handleSubmit = async () => {
    try {
      const payload = {
        nom: form.nom,
        coefficient: form.coefficient,
        volumeHoraire: form.volumeHoraire,
        filieres: form.filieres
      }
      if (editing) await update(editing.id, payload)
      else await create(payload)
      setModal(false)
      setToast({ msg: editing ? 'Matière modifiée !' : 'Matière créée !', type: 'success' })
    } catch (e) {
      console.log(e)
      setToast({ msg: "Erreur lors de l'enregistrement", type: 'error' })
    }
  }

  const handleDelete = async (id) => {
    try {
      await remove(id)
      setToast({ msg: 'Matière supprimée', type: 'success' })
    } catch {
      setToast({ msg: 'Erreur lors de la suppression', type: 'error' })
    }
    setConfirm(null)
  }

  const getFiliereName = (iri) => {
    const id = iri?.toString().split('/').pop()
    const found = filieres.find(f => f.id?.toString() === id)
    return found?.nom || found?.libelle || iri
  }

  const filtered = items.filter(m =>
    (m.nom || '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div>
      <div className="page-header">
        <h2>Matières</h2>
        <p>Gérer les matières enseignées</p>
      </div>

      <div className="card">
        <div className="search-bar">
          <div className="search-input-wrap">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input className="search-input" placeholder="Rechercher une matière..."
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <button className="btn btn-primary" onClick={openCreate}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Nouvelle matière
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--text2)' }}>Chargement...</div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Nom</th><th>Filières</th><th>Coefficient</th><th>Volume horaire</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={5}><div className="empty-state"><p>Aucune matière trouvée</p></div></td></tr>
                ) : filtered.map(m => (
                  <tr key={m.id}>
                    <td style={{ fontWeight: 600 }}>{m.nom}</td>
                    <td>
                      {m.filieres && m.filieres.length > 0 ? (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                          {m.filieres.map((f, i) => (
                            <span key={i} style={{
                              padding: '2px 10px', background: '#dbeafe',
                              color: '#1d4ed8', borderRadius: 6, fontSize: 12, fontWeight: 600
                            }}>
                              {getFiliereName(f)}
                            </span>
                          ))}
                        </div>
                      ) : <span style={{ color: '#94a3b8', fontSize: 13 }}>—</span>}
                    </td>
                    <td>{m.coefficient}</td>
                    <td>{m.volumeHoraire}h</td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn-icon" onClick={() => openEdit(m)}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                          </svg>
                        </button>
                        <button className="btn-icon danger" onClick={() => setConfirm(m)}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="3 6 5 6 21 6"/>
                            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ════════ MODAL — design esm ════════ */}
      {modal && (
        <div className="esm-overlay" onClick={() => setModal(false)}>
          <div className="esm-modal" onClick={e => e.stopPropagation()}>

            <div className="esm-header">
              <div className="esm-badge">
                {editing ? 'Modification' : 'Création'}
              </div>
              <h2 className="esm-title">
                {editing ? 'Modifier la matière' : 'Nouvelle matière'}
              </h2>
              <p className="esm-subtitle">
                {editing
                  ? 'Mettez à jour les informations de la matière'
                  : 'Remplissez les informations pour créer une matière'}
              </p>
              <button className="esm-close" onClick={() => setModal(false)}>✕</button>
            </div>

            <div className="esm-body">

              <p className="esm-section-label">Informations générales</p>
              <div className="esm-grid">
                <div className="esm-field" style={{ gridColumn: '1 / -1' }}>
                  <label className="esm-label">Nom de la matière *</label>
                  <input className="esm-input" placeholder="ex: Algorithmique"
                    value={form.nom}
                    onChange={e => setForm({ ...form, nom: e.target.value })} />
                </div>

                <div className="esm-field">
                  <label className="esm-label">Coefficient</label>
                  <input type="number" className="esm-input" placeholder="ex: 3"
                    value={form.coefficient}
                    onChange={e => setForm({ ...form, coefficient: e.target.value })} />
                </div>

                <div className="esm-field">
                  <label className="esm-label">Volume horaire (h)</label>
                  <input type="number" className="esm-input" placeholder="ex: 30"
                    value={form.volumeHoraire}
                    onChange={e => setForm({ ...form, volumeHoraire: e.target.value })} />
                </div>
              </div>

              <div className="esm-stu-header">
                <p className="esm-section-label" style={{ margin: 0 }}>Filières associées</p>
                <span className="esm-count-pill">{form.filieres.length} sélectionnée(s)</span>
              </div>

              <div className="esm-stu-box" style={{ marginTop: 10 }}>
                {filieres.length === 0 ? (
                  <div className="esm-stu-empty">Aucune filière disponible</div>
                ) : filieres.map(f => {
                  const iri = f['@id'] || `/api/filieres/${f.id}`
                  const checked = form.filieres.includes(iri)
                  return (
                    <div
                      key={f.id}
                      className={`esm-stu-item ${checked ? 'checked' : ''}`}
                      onClick={() => toggleFiliere(iri)}
                    >
                      <div className="esm-checkbox">
                        {checked && <span className="esm-checkbox-tick">✓</span>}
                      </div>
                      <div className="esm-stu-avatar">
                        {(f.nom || f.libelle || '?')[0].toUpperCase()}
                      </div>
                      <span className="esm-stu-name">{f.nom || f.libelle}</span>
                    </div>
                  )
                })}
              </div>

            </div>

            <div className="esm-footer">
              <button className="esm-btn-cancel" onClick={() => setModal(false)}>
                Annuler
              </button>
              <button
                className="esm-btn-submit"
                onClick={handleSubmit}
                disabled={!form.nom}
                style={{ opacity: form.nom ? 1 : 0.5, cursor: form.nom ? 'pointer' : 'not-allowed' }}
              >
                {editing ? '✏️ Enregistrer' : '✚ Créer la matière'}
              </button>
            </div>

          </div>
        </div>
      )}

      {confirm && (
        <ConfirmDialog
          message={`Supprimer la matière "${confirm.nom}" ?`}
          onConfirm={() => handleDelete(confirm.id)}
          onCancel={() => setConfirm(null)}
        />
      )}

      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}