import { useEffect, useRef, useState } from 'react'
import './Dashboard.css'
import {
  enseignantService,
  etudiantService,
  filiereService,
  matiereService,
  presenceService,
  justificationService,
} from '../services/api'

const normalize = (data) => {
  if (!data) return []
  if (Array.isArray(data)) return data
  return data['hydra:member'] || data['member'] || []
}

// ✅ Détecte une absence selon le champ "status" booléen (false = absent)
const isAbsent = (p) =>
  p.status === false ||
  p.status === 0 ||
  p.statut === 'absent' ||
  p.statut === 'ABSENT'

export default function Dashboard() {
  const lineRef  = useRef(null)
  const donutRef = useRef(null)
  const lineChart  = useRef(null)
  const donutChart = useRef(null)

  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    enseignants: 0, etudiants: 0, filieres: 0,
    absences: 0, justifiees: 0, tauxPresence: 0
  })
  const [absParFiliere, setAbsParFiliere] = useState([])
  const [absParMatiere, setAbsParMatiere] = useState([])
  const [activity, setActivity]           = useState([])

  useEffect(() => {
    const load = async () => {
      try {
        const [ensRes, etuRes, filRes, matRes, presRes, justRes] = await Promise.all([
          enseignantService.getAll(),
          etudiantService.getAll(),
          filiereService.getAll(),
          matiereService.getAll(),
          presenceService.getAll(),
          justificationService.getAll(),
        ])

        const enseignants = normalize(ensRes.data)
        const etudiants   = normalize(etuRes.data)
        const filieres    = normalize(filRes.data)
        const matieres    = normalize(matRes.data)
        const presences   = normalize(presRes.data)
        const justifs     = normalize(justRes.data)

        // ── Absences (status = false/0)
        const absences = presences.filter(isAbsent)

        const justifieeIds = new Set(justifs.map(j => {
          const iri = j.presences?.['@id'] || j.presences || j.presence?.['@id'] || j.presence
          return typeof iri === 'string' ? iri.split('/').pop() : String(iri)
        }))

        const nbJustifiees = absences.filter(p => justifieeIds.has(String(p.id))).length
        const totalPres    = presences.length
        const tauxPresence = totalPres > 0
          ? Math.round(((totalPres - absences.length) / totalPres) * 100)
          : 100

        setStats({
          enseignants: enseignants.length,
          etudiants:   etudiants.length,
          filieres:    filieres.length,
          absences:    absences.length,
          justifiees:  nbJustifiees,
          tauxPresence,
        })

        // ── Absences par filière
        // La présence a "filieres" (IRI vers Filiere)
        const filMap = {}
        filieres.forEach(f => {
          filMap[f.id] = { label: f.libelle || f.nom || `Filière ${f.id}`, val: 0 }
        })
        absences.forEach(p => {
          // p.filieres = "/api/filieres/1"
          const fIri = p.filieres?.['@id'] || p.filieres
          const fId  = fIri?.toString().split('/').pop()
          if (fId && filMap[fId]) filMap[fId].val++
        })
        const filArr = Object.values(filMap)
          .filter(f => f.val > 0)
          .sort((a, b) => b.val - a.val)
          .slice(0, 6)
        const maxFil = filArr[0]?.val || 1
        setAbsParFiliere(filArr.map(f => ({ ...f, pct: Math.round((f.val / maxFil) * 100) })))

        // ── Absences par matière
        // La présence a "enseignements" (IRI vers Enseignement qui a une matière)
        const matMap = {}
        matieres.forEach(m => {
          matMap[m.id] = { label: m.nom || `Matière ${m.id}`, val: 0 }
        })
        absences.forEach(p => {
          const ensIri = p.enseignements?.['@id'] || p.enseignements
          const mIri   = p.enseignements?.matiere?.['@id'] || p.enseignements?.matiere
          const mId    = mIri?.toString().split('/').pop()
          if (mId && matMap[mId]) matMap[mId].val++
        })
        const matArr = Object.values(matMap)
          .filter(m => m.val > 0)
          .sort((a, b) => b.val - a.val)
          .slice(0, 6)
        const maxMat = matArr[0]?.val || 1
        setAbsParMatiere(matArr.map(m => ({ ...m, pct: Math.round((m.val / maxMat) * 100) })))

        // ── Activité récente (5 dernières presences)
        const recent = [...presences]
          .sort((a, b) => new Date(b.date || b.createdAt || 0) - new Date(a.date || a.createdAt || 0))
          .slice(0, 5)
          .map(p => {
            const absent = isAbsent(p)

            // Les étudiants sont une collection IRI sur la présence
            const etuIris = Array.isArray(p.etudiants) ? p.etudiants : []
            const nomEtu  = etuIris.length > 0
              ? `Étudiant #${etuIris[0]?.toString().split('/').pop()}`
              : `Présence #${p.id}`

            const dateRaw = p.date || p.createdAt
            const time    = dateRaw
              ? new Date(dateRaw).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
              : '—'

            return {
              color: absent ? '#e24b4a' : '#22c55e',
              text:  absent ? 'Absence enregistrée' : 'Présence enregistrée',
              sub:   nomEtu,
              time,
            }
          })
        setActivity(recent)

        await buildCharts(absences, presences, nbJustifiees, justifs)

      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }

    load()
    return () => {
      lineChart.current?.destroy()
      donutChart.current?.destroy()
    }
  }, [])

  const buildCharts = async (absences, presences, nbJustifiees, justifs) => {
    if (typeof window.Chart === 'undefined') {
      await new Promise(resolve => {
        const s = document.createElement('script')
        s.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js'
        s.onload = resolve
        document.head.appendChild(s)
      })
    }

    const Chart    = window.Chart
    Chart.defaults.font.family = 'Inter, system-ui'
    Chart.defaults.font.size   = 11
    const gridColor = 'rgba(0,0,0,0.06)'
    const textColor = '#94a3b8'

    const now   = new Date()
    const weeks = Array.from({ length: 6 }, (_, i) => {
      const start = new Date(now)
      start.setDate(now.getDate() - (5 - i) * 7)
      const end = new Date(start)
      end.setDate(start.getDate() + 6)
      return { label: `S${i + 1}`, start, end }
    })

    const justifieeIds = new Set(justifs.map(j => {
      const iri = j.presences?.['@id'] || j.presences || j.presence?.['@id'] || j.presence
      return typeof iri === 'string' ? iri.split('/').pop() : String(iri)
    }))

    const absPerWeek  = weeks.map(w =>
      absences.filter(p => {
        const d = new Date(p.date || p.createdAt)
        return d >= w.start && d <= w.end
      }).length
    )
    const justPerWeek = weeks.map(w =>
      absences.filter(p => {
        const d = new Date(p.date || p.createdAt)
        return d >= w.start && d <= w.end && justifieeIds.has(String(p.id))
      }).length
    )

    if (lineRef.current) {
      if (lineChart.current) lineChart.current.destroy()
      lineChart.current = new Chart(lineRef.current, {
        type: 'line',
        data: {
          labels: weeks.map(w => w.label),
          datasets: [
            {
              label: 'Absences',
              data: absPerWeek,
              borderColor: '#e24b4a',
              backgroundColor: 'rgba(226,75,74,0.08)',
              borderWidth: 2, pointRadius: 4,
              pointBackgroundColor: '#e24b4a',
              tension: 0.4, fill: true
            },
            {
              label: 'Justifiées',
              data: justPerWeek,
              borderColor: '#22c55e',
              backgroundColor: 'rgba(34,197,94,0.06)',
              borderWidth: 2, pointRadius: 4,
              pointBackgroundColor: '#22c55e',
              tension: 0.4, fill: true
            }
          ]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'top', align: 'end',
              labels: { boxWidth: 8, boxHeight: 8, usePointStyle: true, color: textColor, padding: 14 }
            }
          },
          scales: {
            x: { grid: { color: gridColor }, ticks: { color: textColor } },
            y: { grid: { color: gridColor }, ticks: { color: textColor }, beginAtZero: true }
          }
        }
      })
    }

    const nbNonJust = absences.length - nbJustifiees
    const nbAttente = justifs.filter(j => !j.valide && !j.validated).length
    const nbRetards = presences.filter(p => p.status === 'retard' || p.statut === 'retard').length

    if (donutRef.current) {
      if (donutChart.current) donutChart.current.destroy()
      donutChart.current = new Chart(donutRef.current, {
        type: 'doughnut',
        data: {
          labels: ['Non justifiées', 'Justifiées', 'En attente', 'Retards'],
          datasets: [{
            data: [Math.max(nbNonJust, 0), nbJustifiees, nbAttente, nbRetards],
            backgroundColor: ['#e24b4a', '#22c55e', '#f59e0b', '#6366f1'],
            borderWidth: 0, hoverOffset: 4
          }]
        },
        options: {
          responsive: false, cutout: '68%',
          plugins: { legend: { display: false } }
        }
      })
    }
  }

  const date = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  })

  const statsDisplay = [
    { label: 'Enseignants actifs', val: loading ? '…' : stats.enseignants, sub: 'actifs',                    color: '#6366f1' },
    { label: 'Étudiants inscrits', val: loading ? '…' : stats.etudiants,   sub: `${stats.filieres} filières`, color: '#22c55e' },
    { label: 'Absences ce mois',   val: loading ? '…' : stats.absences,    sub: `${stats.justifiees} justifiées`, color: '#f59e0b' },
    { label: 'Taux de présence',   val: loading ? '…' : `${stats.tauxPresence}%`, sub: 'global',             color: '#06b6d4' },
  ]

  const donutData = [
    { label: 'Non justifiées', val: Math.max(stats.absences - stats.justifiees, 0), color: '#e24b4a' },
    { label: 'Justifiées',     val: stats.justifiees, color: '#22c55e' },
    { label: 'En attente',     val: 0,                color: '#f59e0b' },
    { label: 'Retards',        val: 0,                color: '#6366f1' },
  ]

  return (
    <div className="db">
      <div className="db-topbar">
        <div>
          <h2>Tableau de bord</h2>
          <p>GES-ABS — Gestion des absences · MBDS</p>
        </div>
        <span className="db-date">{date}</span>
      </div>

      <div className="db-stats">
        {statsDisplay.map(s => (
          <div className="db-stat" key={s.label}>
            <div className="db-stat-label">{s.label}</div>
            <div className="db-stat-val">{s.val}</div>
            <div className="db-stat-sub">
              <span className="db-dot" style={{ background: s.color }} />
              <span style={{ color: s.color }}>{s.sub}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="db-charts">
        <div className="db-card">
          <div className="db-card-head">
            <span className="db-card-title">Absences par semaine</span>
            <span className="db-card-sub">6 dernières semaines</span>
          </div>
          <div style={{ height: 160, position: 'relative' }}>
            {loading
              ? <div className="db-skeleton" style={{ height: '100%' }} />
              : <canvas ref={lineRef} />
            }
          </div>
        </div>

        <div className="db-card">
          <div className="db-card-head">
            <span className="db-card-title">Répartition des statuts</span>
            <span className="db-card-sub">total</span>
          </div>
          <div className="db-donut-wrap">
            {loading
              ? <div className="db-skeleton" style={{ width: 110, height: 110, borderRadius: '50%', flexShrink: 0 }} />
              : <canvas ref={donutRef} width="110" height="110" style={{ flexShrink: 0 }} />
            }
            <div className="db-donut-legend">
              {donutData.map(d => (
                <div className="db-donut-row" key={d.label}>
                  <span className="db-dot" style={{ background: d.color }} />
                  <span>{d.label}</span>
                  <strong>{loading ? '…' : d.val}</strong>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="db-bottom">
        <div className="db-card">
          <div className="db-card-head">
            <span className="db-card-title">Absences par filière</span>
          </div>
          <div className="db-bars">
            {loading
              ? Array(4).fill(0).map((_, i) => <div key={i} className="db-skeleton" style={{ height: 12, borderRadius: 4 }} />)
              : absParFiliere.length === 0
                ? <p style={{ fontSize: 12, color: 'var(--text2)' }}>Aucune donnée</p>
                : absParFiliere.map(r => (
                  <div className="db-bar-row" key={r.label}>
                    <span className="db-bar-label">{r.label}</span>
                    <div className="db-bar-track">
                      <div className="db-bar-fill" style={{ width: `${r.pct}%`, background: '#6366f1' }} />
                    </div>
                    <span className="db-bar-num">{r.val}</span>
                  </div>
                ))
            }
          </div>
        </div>

        <div className="db-card">
          <div className="db-card-head">
            <span className="db-card-title">Top matières absences</span>
          </div>
          <div className="db-bars">
            {loading
              ? Array(4).fill(0).map((_, i) => <div key={i} className="db-skeleton" style={{ height: 12, borderRadius: 4 }} />)
              : absParMatiere.length === 0
                ? <p style={{ fontSize: 12, color: 'var(--text2)' }}>Aucune donnée</p>
                : absParMatiere.map(r => (
                  <div className="db-bar-row" key={r.label}>
                    <span className="db-bar-label">{r.label}</span>
                    <div className="db-bar-track">
                      <div className="db-bar-fill" style={{ width: `${r.pct}%`, background: '#f59e0b' }} />
                    </div>
                    <span className="db-bar-num">{r.val}</span>
                  </div>
                ))
            }
          </div>
        </div>

        <div className="db-card">
          <div className="db-card-head">
            <span className="db-card-title">Activité récente</span>
          </div>
          <div className="db-activity">
            {loading
              ? Array(4).fill(0).map((_, i) => <div key={i} className="db-skeleton" style={{ height: 14, borderRadius: 4, marginBottom: 10 }} />)
              : activity.length === 0
                ? <p style={{ fontSize: 12, color: 'var(--text2)' }}>Aucune activité</p>
                : activity.map((a, i) => (
                  <div className="db-act-row" key={i}>
                    <span className="db-act-dot" style={{ background: a.color }} />
                    <div className="db-act-text">
                      {a.text} — <span className="db-act-muted">{a.sub}</span>
                    </div>
                    <span className="db-act-time">{a.time}</span>
                  </div>
                ))
            }
          </div>
        </div>
      </div>
    </div>
  )
}