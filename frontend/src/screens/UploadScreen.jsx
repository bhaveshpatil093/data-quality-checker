import { useState, useRef, useCallback } from 'react'
import { Upload, FileSpreadsheet, Zap, ChevronRight, X } from 'lucide-react'
import { uploadDataset } from '../utils/api.js'

export default function UploadScreen({ onAnalyze }) {
  const [dragging, setDragging] = useState(false)
  const [file, setFile] = useState(null)
  const [dataset, setDataset] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef()

  const handleFile = useCallback(async (f) => {
    if (!f) return
    setLoading(true)
    setError('')
    setFile(f)
    try {
      const parsed = await uploadDataset(f)
      setDataset(parsed)
    } catch (err) {
      setDataset(null)
      setError(err?.message || 'Failed to read file')
    } finally {
      setLoading(false)
    }
  }, [])

  const onDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    handleFile(e.dataTransfer.files[0])
  }

  const formatSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  const headers = dataset?.headers || []
  const rows = dataset?.rows?.slice(0, 6) || []

  return (
    <div className="page">
      <div className="upload-hero">
        <h1>Audit Your Data.<br />Before It Audits You.</h1>
        <p>
          Upload any CSV or Excel dataset and get an AI-powered quality audit —
          missing values, duplicates, inconsistencies, and business rule violations
          detected and explained in under 60 seconds.
        </p>

        {!file ? (
          <div
            className={`drop-zone${dragging ? ' dragging' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            onClick={() => inputRef.current.click()}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              style={{ display: 'none' }}
              onChange={(e) => handleFile(e.target.files[0])}
            />
            <div className="drop-icon">
              <Upload size={28} />
            </div>
            <h3>Drop your dataset here</h3>
            <p>or click to browse your files</p>
            <div className="formats">
              {['.CSV', '.XLSX', '.XLS'].map((f) => (
                <span key={f} className="format-chip">{f}</span>
              ))}
            </div>
          </div>
        ) : (
          <div className="file-preview">
            <div className="file-preview-header">
              <div className="file-info">
                <div className="file-icon">
                  <FileSpreadsheet size={18} />
                </div>
                <div>
                  <div className="file-name">{file.name}</div>
                  <div className="file-meta">
                    {formatSize(file.size)} &nbsp;·&nbsp;
                    {headers.length} columns &nbsp;·&nbsp;
                    {dataset?.rows?.length || 0} rows parsed
                  </div>
                </div>
              </div>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => { setFile(null); setDataset(null); setError('') }}
              >
                <X size={14} /> Remove
              </button>
            </div>

            {loading && (
              <div style={{ padding: '18px 20px', color: 'var(--text-3)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                Parsing uploaded file...
              </div>
            )}

            {error && (
              <div style={{ padding: '18px 20px', color: 'var(--red)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                {error}
              </div>
            )}

            {headers.length > 0 && (
              <div className="preview-table-wrap">
                <table className="preview-table">
                  <thead>
                    <tr>
                      <th style={{ color: 'var(--text-3)', width: 36 }}>#</th>
                      {headers.map((h, i) => <th key={i}>{h || `col_${i}`}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, ri) => (
                      <tr key={ri}>
                        <td style={{ color: 'var(--text-3)' }}>{ri + 1}</td>
                        {headers.map((header) => (
                          <td key={header}>
                            {row[header] ?? <span style={{ color: 'var(--red)', fontStyle: 'italic' }}>null</span>}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border)', display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary btn-sm" onClick={() => { setFile(null); setDataset(null); setError('') }}>
                Change File
              </button>
              <button className="btn btn-primary" disabled={!dataset || loading || !!error} onClick={() => onAnalyze(file, dataset)}>
                <Zap size={16} />
                Run Full Audit
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}

        
      </div>
    </div>
  )
}
