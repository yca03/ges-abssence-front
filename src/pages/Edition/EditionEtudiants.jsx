import { useEffect, useState } from 'react'
import { etudiantService, presenceService } from '../../services/api'
import './EditionEtudiants.css'

export default function EditionEtudiants() {
  const [etudiants, setEtudiants] = useState([])
  const [presences, setPresences] = useState([])
  const [selectedEtudiant, setSelectedEtudiant] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([etudiantService.getAll(), presenceService.getAll()])
      .then(([eRes, pRes]) => {
        setEtudiants(eRes.data?.member || [])
        setPresences(pRes.data?.member || [])
      })
      .finally(() => setLoading(false))
  }, [])

  const etudiant = etudiants.find(e => e.id?.toString() === selectedEtudiant)

  // ✅ Dans ton entité, Presence a une collection "etudiants" (OneToMany)
  // L'API retourne etudiants = ["/api/etudiants/4", "/api/etudiants/5", ...]
  const presencesEtudiant = selectedEtudiant
    ? presences.filter(p => {
        const etuIris = Array.isArray(p.etudiants) ? p.etudiants : []
        return etuIris.some(iri =>
          iri?.toString().split('/').pop() === selectedEtudiant
        )
      })
    : []

  // ✅ status est un booléen : false = absent, true = présent
  const isAbsentFn = (p) => p.status === false || p.status === 0

  const absences      = presencesEtudiant.filter(isAbsentFn)
  const justifiees    = absences.filter(p =>
    Array.isArray(p.justifications) && p.justifications.length > 0
  )
  const nonJustifiees = absences.filter(p =>
    !Array.isArray(p.justifications) || p.justifications.length === 0
  )

  const formatDate = (raw) => {
    if (!raw) return '—'
    return new Date(raw).toLocaleDateString('fr-FR', {
      day: '2-digit', month: '2-digit', year: 'numeric'
    })
  }

  const getEnseignementLabel = (p) => {
    const iri = p.enseignements?.['@id'] || p.enseignements
    if (!iri) return '—'
    return `Enseignement #${iri.toString().split('/').pop()}`
  }

  return (
    <div className="etud-page">
      <div className="etud-header">
        <div>
          <h2 className="etud-title">Absences par étudiant</h2>
          <p className="etud-subtitle">Fiche individuelle de présence</p>
        </div>
        <select
          value={selectedEtudiant}
          onChange={e => setSelectedEtudiant(e.target.value)}
          className="etud-select"
        >
          <option value="">Sélectionner un étudiant</option>
          {etudiants.map(e => (
            <option key={e.id} value={e.id}>
              {e.nom} {e.prenom}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="etud-loading">Chargement...</div>

      ) : !selectedEtudiant ? (
        <div className="etud-empty-state">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#bfdbfe" strokeWidth="1.5">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
            <circle cx="12" cy="7" r="4"/>
          </svg>
          <p>Sélectionnez un étudiant pour voir sa fiche</p>
        </div>

      ) : (
        <>
          {/* FICHE ÉTUDIANT */}
          {etudiant && (
            <div className="etud-fiche">
              <div className="etud-avatar">
                {etudiant.nom?.[0]}{etudiant.prenom?.[0]}
              </div>
              <div className="etud-info">
                <h3>{etudiant.nom} {etudiant.prenom}</h3>
                <p>{etudiant.email || etudiant.matricule || '—'}</p>
              </div>
              <div className="etud-stats">
                <div className="etud-stat">
                  <span className="etud-stat-num">{presencesEtudiant.length}</span>
                  <span className="etud-stat-label">Séances</span>
                </div>
                <div className="etud-stat red">
                  <span className="etud-stat-num">{absences.length}</span>
                  <span className="etud-stat-label">Absences</span>
                </div>
                <div className="etud-stat green">
                  <span className="etud-stat-num">{justifiees.length}</span>
                  <span className="etud-stat-label">Justifiées</span>
                </div>
                <div className="etud-stat orange">
                  <span className="etud-stat-num">{nonJustifiees.length}</span>
                  <span className="etud-stat-label">Non justifiées</span>
                </div>
              </div>
            </div>
          )}

          {/* TABLEAU */}
          <div className="etud-table-wrapper">
            <table className="etud-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Date</th>
                  <th>Enseignement</th>
                  <th>Statut</th>
                  <th>Justifié</th>
                </tr>
              </thead>
              <tbody>
                {presencesEtudiant.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="etud-empty">
                      Aucune séance trouvée pour cet étudiant
                    </td>
                  </tr>
                ) : (
                  presencesEtudiant.map((p, i) => {
                    const absent     = isAbsentFn(p)
                    const justifie   = Array.isArray(p.justifications) && p.justifications.length > 0

                    return (
                      <tr key={p.id}>
                        <td className="etud-num">{i + 1}</td>

                        {/* DATE */}
                        <td>{formatDate(p.date)}</td>

                        {/* ENSEIGNEMENT */}
                        <td>{getEnseignementLabel(p)}</td>

                        {/* STATUT */}
                        <td>
                          <span className={`etud-status ${absent ? 'etud-non' : 'etud-ok'}`}>
                            {absent ? 'Absent' : 'Présent'}
                          </span>
                        </td>

                        {/* JUSTIFIÉ */}
                        <td>
                          {absent ? (
                            <span className={`etud-status ${justifie ? 'etud-ok' : 'etud-non'}`}>
                              {justifie ? 'Oui' : 'Non'}
                            </span>
                          ) : (
                            <span style={{ color: '#94a3b8' }}>—</span>
                          )}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}