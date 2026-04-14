import { useEffect, useState, useCallback } from 'react'
import './index.css'
import { Upload, LayoutDashboard, AlertTriangle, BarChart2, FileText, ChevronRight } from 'lucide-react'
import UploadScreen from './screens/UploadScreen.jsx'
import AnalyzingScreen from './screens/AnalyzingScreen.jsx'
import DashboardScreen from './screens/DashboardScreen.jsx'
import IssuesScreen from './screens/IssuesScreen.jsx'
import ColumnProfileScreen from './screens/ColumnProfileScreen.jsx'
import ReportScreen from './screens/ReportScreen.jsx'

const NAV = [
  { id: 'upload',    label: 'Upload',          icon: Upload,          section: 'start',    requiresFile: false },
  { id: 'dashboard', label: 'Dashboard',       icon: LayoutDashboard, section: 'analysis', requiresFile: true  },
  { id: 'issues',    label: 'Issues Panel',    icon: AlertTriangle,   section: 'analysis', requiresFile: true, badge: true },
  { id: 'columns',   label: 'Column Profiles', icon: BarChart2,       section: 'analysis', requiresFile: true  },
  { id: 'report',    label: 'Export Report',   icon: FileText,        section: 'output',   requiresFile: true  },
]

const TITLES = {
  analyzing: 'Analyzing...',
  dashboard: 'Quality Dashboard',
  issues: 'Issues Panel',
  columns: 'Column Profiles',
  report: 'Export Report',
}

export default function App() {
  const [screen, setScreen] = useState('upload')
  const [hasFile, setHasFile] = useState(false)
  const [activeFile, setActiveFile] = useState(null)
  const [dataset, setDataset] = useState({ headers: [], rows: [] })
  const [audit, setAudit] = useState({
    scores: {
      overall: 0,
      completeness: 0,
      uniqueness: 0,
      consistency: 0,
      penalties: { missingValues: 0, duplicateRows: 0, inconsistencies: 0, total: 0 },
    },
    issues: [],
    columns: [],
    summary: { rowCount: 0, columnCount: 0, duplicateRows: 0, missingByColumn: [], scoreBreakdown: { formula: '', penalties: { missingValues: 0, duplicateRows: 0, inconsistencies: 0, total: 0 } } },
  })

  useEffect(() => {
    document.title = 'DataIQ — Data Quality Platform'
  }, [])

  const handleAnalyze = useCallback((file, backendPayload) => {
    setActiveFile(file)
    setDataset({ headers: backendPayload.headers || [], rows: backendPayload.rows || [] })
    setAudit(backendPayload.audit || {
      scores: {
        overall: 0,
        completeness: 0,
        uniqueness: 0,
        consistency: 0,
        penalties: { missingValues: 0, duplicateRows: 0, inconsistencies: 0, total: 0 },
      },
      issues: [],
      columns: [],
      summary: { rowCount: 0, columnCount: 0, duplicateRows: 0, missingByColumn: [], scoreBreakdown: { formula: '', penalties: { missingValues: 0, duplicateRows: 0, inconsistencies: 0, total: 0 } } },
    })
    setHasFile(true)
    setScreen('analyzing')
  }, [])
  const handleDone = useCallback(() => setScreen('dashboard'), [])
  const handleReaudit = useCallback(() => { setHasFile(true); setScreen('analyzing') }, [])
  const navigate = (id) => {
    if (id === 'upload') {
      setHasFile(false)
      setActiveFile(null)
      setDataset({ headers: [], rows: [] })
      setAudit({
        scores: {
          overall: 0,
          completeness: 0,
          uniqueness: 0,
          consistency: 0,
          penalties: { missingValues: 0, duplicateRows: 0, inconsistencies: 0, total: 0 },
        },
        issues: [],
        columns: [],
        summary: { rowCount: 0, columnCount: 0, duplicateRows: 0, missingByColumn: [], scoreBreakdown: { formula: '', penalties: { missingValues: 0, duplicateRows: 0, inconsistencies: 0, total: 0 } } },
      })
    }
    setScreen(id)
  }
  const pending = audit.issues.filter((i) => !i.fixed).length

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="wordmark">Data<span>IQ</span></div>
          <div className="tagline">Data Quality Platform</div>
        </div>
        <nav className="sidebar-nav">
          {['start', 'analysis', 'output'].map(sec => {
            const labels = { start: 'Workspace', analysis: 'Analysis', output: 'Output' }
            return (
              <div key={sec}>
                <div className="nav-section-label">{labels[sec]}</div>
                {NAV.filter(n => n.section === sec).map(n => {
                  const Icon = n.icon
                  const disabled = n.requiresFile && !hasFile
                  return (
                    <button
                      key={n.id}
                      className={`nav-item${screen === n.id ? ' active' : ''}`}
                      onClick={() => !disabled && navigate(n.id)}
                      style={{ opacity: disabled ? 0.35 : 1, cursor: disabled ? 'not-allowed' : 'pointer' }}
                    >
                      <Icon size={15} className="nav-icon" />
                      {n.label}
                      {n.badge && hasFile && (
                        pending > 0
                          ? <span className="nav-badge">{pending}</span>
                          : <span className="nav-badge green">✓</span>
                      )}
                    </button>
                  )
                })}
              </div>
            )
          })}
        </nav>
        <div className="sidebar-footer">Accenture × Databricks</div>
      </aside>

      <div className="main-content">
        <header className="topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {hasFile && screen !== 'upload' && (
              <>
                <span style={{ fontSize: 12, color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>
                  {activeFile?.name}
                </span>
                <ChevronRight size={12} color="var(--text-3)" />
              </>
            )}
            <span className="topbar-title">{TITLES[screen]}</span>
          </div>
          <div className="topbar-right">
            {hasFile && (
              <span className="topbar-chip">
                DQ Score: <strong style={{ color: 'var(--yellow)' }}>{audit.scores.overall}</strong>
              </span>
            )}
            
          </div>
        </header>

        {screen === 'upload'    && <UploadScreen onAnalyze={handleAnalyze} />}
        {screen === 'analyzing' && <AnalyzingScreen onComplete={handleDone} />}
        {screen === 'dashboard' && <DashboardScreen onNavigate={navigate} file={activeFile} dataset={dataset} audit={audit} />}
        {screen === 'issues'    && <IssuesScreen file={activeFile} issues={audit.issues} />}
        {screen === 'columns'   && <ColumnProfileScreen file={activeFile} columns={audit.columns} />}
        {screen === 'report'    && <ReportScreen onReaudit={handleReaudit} file={activeFile} dataset={dataset} audit={audit} />}

        <footer className="hackathon-footer" role="contentinfo">
          Built with 🤎 for the Databricks-Accenture Hackathon by Team Elite (Bhavesh Patil &amp; Shreya Shelar)
        </footer>
      </div>
    </div>
  )
}
