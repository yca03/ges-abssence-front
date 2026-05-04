import { useEffect, useState } from 'react'
import { presenceService, filiereService, periodeService } from '../../services/api'
import './EditionAbsences.css'

export default function EditionAbsences() {
  const [presences, setPresences] = useState([])
  const [filieres, setFilieres]   = useState([])
  const [periodes, setPeriodes]   = useState([])
  const [selectedFiliere, setSelectedFiliere] = useState('')
  const [selectedPeriode, setSelectedPeriode] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      presenceService.getAll(),
      filiereService.getAll(),
      periodeService.getAll()
    ]).then(([pRes, fRes, perRes]) => {
      setPresences(pRes.data?.member || [])
      setFilieres(fRes.data?.member || [])
      setPeriodes(perRes.data?.member || [])
    }).finally(() => setLoading(false))
  }, [])

  // ✅ Utilise p.status (booléen) comme dans ton entité PHP
  const absences = presences.filter(p =>
    p.status === false || p.status === 0
  )

  // Résoudre le nom d'une filière depuis son IRI
  const getFiliereName = (iri) => {
    const id = iri?.toString().split('/').pop()
    const found = filieres.find(f => f.id?.toString() === id)
    return found?.nom || found?.libelle || '—'
  }

  // ✅ Filtre basé sur p.filieres (IRI string) comme dans ton entité PHP
  const filtered = absences.filter(p => {
    const matchFiliere = selectedFiliere
      ? (p.filieres?.['@id'] || p.filieres || '')
          .toString()
          .split('/').pop() === selectedFiliere
      : true

    // Pas de période sur Presence dans ton entité, filtre ignoré
    const matchPeriode = selectedPeriode
      ? (p.enseignements?.['@id'] || p.enseignements || '')
          .toString()
          .includes(selectedPeriode)
      : true

    return matchFiliere && matchPeriode
  })

  // Affichage de la date
  const formatDate = (raw) => {
    if (!raw) return '—'
    return new Date(raw).toLocaleDateString('fr-FR', {
      day: '2-digit', month: '2-digit', year: 'numeric'
    })
  }

  // Récupérer le nom de l'enseignement (matière) depuis l'IRI
  const getEnseignementLabel = (p) => {
    const iri = p.enseignements?.['@id'] || p.enseignements
    if (!iri) return '—'
    return iri.toString().split('/').pop()
      ? `Enseignement #${iri.toString().split('/').pop()}`
      : '—'
  }

  // Vérifier si la présence est justifiée
  const isJustifie = (p) =>
    p.justifications && Array.isArray(p.justifications) && p.justifications.length > 0

  return (
    <div className="abs-page">
      <div className="abs-header">
        <div>
          <h2 className="abs-title">Absences par filière et par période</h2>
          <p className="abs-subtitle">{filtered.length} absence(s) trouvée(s)</p>
        </div>
        <div className="abs-filters">

          {/* FILTRE FILIÈRE */}
          <select
            value={selectedFiliere}
            onChange={e => setSelectedFiliere(e.target.value)}
            className="abs-select"
          >
            <option value="">Toutes les filières</option>
            {filieres.map(f => (
              <option key={f.id} value={f.id}>{f.nom || f.libelle}</option>
            ))}
          </select>

          {/* FILTRE PÉRIODE — basé sur enseignements */}
          <select
            value={selectedPeriode}
            onChange={e => setSelectedPeriode(e.target.value)}
            className="abs-select"
          >
            <option value="">Toutes les périodes</option>
            {periodes.map(p => (
              <option key={p.id} value={p.id}>
                {p.nom || p.libelle || formatDate(p.datePeriode) || `Période ${p.id}`}
              </option>
            ))}
          </select>

        </div>
      </div>

      {loading ? (
        <div className="abs-loading">Chargement...</div>
      ) : (
        <div className="abs-table-wrapper">
          <table className="abs-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Filière</th>
                <th>Enseignement</th>
                <th>Enseignant</th>
                <th>Date</th>
                <th>Justifié</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="abs-empty">
                    {absences.length === 0
                      ? 'Aucune absence enregistrée'
                      : 'Aucune absence pour cette sélection'}
                  </td>
                </tr>
              ) : (
                filtered.map((p, i) => {
                  const filiereIri = p.filieres?.['@id'] || p.filieres
                  const enseignantIri = p.enseignants?.['@id'] || p.enseignants

                  return (
                    <tr key={p.id}>
                      <td className="abs-num">{i + 1}</td>

                      {/* FILIÈRE */}
                      <td>{getFiliereName(filiereIri)}</td>

                      {/* ENSEIGNEMENT */}
                      <td>{getEnseignementLabel(p)}</td>

                      {/* ENSEIGNANT */}
                      <td>
                        {enseignantIri
                          ? `Enseignant #${enseignantIri.toString().split('/').pop()}`
                          : '—'}
                      </td>

                      {/* DATE */}
                      <td>{formatDate(p.date)}</td>

                      {/* JUSTIFIÉ */}
                      <td>
                        <span className={`abs-status ${isJustifie(p) ? 'abs-ok' : 'abs-non'}`}>
                          {isJustifie(p) ? 'Oui' : 'Non'}
                        </span>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}