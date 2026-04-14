import { useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { X, AlertTriangle } from 'lucide-react'
import { MOCK_COLUMNS } from '../mockData.js'

const TYPE_COLORS = {
  'float64': '#1B6CF2',
  'int64':   '#00C9A7',
  'object':  '#FF8C42',
}

function nullColor(p) {
  if (p > 15) return 'var(--red)'
  if (p > 5)  return 'var(--orange)'
  return 'var(--teal)'
}

function MiniDistribution({ values, type }) {
  if (type === 'object') {
    const freq = {}
    values.filter(Boolean).forEach(v => { freq[String(v)] = (freq[String(v)] || 0) + 1 })
    const data = Object.entries(freq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([name, count]) => ({ name: name.length > 10 ? name.slice(0, 10) + '…' : name, count }))
    return (
      <ResponsiveContainer width="100%" height={60}>
        <BarChart data={data} margin={{ top: 0, right: 0, bottom: 0, left: -28 }}>
          <XAxis dataKey="name" tick={{ fill: 'var(--text-3)', fontSize: 8, fontFamily: 'var(--font-mono)' }} axisLine={false} tickLine={false} />
          <YAxis tick={false} axisLine={false} tickLine={false} />
          <Bar dataKey="count" fill="#FF8C42" radius={[2, 2, 0, 0]} opacity={0.8} maxBarSize={20} />
        </BarChart>
      </ResponsiveContainer>
    )
  }
  const nums = values.filter(v => v !== null && !isNaN(v)).map(Number)
  if (!nums.length) return null
  const min = Math.min(...nums), max = Math.max(...nums)
  const bins = 8
  const binSize = (max - min) / bins || 1
  const hist = Array(bins).fill(0)
  nums.forEach(v => { const b = Math.min(Math.floor((v - min) / binSize), bins - 1); hist[b]++ })
  const data = hist.map((count, i) => ({ name: `${(min + i * binSize).toFixed(0)}`, count }))
  return (
    <ResponsiveContainer width="100%" height={60}>
      <BarChart data={data} margin={{ top: 0, right: 0, bottom: 0, left: -28 }}>
        <XAxis dataKey="name" tick={{ fill: 'var(--text-3)', fontSize: 7, fontFamily: 'var(--font-mono)' }} axisLine={false} tickLine={false} />
        <YAxis tick={false} axisLine={false} tickLine={false} />
        <Bar dataKey="count" fill="#1B6CF2" radius={[2, 2, 0, 0]} opacity={0.8} />
      </BarChart>
    </ResponsiveContainer>
  )
}

function ColumnModal({ col, onClose }) {
  const nums = col.type !== 'object' ? col.values.filter(v => v !== null && !isNaN(v)).map(Number) : []
  const mean = nums.length ? (nums.reduce((a, b) => a + b, 0) / nums.length).toFixed(1) : '—'
  const max  = nums.length ? Math.max(...nums).toLocaleString() : '—'
  const min  = nums.length ? Math.min(...nums).toLocaleString() : '—'

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(8,15,30,0.85)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 32 }}
      onClick={onClose}
    >
      <div
        style={{ background: 'var(--navy-3)', border: '1px solid var(--border-2)', borderRadius: 16, width: '100%', maxWidth: 560, overflow: 'hidden' }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ padding: '18px 24px', background: 'var(--navy-4)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <span className="col-name" style={{ fontSize: 14 }}>{col.name}</span>
            <span className="col-type-chip" style={{ marginLeft: 10 }}>{col.type}</span>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onClose}><X size={14} /></button>
        </div>
        <div style={{ padding: 24 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 20 }}>
            {[
              { label: 'Null %',    val: `${col.nullPct}%`,    color: nullColor(col.nullPct) },
              { label: 'Unique %',  val: `${col.uniquePct}%`,  color: 'var(--blue-2)' },
              { label: 'Outlier %', val: `${col.outlierPct}%`, color: col.outlierPct > 2 ? 'var(--orange)' : 'var(--teal)' },
              { label: 'Samples',   val: col.values.length,    color: 'var(--text-2)' },
            ].map(s => (
              <div key={s.label} style={{ background: 'var(--navy-4)', borderRadius: 8, padding: '12px 14px', textAlign: 'center' }}>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 22, color: s.color }}>{s.val}</div>
                <div style={{ fontSize: 10, color: 'var(--text-3)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>

          {col.type !== 'object' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 20 }}>
              {[{ label: 'Mean', val: mean }, { label: 'Min', val: min }, { label: 'Max', val: max }].map(s => (
                <div key={s.label} style={{ background: 'var(--navy-4)', borderRadius: 8, padding: '10px 14px', textAlign: 'center' }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-1)', fontFamily: 'var(--font-mono)' }}>{s.val}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>{s.label}</div>
                </div>
              ))}
            </div>
          )}

          <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 8 }}>
            Distribution
          </div>
          <MiniDistribution values={col.values} type={col.type} />

          <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 8 }}>
              Sample Values
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {col.values.slice(0, 8).map((v, i) => (
                <span key={i} style={{
                  fontFamily: 'var(--font-mono)', fontSize: 11, padding: '3px 8px',
                  borderRadius: 5, border: '1px solid var(--border)',
                  background: v === null ? 'var(--red-dim)' : 'var(--surface-2)',
                  color: v === null ? 'var(--red)' : 'var(--text-2)',
                  fontStyle: v === null ? 'italic' : 'normal',
                }}>
                  {v === null ? 'null' : String(v).length > 16 ? String(v).slice(0, 16) + '…' : String(v)}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function ColumnProfileScreen() {
  const [selected, setSelected] = useState(null)

  return (
    <div className="page">
      <div className="page-header">
        <div className="breadcrumb">
          <span>sales_data_q1_2024.csv</span>
          <span>›</span>
          <span>Column Profiles</span>
        </div>
        <h2>Column Profiles</h2>
        <p>Click any column card to explore detailed statistics</p>
      </div>

      <div className="column-grid">
        {MOCK_COLUMNS.map(col => (
          <div key={col.name} className="column-card" onClick={() => setSelected(col)}>
            <div className="column-card-header">
              <span className="col-name" style={{ fontSize: 13 }}>{col.name}</span>
              <span className="col-type-chip" style={{ color: TYPE_COLORS[col.type] || 'var(--text-3)' }}>{col.type}</span>
            </div>
            <div className="column-card-body">
              <div className="col-stat-row">
                <div className="col-stat">
                  <div className="stat-val" style={{ color: nullColor(col.nullPct) }}>{col.nullPct}%</div>
                  <div className="stat-label">Null</div>
                </div>
                <div className="col-stat">
                  <div className="stat-val" style={{ color: 'var(--blue-2)' }}>{col.uniquePct}%</div>
                  <div className="stat-label">Unique</div>
                </div>
                <div className="col-stat">
                  <div className="stat-val" style={{ color: col.outlierPct > 2 ? 'var(--orange)' : 'var(--teal)' }}>{col.outlierPct}%</div>
                  <div className="stat-label">Outlier</div>
                </div>
              </div>

              <MiniDistribution values={col.values} type={col.type} />

              {col.nullPct > 10 && (
                <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--orange)', fontFamily: 'var(--font-mono)' }}>
                  <AlertTriangle size={11} /> High null rate
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {selected && <ColumnModal col={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}
