import { useState, useCallback } from 'react'
import './index.css'
import { Upload, LayoutDashboard, AlertTriangle, BarChart2, FileText, ChevronRight } from 'lucide-react'
import UploadScreen from './screens/UploadScreen.jsx'
import AnalyzingScreen from './screens/AnalyzingScreen.jsx'
import DashboardScreen from './screens/DashboardScreen.jsx'
import IssuesScreen from './screens/IssuesScreen.jsx'
import ColumnProfileScreen from './screens/ColumnProfileScreen.jsx'
import ReportScreen from './screens/ReportScreen.jsx'
import { MOCK_ISSUES } from './mockData.js'

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
  const [issues] = useState(MOCK_ISSUES)

  const handleAnalyze = useCallback(() => { setHasFile(true); setScreen('analyzing') }, [])
  const handleDone = useCallback(() => setScreen('dashboard'), [])
  const navigate = (id) => { if (id === 'upload') setHasFile(false); setScreen(id) }
  const pending = issues.filter(i => !i.fixed).length

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="wordmark">DQ<span>Sense</span></div>
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
                  sales_data_q1_2024.csv
                </span>
                <ChevronRight size={12} color="var(--text-3)" />
              </>
            )}
            <span className="topbar-title">{TITLES[screen]}</span>
          </div>
          <div className="topbar-right">
            {hasFile && (
              <span className="topbar-chip">
                DQ Score: <strong style={{ color: 'var(--yellow)' }}>63</strong>
              </span>
            )}
            
          </div>
        </header>

        {screen === 'upload'    && <UploadScreen onAnalyze={handleAnalyze} />}
        {screen === 'analyzing' && <AnalyzingScreen onComplete={handleDone} />}
        {screen === 'dashboard' && <DashboardScreen onNavigate={navigate} />}
        {screen === 'issues'    && <IssuesScreen />}
        {screen === 'columns'   && <ColumnProfileScreen />}
        {screen === 'report'    && <ReportScreen />}
      </div>
    </div>
  )
}
