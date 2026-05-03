import { useEffect, useRef } from 'react'
import { NavLink } from 'react-router-dom'
import './Dashboard.css'

const stats = [
  { label: 'Enseignants actifs',  val: 24,   sub: '+2 ce mois',            color: '#6366f1' },
  { label: 'Étudiants inscrits',  val: 312,  sub: '6 filières',            color: '#22c55e' },
  { label: 'Absences ce mois',    val: 87,   sub: '12 justifiées',         color: '#f59e0b' },
  { label: 'Taux de présence',    val: '91%',sub: '+3% vs mois dernier',   color: '#06b6d4' },
]

const absFiliere = [
  { label: 'Génie Log.',  val: 28, pct: 82 },
  { label: 'Réseaux',     val: 19, pct: 55 },
  { label: 'BDSI',        val: 16, pct: 47 },
  { label: 'IA & Data',   val: 12, pct: 35 },
  { label: 'Systèmes',    val: 8,  pct: 23 },
  { label: 'Mobile',      val: 4,  pct: 12 },
]

const absMatiere = [
  { label: 'Algorithmique', val: 22, pct: 88 },
  { label: 'Réseaux',       val: 16, pct: 65 },
  { label: 'Bases données', val: 13, pct: 52 },
  { label: 'Maths',         val: 10, pct: 40 },
  { label: 'POO',           val: 7,  pct: 28 },
  { label: 'Anglais',       val: 4,  pct: 16 },
]

const activity = [
  { color: '#6366f1', text: 'Nouveau compte', sub: 'Konan Marie',         time: '2 min' },
  { color: '#f59e0b', text: '3 absences',     sub: 'GL3 / Algorithmique', time: '14 min' },
  { color: '#22c55e', text: 'Justification validée', sub: 'Diallo I.',    time: '1 h' },
  { color: '#6366f1', text: 'Période créée',  sub: 'Semestre 2',          time: 'hier' },
  { color: '#06b6d4', text: 'Filière ajoutée', sub: 'Réseaux & Télécoms', time: 'hier' },
]

export default function Dashboard() {
  const lineRef  = useRef(null)
  const donutRef = useRef(null)
  const lineChart  = useRef(null)
  const donutChart = useRef(null)

  useEffect(() => {
    let Chart
    const load = async () => {
      const mod = await import('https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js')
      Chart = window.Chart
      if (!Chart) return

      Chart.defaults.font.family = 'Inter, system-ui'
      Chart.defaults.font.size = 11

      const gridColor = 'rgba(0,0,0,0.06)'
      const textColor = '#94a3b8'

      if (lineChart.current) lineChart.current.destroy()
      lineChart.current = new Chart(lineRef.current, {
        type: 'line',
        data: {
          labels: ['S1','S2','S3','S4','S5','S6'],
          datasets: [
            {
              label: 'Absences',
              data: [18,24,14,32,20,28],
              borderColor: '#e24b4a',
              backgroundColor: 'rgba(226,75,74,0.08)',
              borderWidth: 2, pointRadius: 4,
              pointBackgroundColor: '#e24b4a',
              tension: 0.4, fill: true
            },
            {
              label: 'Justifiées',
              data: [3,5,2,6,3,4],
              borderColor: '#22c55e',
              backgroundColor: 'rgba(34,197,94,0.06)',
              borderWidth: 2, pointRadius: 4,
              pointBackgroundColor: '#22c55e',
              tension: 0.4, fill: true
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
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

      if (donutChart.current) donutChart.current.destroy()
      donutChart.current = new Chart(donutRef.current, {
        type: 'doughnut',
        data: {
          labels: ['Non justifiées','Justifiées','En attente','Retards'],
          datasets: [{
            data: [75,12,8,21],
            backgroundColor: ['#e24b4a','#22c55e','#f59e0b','#6366f1'],
            borderWidth: 0, hoverOffset: 4
          }]
        },
        options: {
          responsive: false,
          cutout: '68%',
          plugins: { legend: { display: false } }
        }
      })
    }
    load()
    return () => {
      lineChart.current?.destroy()
      donutChart.current?.destroy()
    }
  }, [])

  const date = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  })

  return (
    <div className="db">

      {/* TOPBAR */}
      <div className="db-topbar">
        <div>
          <h2>Tableau de bord</h2>
          <p>GES-ABS — Gestion des absences · MBDS</p>
        </div>
        <span className="db-date">{date}</span>
      </div>

      {/* STATS */}
      <div className="db-stats">
        {stats.map(s => (
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

      {/* CHARTS ROW */}
      <div className="db-charts">
        <div className="db-card">
          <div className="db-card-head">
            <span className="db-card-title">Absences par semaine</span>
            <span className="db-card-sub">6 dernières semaines</span>
          </div>
          <div style={{ height: 160, position: 'relative' }}>
            <canvas ref={lineRef} />
          </div>
        </div>

        <div className="db-card">
          <div className="db-card-head">
            <span className="db-card-title">Répartition des statuts</span>
            <span className="db-card-sub">ce mois</span>
          </div>
          <div className="db-donut-wrap">
            <canvas ref={donutRef} width="110" height="110" style={{ flexShrink: 0 }} />
            <div className="db-donut-legend">
              {[
                { label: 'Non justifiées', val: 75, color: '#e24b4a' },
                { label: 'Justifiées',     val: 12, color: '#22c55e' },
                { label: 'En attente',     val: 8,  color: '#f59e0b' },
                { label: 'Retards',        val: 21, color: '#6366f1' },
              ].map(d => (
                <div className="db-donut-row" key={d.label}>
                  <span className="db-dot" style={{ background: d.color }} />
                  <span>{d.label}</span>
                  <strong>{d.val}</strong>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* BOTTOM ROW */}
      <div className="db-bottom">

        <div className="db-card">
          <div className="db-card-head">
            <span className="db-card-title">Absences par filière</span>
          </div>
          <div className="db-bars">
            {absFiliere.map(r => (
              <div className="db-bar-row" key={r.label}>
                <span className="db-bar-label">{r.label}</span>
                <div className="db-bar-track">
                  <div className="db-bar-fill" style={{ width: `${r.pct}%`, background: '#6366f1' }} />
                </div>
                <span className="db-bar-num">{r.val}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="db-card">
          <div className="db-card-head">
            <span className="db-card-title">Top matières absences</span>
          </div>
          <div className="db-bars">
            {absMatiere.map(r => (
              <div className="db-bar-row" key={r.label}>
                <span className="db-bar-label">{r.label}</span>
                <div className="db-bar-track">
                  <div className="db-bar-fill" style={{ width: `${r.pct}%`, background: '#f59e0b' }} />
                </div>
                <span className="db-bar-num">{r.val}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="db-card">
          <div className="db-card-head">
            <span className="db-card-title">Activité récente</span>
          </div>
          <div className="db-activity">
            {activity.map((a, i) => (
              <div className="db-act-row" key={i}>
                <span className="db-act-dot" style={{ background: a.color }} />
                <div className="db-act-text">
                  {a.text} — <span className="db-act-muted">{a.sub}</span>
                </div>
                <span className="db-act-time">{a.time}</span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}