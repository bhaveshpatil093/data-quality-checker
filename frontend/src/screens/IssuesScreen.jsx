import { useEffect, useState } from 'react'
import { ChevronDown, ChevronUp, Zap, CheckCircle, RotateCcw, Sparkles } from 'lucide-react'

const SEV_ORDER = { critical: 0, warning: 1, minor: 2 }

export default function IssuesScreen({ file, issues: sourceIssues }) {
  const [issues, setIssues] = useState(sourceIssues)
  const [expanded, setExpanded] = useState(null)
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')

  useEffect(() => {
    setIssues(sourceIssues)
  }, [sourceIssues])

  const filtered = issues
    .filter(i =>
      filter === 'all' ||
      i.severity === filter ||
      (filter === 'fixed' && i.fixed) ||
      (filter === 'pending' && !i.fixed)
    )
    .filter(i =>
      !search ||
      i.column.toLowerCase().includes(search.toLowerCase()) ||
      i.type.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => SEV_ORDER[a.severity] - SEV_ORDER[b.severity])

  const applyFix = (id) => {
    setIssues(prev => prev.map(i => i.id === id ? { ...i, fixed: true } : i))
    setExpanded(null)
  }
  const undoFix = (id) => setIssues(prev => prev.map(i => i.id === id ? { ...i, fixed: false } : i))
  const fixAll = () => setIssues(prev => prev.map(i => ({ ...i, fixed: true })))

  const counts = {
    all: issues.length,
    critical: issues.filter(i => i.severity === 'critical').length,
    warning: issues.filter(i => i.severity === 'warning').length,
    minor: issues.filter(i => i.severity === 'minor').length,
    fixed: issues.filter(i => i.fixed).length,
    pending: issues.filter(i => !i.fixed).length,
  }

  const FILTERS = [
    { key: 'all',      label: 'All' },
    { key: 'critical', label: 'Critical' },
    { key: 'warning',  label: 'Warning' },
    { key: 'minor',    label: 'Minor' },
    { key: 'pending',  label: 'Pending' },
    { key: 'fixed',    label: 'Fixed' },
  ]

  return (
    <div className="page">
      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <div className="breadcrumb">
            <span>{file?.name}</span>
            <span>›</span>
            <span>Issues Panel</span>
          </div>
          <h2>Detected Issues</h2>
          <p>{counts.pending} pending fixes · {counts.fixed} resolved</p>
        </div>
        {counts.pending > 0 && (
          <button className="btn btn-primary" onClick={fixAll}>
            <Zap size={15} /> Fix All Issues
          </button>
        )}
      </div>

      <div className="panel-toolbar">
        {FILTERS.map(f => (
          <button
            key={f.key}
            className={`filter-chip${filter === f.key ? ' active' : ''}`}
            onClick={() => setFilter(f.key)}
          >
            {f.label}
            <span style={{ marginLeft: 5, fontFamily: 'var(--font-mono)', fontSize: 10, opacity: 0.7 }}>
              {counts[f.key]}
            </span>
          </button>
        ))}
        <input
          className="search-box"
          placeholder="Search by column or issue type..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <div className="issues-table-wrap">
        <table className="issues-table">
          <thead>
            <tr>
              <th>Column</th>
              <th>Issue Type</th>
              <th>Dimension</th>
              <th>Severity</th>
              <th>Count</th>
              <th>AI Diagnosis</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(issue => (
              <>
                <tr key={issue.id} style={{ opacity: issue.fixed ? 0.6 : 1, transition: 'opacity 0.2s' }}>
                  <td><span className="col-name">{issue.column}</span></td>
                  <td><span className="issue-type">{issue.type}</span></td>
                  <td>
                    <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-3)', textTransform: 'capitalize' }}>
                      {issue.dimension}
                    </span>
                  </td>
                  <td>
                    <span className={`severity-badge ${issue.severity}`}>
                      {issue.severity === 'critical' ? '●' : issue.severity === 'warning' ? '◐' : '○'} {issue.severity}
                    </span>
                  </td>
                  <td>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                      {issue.count} <span style={{ color: 'var(--text-3)' }}>({issue.pct})</span>
                    </span>
                  </td>
                  <td>
                    <button
                      style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--blue-2)', fontSize: 12, fontFamily: 'var(--font-mono)', padding: 0 }}
                      onClick={() => setExpanded(expanded === issue.id ? null : issue.id)}
                    >
                      <Sparkles size={12} />
                      View Diagnosis
                      {expanded === issue.id ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                    </button>
                  </td>
                  <td>
                    {issue.fixed ? (
                      <span className="fix-status fixed"><CheckCircle size={13} /> Fixed</span>
                    ) : (
                      <span className="fix-status pending">● Pending</span>
                    )}
                  </td>
                  <td>
                    {issue.fixed ? (
                      <button className="btn btn-ghost btn-sm" onClick={() => undoFix(issue.id)}>
                        <RotateCcw size={12} /> Undo
                      </button>
                    ) : (
                      <button className="btn btn-success btn-sm" onClick={() => applyFix(issue.id)}>
                        <Zap size={12} /> Fix
                      </button>
                    )}
                  </td>
                </tr>
                {expanded === issue.id && (
                  <tr key={`${issue.id}-ai`} className="ai-row slide-in">
                    <td colSpan={8}>
                      <div className="ai-diagnosis-box">
                        <div className="ai-badge"><Sparkles size={9} /> AI Diagnosis</div>
                        <div>{issue.diagnosis}</div>
                        <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>Recommended fix:</span>
                          <span style={{ fontSize: 12, color: 'var(--text-1)', fontWeight: 600 }}>{issue.fix}</span>
                          {!issue.fixed && (
                            <button className="btn btn-primary btn-sm" style={{ marginLeft: 'auto' }} onClick={() => applyFix(issue.id)}>
                              <Zap size={12} /> Apply This Fix
                            </button>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>

        {filtered.length === 0 && (
          <div className="empty-state">
            <div className="empty-icon"><CheckCircle size={24} /></div>
            <h3>No issues found</h3>
            <p>Try changing your filter or search query</p>
          </div>
        )}
      </div>
    </div>
  )
}
