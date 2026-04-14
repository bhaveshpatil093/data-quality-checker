import { useEffect, useState } from 'react'
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts'
import { AlertTriangle, CheckCircle, Info, ArrowRight } from 'lucide-react'
import { DQ_SCORES, MOCK_ISSUES } from '../mockData.js'

const DIMS = [
  { key: 'completeness', label: 'Complete',   color: '#1B6CF2' },
  { key: 'uniqueness',   label: 'Unique',     color: '#00C9A7' },
  { key: 'consistency',  label: 'Consistent', color: '#FF8C42' },
  { key: 'validity',     label: 'Valid',      color: '#FF4757' },
  { key: 'accuracy',     label: 'Accurate',   color: '#FFD166' },
]

function scoreClass(s) {
  if (s >= 80) return 'green'
  if (s >= 50) return 'yellow'
  return 'red'
}
function scoreLabel(s) {
  if (s >= 80) return 'Ready for Analysis'
  if (s >= 50) return 'Needs Attention'
  return 'Not Suitable for Use'
}

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: 'var(--navy-3)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 14px', fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--text-1)' }}>
      {payload[0].name}: <strong>{payload[0].value}</strong>
    </div>
  )
}

export default function DashboardScreen({ onNavigate }) {
  const [animatedScore, setAnimatedScore] = useState(0)
  const [dimScores, setDimScores] = useState({ completeness: 0, uniqueness: 0, consistency: 0, validity: 0, accuracy: 0 })

  useEffect(() => {
    let frame
    let start = null
    const target = DQ_SCORES.overall
    const animate = (ts) => {
      if (!start) start = ts
      const progress = Math.min((ts - start) / 900, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setAnimatedScore(Math.round(eased * target))
      if (progress < 1) frame = requestAnimationFrame(animate)
    }
    frame = requestAnimationFrame(animate)
    setTimeout(() => setDimScores(DQ_SCORES), 300)
    return () => cancelAnimationFrame(frame)
  }, [])

  const critical = MOCK_ISSUES.filter(i => i.severity === 'critical').length
  const warning  = MOCK_ISSUES.filter(i => i.severity === 'warning').length
  const minor    = MOCK_ISSUES.filter(i => i.severity === 'minor').length

  const radarData = DIMS.map(d => ({
    subject: d.label,
    score: DQ_SCORES[d.key],
    fullMark: 100,
  }))

  const barData = DIMS.map(d => ({
    name: d.label,
    score: DQ_SCORES[d.key],
    color: d.color,
  }))

  const cls = scoreClass(animatedScore)

  return (
    <div className="page">
      <div className="page-header">
        <div className="breadcrumb">
          <span>sales_data_q1_2024.csv</span>
          <span>›</span>
          <span>Dashboard</span>
        </div>
        <h2>Quality Overview</h2>
        <p>4,652 rows · 8 columns · Audited just now</p>
      </div>

      {/* Score + Dimensions */}
      <div className="score-section">
        <div className="score-card">
          <div className="score-ring-label">DQ Score</div>
          <div className={`score-number ${cls}`}>{animatedScore}</div>
          <div className={`score-label ${cls}`}>{scoreLabel(animatedScore)}</div>
          <div className="score-sublabel">out of 100 points</div>

          <div style={{ marginTop: 20, width: '100%', height: 130 }}>
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData} margin={{ top: 0, right: 20, bottom: 0, left: 20 }}>
                <PolarGrid stroke="rgba(255,255,255,0.06)" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: 'var(--text-3)', fontSize: 9, fontFamily: 'var(--font-mono)' }} />
                <Radar name="Score" dataKey="score" stroke="#1B6CF2" fill="#1B6CF2" fillOpacity={0.15} strokeWidth={2} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="dimension-grid">
            {DIMS.map(d => {
              const s = dimScores[d.key]
              return (
                <div key={d.key} className="dim-card" onClick={() => onNavigate('issues')}>
                  <div className="dim-label">{d.label}</div>
                  <div className="dim-score" style={{ color: d.color }}>{s}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>/ 100 pts</div>
                  <div className="dim-progress">
                    <div className="dim-progress-fill" style={{ width: `${s}%`, background: d.color }} />
                  </div>
                </div>
              )
            })}
          </div>

          <div className="card" style={{ padding: '16px 20px' }}>
            <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-3)', marginBottom: 10, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              Score Breakdown
            </div>
            <ResponsiveContainer width="100%" height={90}>
              <BarChart data={barData} margin={{ top: 0, right: 0, bottom: 0, left: -24 }}>
                <XAxis dataKey="name" tick={{ fill: 'var(--text-3)', fontSize: 10, fontFamily: 'var(--font-mono)' }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fill: 'var(--text-3)', fontSize: 9 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                <Bar dataKey="score" radius={[4, 4, 0, 0]} maxBarSize={36}>
                  {barData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} opacity={0.85} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Issue summary */}
      <div className="issue-summary">
        <div className="issue-chip">
          <div className="chip-icon" style={{ background: 'var(--red-dim)' }}>
            <AlertTriangle size={18} color="var(--red)" />
          </div>
          <div>
            <div className="chip-count" style={{ color: 'var(--red)' }}>{critical}</div>
            <div className="chip-label">Critical Issues</div>
          </div>
        </div>
        <div className="issue-chip">
          <div className="chip-icon" style={{ background: 'var(--orange-dim)' }}>
            <Info size={18} color="var(--orange)" />
          </div>
          <div>
            <div className="chip-count" style={{ color: 'var(--orange)' }}>{warning}</div>
            <div className="chip-label">Warnings</div>
          </div>
        </div>
        <div className="issue-chip">
          <div className="chip-icon" style={{ background: 'var(--teal-dim)' }}>
            <CheckCircle size={18} color="var(--teal)" />
          </div>
          <div>
            <div className="chip-count" style={{ color: 'var(--teal)' }}>{minor}</div>
            <div className="chip-label">Minor Issues</div>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'linear-gradient(135deg, rgba(27,108,242,0.12) 0%, rgba(0,201,167,0.06) 100%)', border: '1px solid rgba(27,108,242,0.2)' }}>
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, marginBottom: 4 }}>
            {MOCK_ISSUES.filter(i => !i.fixed).length} issues need your attention
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-3)' }}>
            Review AI diagnoses and apply fixes to improve your DQ Score
          </div>
        </div>
        <button className="btn btn-primary" onClick={() => onNavigate('issues')}>
          View All Issues <ArrowRight size={15} />
        </button>
      </div>
    </div>
  )
}
