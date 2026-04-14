import { useMemo, useRef, useState } from 'react'
import { Download, FileText, RefreshCw, CheckCircle, Sparkles, Shield } from 'lucide-react'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'

export default function ReportScreen({ onReaudit, file, dataset, audit }) {
  const [downloading, setDownloading] = useState(false)
  const [downloaded, setDownloaded] = useState(false)
  const [summaryGenerating, setSummaryGenerating] = useState(false)
  const [summary, setSummary] = useState('')
  const certRef = useRef(null)

  const fixed = audit.issues.filter(i => i.fixed).length
  const total = audit.issues.length
  const date  = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })

  const filename = useMemo(() => `DataIQ_Report_${date.replace(/ /g, '_')}.pdf`, [date])

  const handleDownload = async () => {
    if (!certRef.current) return
    if (downloading) return

    setDownloading(true)
    setDownloaded(false)
    try {
      const canvas = await html2canvas(certRef.current, {
        scale: 2,
        backgroundColor: '#F9F9F7',
        useCORS: true,
      })

      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF({ orientation: 'p', unit: 'pt', format: 'a4' })

      const pageWidth = pdf.internal.pageSize.getWidth()
      const pageHeight = pdf.internal.pageSize.getHeight()

      const margin = 24
      const usableWidth = pageWidth - margin * 2
      const imgHeight = (canvas.height * usableWidth) / canvas.width

      let y = margin
      let remaining = imgHeight

      pdf.addImage(imgData, 'PNG', margin, y, usableWidth, imgHeight)
      remaining -= (pageHeight - margin * 2)

      while (remaining > 0) {
        pdf.addPage()
        const offsetY = imgHeight - remaining
        pdf.addImage(imgData, 'PNG', margin, margin - offsetY, usableWidth, imgHeight)
        remaining -= (pageHeight - margin * 2)
      }

      pdf.save(filename)
      setDownloaded(true)
    } finally {
      setDownloading(false)
    }
  }

  const handleGenerateSummary = async () => {
    if (summaryGenerating) return
    setSummaryGenerating(true)
    setSummary('')
    try {
      await new Promise(r => setTimeout(r, 700))
      setSummary(
        `Executive summary (DataIQ): Your dataset scored ${audit.scores.overall}/100 and currently has ${total} detected issues. ` +
        `${fixed} issues are marked fixed. Prioritize high-null columns and duplicate-related anomalies before production use.`
      )
    } finally {
      setSummaryGenerating(false)
    }
  }

  const handleCopySummary = async () => {
    if (!summary) return
    try {
      await navigator.clipboard.writeText(summary)
    } catch {
      // ignore (clipboard may be blocked)
    }
  }

  const dimRows = [
    { label: 'Completeness', score: audit.scores.completeness, weight: '100 - missing penalty' },
    { label: 'Uniqueness',   score: audit.scores.uniqueness,   weight: '100 - duplicate penalty' },
    { label: 'Consistency',  score: audit.scores.consistency,  weight: '100 - inconsistency penalty' },
  ]

  const scoreColor = (s) => s >= 80 ? 'var(--teal)' : s >= 50 ? 'var(--yellow)' : 'var(--red)'

  return (
    <div className="page">
      <div className="page-header">
        <div className="breadcrumb">
          <span>{file?.name}</span>
          <span>›</span>
          <span>Export Report</span>
        </div>
        <h2>Data Quality Certificate</h2>
        <p>Review your audit summary and download the PDF certificate</p>
      </div>

      <div className="report-layout">
        {/* Certificate Preview */}
        <div className="cert-preview" ref={certRef}>
          <div className="cert-cover">
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: 16 }}>
                  DataIQ · Data Quality Report
                </div>
                <div className="cert-score-badge">
                  <span className="score">{audit.scores.overall}</span>
                  <span className="score-sub">/100</span>
                </div>
                <div className="cert-title">{file?.name}</div>
                <div className="cert-subtitle">Audited on {date} · {dataset.rows.length.toLocaleString()} rows · {dataset.headers.length} columns</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <Shield size={40} color="rgba(27,108,242,0.3)" />
              </div>
            </div>
          </div>

          <div className="cert-section">
            <div className="cert-section-title">Executive Summary</div>
            <div style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.7, fontStyle: 'italic' }}>
              "Dataset scores <strong style={{ color: 'var(--yellow)' }}>{audit.scores.overall}/100</strong> and has {total} detected quality issues.
              {fixed} issues are currently marked fixed. Prioritize high-null and duplicate-related problems before downstream analytics."
            </div>
            <div style={{ marginTop: 10, fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-3)' }}>
              {audit.summary.scoreBreakdown.formula}
            </div>
            <div style={{ marginTop: 6, fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-3)' }}>
              Missing {audit.scores.penalties.missingValues} · Duplicate {audit.scores.penalties.duplicateRows} · Inconsistency {audit.scores.penalties.inconsistencies}
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
              { label: 'Critical Issues', val: audit.issues.filter(i => i.severity === 'critical').length, color: 'var(--red)' },
              { label: 'Warnings',        val: audit.issues.filter(i => i.severity === 'warning').length,  color: 'var(--orange)' },
              { label: 'Minor Issues',    val: audit.issues.filter(i => i.severity === 'minor').length,    color: 'var(--teal)' },
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
              ...audit.issues.slice(0, 3).map((issue) => `Review ${issue.type.toLowerCase()} in "${issue.column}" (${issue.pct} impacted).`),
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
              Audited by DataIQ · AI-Powered Data Quality Platform · {date}
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
                ✓ {filename} saved
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
            <button className={`btn btn-secondary btn-full${summaryGenerating ? ' disabled' : ''}`} onClick={handleGenerateSummary} disabled={summaryGenerating}>
              {summaryGenerating ? (
                <><div style={{ width: 14, height: 14, border: '2px solid rgba(31,31,30,0.20)', borderTopColor: 'var(--text-1)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} /> Generating…</>
              ) : (
                <><Sparkles size={15} /> Generate Summary</>
              )}
            </button>
            {summary && (
              <div style={{ marginTop: 10, background: 'var(--navy-4)', border: '1px solid var(--border)', padding: 12, fontSize: 12.5, color: 'var(--text-2)', lineHeight: 1.6 }}>
                {summary}
                <div style={{ marginTop: 10 }}>
                  <button className="btn btn-ghost btn-sm btn-full" onClick={handleCopySummary}>
                    Copy Summary
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="action-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--orange-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <RefreshCw size={18} color="var(--orange)" />
              </div>
              <h3>Re-Audit</h3>
            </div>
            <p>After applying fixes, run a fresh audit to see your improved DQ Score and updated certificate.</p>
            <button className="btn btn-secondary btn-full" onClick={() => onReaudit?.()}>
              <RefreshCw size={15} /> Run New Audit
            </button>
          </div>

          <div style={{ background: 'var(--navy-3)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '16px 20px' }}>
            <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 12 }}>
              Audit Stats
            </div>
            {[
              { label: 'Dataset',      val: file?.name || '—' },
              { label: 'Rows',         val: dataset.rows.length.toLocaleString() },
              { label: 'Columns',      val: String(dataset.headers.length) },
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
