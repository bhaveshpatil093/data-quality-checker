import { useEffect, useState } from 'react'

const STEPS = [
  'Parsing dataset structure...',
  'Detecting missing values & null patterns...',
  'Running duplicate & fuzzy match analysis...',
  'Checking format & type consistency...',
  'Validating business rules...',
  'Calculating statistical outliers...',
  'Generating AI diagnoses...',
  'Computing DQ Score...',
]

export default function AnalyzingScreen({ onComplete }) {
  const [activeStep, setActiveStep] = useState(0)

  useEffect(() => {
    const timers = STEPS.map((_, i) =>
      setTimeout(() => setActiveStep(i + 1), (i + 1) * 480)
    )
    const done = setTimeout(onComplete, STEPS.length * 480 + 600)
    return () => { timers.forEach(clearTimeout); clearTimeout(done) }
  }, [onComplete])

  return (
    <div className="page">
      <div className="analyzing-overlay">
        <div className="analyzing-spinner" />
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 800, marginBottom: 6 }}>
          Auditing Your Dataset
        </div>
        <div style={{ color: 'var(--text-3)', fontSize: 13, fontFamily: 'var(--font-mono)' }}>
          Running {STEPS.length} analysis passes...
        </div>

        <div className="analyzing-steps">
          {STEPS.map((step, i) => (
            <div key={i} className="analyzing-step">
              <div className={`step-dot${i < activeStep ? ' done' : i === activeStep ? ' active' : ''}`} />
              <span style={{
                color: i < activeStep ? 'var(--teal)' : i === activeStep ? 'var(--text-1)' : 'var(--text-3)'
              }}>
                {step}
              </span>
            </div>
          ))}
        </div>

        <div className="loading-bar" style={{ width: 280, marginTop: 32 }}>
          <div className="loading-bar-fill" />
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--font-mono)', marginTop: 8 }}>
          {Math.round((activeStep / STEPS.length) * 100)}% complete
        </div>
      </div>
    </div>
  )
}
