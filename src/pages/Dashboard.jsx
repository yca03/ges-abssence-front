import { useEffect, useRef, useState } from 'react'
import { Chart, registerables } from 'chart.js'
import './Dashboard.css'
import {
  enseignantService,
  etudiantService,
  filiereService,
  matiereService,
  presenceService,
  justificationService,
} from '../services/api'

Chart.register(...registerables)

const normalize = (data) => {
  if (!data) return []
  if (Array.isArray(data)) return data
  return data['hydra:member'] || data['member'] || []
}

const isAbsent = (p) =>
  p.status === false ||
  p.status === 0 ||
  p.statut === 'absent' ||
  p.statut === 'ABSENT'

export default function Dashboard() {
  const lineRef    = useRef(null)
  const donutRef   = useRef(null)
  const lineChart  = useRef(null)
  const donutChart = useRef(null)

  const [loading, setLoading]         = useState(true)
  const [chartData, setChartData]     = useState(null)
  const [stats, setStats]             = useState({
    enseignants: 0, etudiants: 0, filieres: 0,
    absences: 0, justifiees: 0, tauxPresence: 0
  })
  const [absParFiliere, setAbsParFiliere] = useState([])
  const [absParMatiere, setAbsParMatiere] = useState([])
  const [activity, setActivity]           = useState([])

  // ── ETAPE 1 : charger les données API
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

        // Absences par filière
        const filMap = {}
        filieres.forEach(f => {
          filMap[f.id] = { label: f.libelle || f.nom || `Filière ${f.id}`, val: 0 }
        })
        absences.forEach(p => {
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

        // Absences par matière
        const matMap = {}
        matieres.forEach(m => {
          matMap[m.id] = { label: m.nom || `Matière ${m.id}`, val: 0 }
        })
        absences.forEach(p => {
          const mIri = p.enseignements?.matiere?.['@id'] || p.enseignements?.matiere
          const mId  = mIri?.toString().split('/').pop()
          if (mId && matMap[mId]) matMap[mId].val++
        })
        const matArr = Object.values(matMap)
          .filter(m => m.val > 0)
          .sort((a, b) => b.val - a.val)
          .slice(0, 6)
        const maxMat = matArr[0]?.val || 1
        setAbsParMatiere(matArr.map(m => ({ ...m, pct: Math.round((m.val / maxMat) * 100) })))

        // Activité récente
        const recent = [...presences]
          .sort((a, b) => new Date(b.date || b.createdAt || 0) - new Date(a.date || a.createdAt || 0))
          .slice(0, 5)
          .map(p => {
            const absent  = isAbsent(p)
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

        // Stocker les données pour les graphes
        const now   = new Date()
        const weeks = Array.from({ length: 6 }, (_, i) => {
          const start = new Date(now)
          start.setDate(now.getDate() - (5 - i) * 7)
          const end = new Date(start)
          end.setDate(start.getDate() + 6)
          return { label: `S${i + 1}`, start, end }
        })

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

        const nbNonJust = Math.max(absences.length - nbJustifiees, 0)
        const nbAttente = justifs.filter(j => !j.valide && !j.validated).length

        setChartData({
          weekLabels:   weeks.map(w => w.label),
          absPerWeek,
          justPerWeek,
          nbNonJust,
          nbJustifiees,
          nbAttente,
        })

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

  // ── ETAPE 2 : construire les graphes APRES que React a rendu les canvas
  // Ce useEffect se déclenche uniquement quand chartData et loading sont prêts
  useEffect(() => {
    if (loading || !chartData) return
    if (!lineRef.current || !donutRef.current) return

    const gridColor = 'rgba(0,0,0,0.06)'
    const textColor = '#94a3b8'

    // Graphe LINE
    if (lineChart.current) {
      lineChart.current.destroy()
      lineChart.current = null
    }
    lineChart.current = new Chart(lineRef.current, {
      type: 'line',
      data: {
        labels: chartData.weekLabels,
        datasets: [
          {
            label: 'Absences',
            data: chartData.absPerWeek,
            borderColor: '#e24b4a',
            backgroundColor: 'rgba(226,75,74,0.08)',
            borderWidth: 2,
            pointRadius: 4,
            pointBackgroundColor: '#e24b4a',
            tension: 0.4,
            fill: true,
          },
          {
            label: 'Justifiées',
            data: chartData.justPerWeek,
            borderColor: '#22c55e',
            backgroundColor: 'rgba(34,197,94,0.06)',
            borderWidth: 2,
            pointRadius: 4,
            pointBackgroundColor: '#22c55e',
            tension: 0.4,
            fill: true,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
            align: 'end',
            labels: {
              boxWidth: 8,
              boxHeight: 8,
              usePointStyle: true,
              color: textColor,
              padding: 14,
            },
          },
        },
        scales: {
          x: { grid: { color: gridColor }, ticks: { color: textColor } },
          y: { grid: { color: gridColor }, ticks: { color: textColor }, beginAtZero: true },
        },
      },
    })

    // Graphe DONUT
    if (donutChart.current) {
      donutChart.current.destroy()
      donutChart.current = null
    }
    donutChart.current = new Chart(donutRef.current, {
      type: 'doughnut',
      data: {
        labels: ['Non justifiées', 'Justifiées', 'En attente', 'Retards'],
        datasets: [{
          data: [chartData.nbNonJust, chartData.nbJustifiees, chartData.nbAttente, 0],
          backgroundColor: ['#e24b4a', '#22c55e', '#f59e0b', '#6366f1'],
          borderWidth: 0,
          hoverOffset: 4,
        }],
      },
      options: {
        responsive: false,
        cutout: '68%',
        plugins: { legend: { display: false } },
      },
    })

  }, [loading, chartData])  // ← se déclenche APRES le render avec les canvas visibles

  const date = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  })

  const statsDisplay = [
    { label: 'Enseignants actifs', val: loading ? '…' : stats.enseignants, sub: 'actifs',                         color: '#6366f1' },
    { label: 'Étudiants inscrits', val: loading ? '…' : stats.etudiants,   sub: `${stats.filieres} filières`,     color: '#22c55e' },
    { label: 'Absences ce mois',   val: loading ? '…' : stats.absences,    sub: `${stats.justifiees} justifiées`, color: '#f59e0b' },
    { label: 'Taux de présence',   val: loading ? '…' : `${stats.tauxPresence}%`, sub: 'global',                  color: '#06b6d4' },
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
          <div className="db-chart-box">
            {loading
              ? <div className="db-skeleton db-skeleton-full" />
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
              ? <div className="db-skeleton db-skeleton-circle" />
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
              ? Array(4).fill(0).map((_, i) => <div key={i} className="db-skeleton db-skeleton-bar" />)
              : absParFiliere.length === 0
                ? <p className="db-empty">Aucune donnée</p>
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
              ? Array(4).fill(0).map((_, i) => <div key={i} className="db-skeleton db-skeleton-bar" />)
              : absParMatiere.length === 0
                ? <p className="db-empty">Aucune donnée</p>
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
              ? Array(4).fill(0).map((_, i) => <div key={i} className="db-skeleton db-skeleton-bar" />)
              : activity.length === 0
                ? <p className="db-empty">Aucune activité</p>
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