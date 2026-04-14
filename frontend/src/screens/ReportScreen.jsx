import { useState } from 'react'
import { Download, FileText, RefreshCw, CheckCircle, Sparkles, Shield } from 'lucide-react'
import { DQ_SCORES, MOCK_ISSUES } from '../mockData.js'

export default function ReportScreen() {
  const [downloading, setDownloading] = useState(false)
  const [downloaded, setDownloaded] = useState(false)

  const fixed = MOCK_ISSUES.filter(i => i.fixed).length
  const total = MOCK_ISSUES.length
  const date  = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })

  const handleDownload = () => {
    setDownloading(true)
    setTimeout(() => { setDownloading(false); setDownloaded(true) }, 2200)
  }

  const dimRows = [
    { label: 'Completeness', score: DQ_SCORES.completeness, weight: '25 pts' },
    { label: 'Uniqueness',   score: DQ_SCORES.uniqueness,   weight: '25 pts' },
    { label: 'Consistency',  score: DQ_SCORES.consistency,  weight: '20 pts' },
    { label: 'Validity',     score: DQ_SCORES.validity,     weight: '20 pts' },
    { label: 'Accuracy',     score: DQ_SCORES.accuracy,     weight: '10 pts' },
  ]

  const scoreColor = (s) => s >= 80 ? 'var(--teal)' : s >= 50 ? 'var(--yellow)' : 'var(--red)'

  return (
    <div className="page">
      <div className="page-header">
        <div className="breadcrumb">
          <span>sales_data_q1_2024.csv</span>
          <span>›</span>
          <span>Export Report</span>
        </div>
        <h2>Data Quality Certificate</h2>
        <p>Review your audit summary and download the PDF certificate</p>
      </div>

      <div className="report-layout">
        {/* Certificate Preview */}
        <div className="cert-preview">
          <div className="cert-cover">
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: 16 }}>
                  DQSense · Data Quality Report
                </div>
                <div className="cert-score-badge">
                  <span className="score">{DQ_SCORES.overall}</span>
                  <span className="score-sub">/100</span>
                </div>
                <div className="cert-title">sales_data_q1_2024.csv</div>
                <div className="cert-subtitle">Audited on {date} · 4,652 rows · 8 columns</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <Shield size={40} color="rgba(27,108,242,0.3)" />
              </div>
            </div>
          </div>

          <div className="cert-section">
            <div className="cert-section-title">Executive Summary</div>
            <div style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.7, fontStyle: 'italic' }}>
              "Dataset scores <strong style={{ color: 'var(--yellow)' }}>63/100</strong> — Needs Attention before production use.
              Critical issues detected in Revenue and Customer Name columns. {fixed} of {total} issues resolved.
              Recommend fixing missing value patterns and near-duplicate customer names before ML modeling."
            </div>
          </div>

          <div className="cert-section">
            <div className="cert-section-title">Dimension Scores</div>
            {dimRows.map(d => (
              <div key={d.label} style={{ display: 'flex', alignItems: 'center', marginBottom: 10 }}>
                <div style={{ flex: 1, fontSize: 13, color: 'var(--text-2)' }}>{d.label}</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-3)', marginRight: 12 }}>{d.weight}</div>
                <div style={{ width: 80, height: 6, background: 'var(--navy-5)', borderRadius: 3, overflow: 'hidden', marginRight: 10 }}>
                  <div style={{ width: `${d.score}%`, height: '100%', background: scoreColor(d.score), borderRadius: 3, transition: 'width 1s ease' }} />
                </div>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 14, color: scoreColor(d.score), width: 32, textAlign: 'right' }}>{d.score}</div>
              </div>
            ))}
          </div>

          <div className="cert-section">
            <div className="cert-section-title">Issues Summary</div>
            {[
              { label: 'Critical Issues', val: MOCK_ISSUES.filter(i => i.severity === 'critical').length, color: 'var(--red)' },
              { label: 'Warnings',        val: MOCK_ISSUES.filter(i => i.severity === 'warning').length,  color: 'var(--orange)' },
              { label: 'Minor Issues',    val: MOCK_ISSUES.filter(i => i.severity === 'minor').length,    color: 'var(--teal)' },
              { label: 'Issues Fixed',    val: `${fixed} / ${total}`,                                     color: 'var(--blue-2)' },
            ].map(r => (
              <div key={r.label} className="cert-row">
                <span className="label">{r.label}</span>
                <span className="value" style={{ color: r.color }}>{r.val}</span>
              </div>
            ))}
          </div>

          <div className="cert-section" style={{ borderBottom: 'none' }}>
            <div className="cert-section-title">Top Recommendations</div>
            {[
              'Fix Missing_Revenue zero-values on weekends before time-series analysis',
              'Deduplicate Customer_Name column to fix 12% customer count inflation',
              'Standardize Order_Date format across all regional data sources',
            ].map((r, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 8, fontSize: 12.5, color: 'var(--text-2)', lineHeight: 1.5 }}>
                <span style={{ color: 'var(--blue-2)', fontWeight: 700, flexShrink: 0 }}>{i + 1}.</span>
                {r}
              </div>
            ))}
          </div>

          <div style={{ padding: '14px 24px', background: 'var(--navy-4)', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <CheckCircle size={13} color="var(--teal)" />
            <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-3)' }}>
              Audited by DQSense · AI-Powered Data Quality Platform · {date}
            </span>
          </div>
        </div>

        {/* Action Panel */}
        <div className="report-actions">
          <div className="action-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--blue-glow)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <FileText size={18} color="var(--blue-2)" />
              </div>
              <h3>PDF Certificate</h3>
            </div>
            <p>6-page Data Quality Report with column-level breakdown, AI diagnoses, and certification footer.</p>
            <button
              className={`btn btn-primary btn-full${downloading ? ' disabled' : ''}`}
              onClick={handleDownload}
              disabled={downloading}
            >
              {downloading ? (
                <><div style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} /> Generating PDF...</>
              ) : downloaded ? (
                <><CheckCircle size={15} /> Downloaded!</>
              ) : (
                <><Download size={15} /> Download PDF</>
              )}
            </button>
            {downloaded && (
              <div style={{ marginTop: 8, fontSize: 11, color: 'var(--teal)', fontFamily: 'var(--font-mono)', textAlign: 'center' }}>
                ✓ DQSense_Report_{date.replace(/ /g, '_')}.pdf saved
              </div>
            )}
          </div>

          <div className="action-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--teal-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Sparkles size={18} color="var(--teal)" />
              </div>
              <h3>AI Summary</h3>
            </div>
            <p>Get an executive-level AI-written summary of your dataset health — ready to paste into a stakeholder email.</p>
            <button className="btn btn-secondary btn-full">
              <Sparkles size={15} /> Generate Summary
            </button>
          </div>

          <div className="action-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--orange-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <RefreshCw size={18} color="var(--orange)" />
              </div>
              <h3>Re-Audit</h3>
            </div>
            <p>After applying fixes, run a fresh audit to see your improved DQ Score and updated certificate.</p>
            <button className="btn btn-secondary btn-full">
              <RefreshCw size={15} /> Run New Audit
            </button>
          </div>

          <div style={{ background: 'var(--navy-3)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '16px 20px' }}>
            <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 12 }}>
              Audit Stats
            </div>
            {[
              { label: 'Dataset',      val: 'sales_data_q1_2024.csv' },
              { label: 'Rows',         val: '4,652' },
              { label: 'Columns',      val: '8' },
              { label: 'Audit Time',   val: '3.8 seconds' },
              { label: 'Issues Found', val: total },
              { label: 'Fixed',        val: fixed },
            ].map(r => (
              <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginBottom: 7 }}>
                <span style={{ color: 'var(--text-3)' }}>{r.label}</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-1)', fontWeight: 600 }}>{r.val}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
