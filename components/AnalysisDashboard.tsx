'use client'
import { useEffect, useState } from 'react'

interface AnalysisData {
  totalMinutes: number
  categories: Array<{
    name: string
    minutes: number
    percentage: number
    events: string[]
  }>
  insight: string
  recommendation: string
}

export default function AnalysisDashboard() {
  const [data, setData] = useState<AnalysisData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadAnalysis = () => {
    setLoading(true)
    setError(null)
    fetch('/api/analysis')
      .then(res => {
        if (!res.ok) {
          return res.json().then(err => {
            throw new Error(err.error ?? `Server error (${res.status})`)
          })
        }
        return res.json()
      })
      .then(d => {
        if (d.analysis) setData(d.analysis)
        else setError('No analysis data returned.')
        setLoading(false)
      })
      .catch((err) => {
        setError(err.message ?? 'Failed to load analysis.')
        setLoading(false)
      })
  }

  // Auto-fetch disabled to save gemini-2.5-flash quota

  if (!data && !loading && !error) {
    return (
      <div style={{ padding: 60, textAlign: 'center' }}>
        <h2 style={{ marginBottom: 12 }}>Weekly Time Analysis</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: 24, maxWidth: 400, margin: '0 auto 24px' }}>
          ExecutiveVAi will analyse your calendar events from this week to show you how you spent your time.
        </p>
        <button className="btn-brand" onClick={loadAnalysis}>📊 Run Analysis</button>
        <p style={{ fontSize: 11, color: 'var(--text-subtle)', marginTop: 12 }}>Note: This counts towards your daily AI quota (20/day).</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div style={{ padding: 40, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
        <div style={{ display: 'flex', gap: 6 }}>
          <div className="typing-dot" style={{ width: 10, height: 10 }} />
          <div className="typing-dot" style={{ width: 10, height: 10 }} />
          <div className="typing-dot" style={{ width: 10, height: 10 }} />
        </div>
        <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Analysing your calendar… this may take 15–20 seconds.</p>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <p style={{ color: 'var(--danger)', marginBottom: 16 }}>{error ?? 'Could not load analysis data.'}</p>
        <button className="btn-brand" onClick={loadAnalysis}>🔄 Retry</button>
      </div>
    )
  }

  return (
    <div style={{ padding: '32px 40px', overflowY: 'auto', height: '100%' }}>
      <header style={{ marginBottom: 40 }}>
        <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>Weekly Performance Analysis</h2>
        <p style={{ color: 'var(--text-muted)' }}>A deep dive into how you spent your time this week.</p>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24, marginBottom: 40 }}>
        {/* Summary Card */}
        <div className="glass" style={{ padding: 24 }}>
          <p style={{ fontSize: 12, color: 'var(--text-subtle)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>Total Time Tracked</p>
          <p style={{ fontSize: 32, fontWeight: 700 }}>{(data.totalMinutes / 60).toFixed(1)}h</p>
        </div>

        {/* Insight Card */}
        <div className="glass" style={{ padding: 24, borderLeft: '4px solid var(--brand)' }}>
          <p style={{ fontSize: 12, color: 'var(--text-subtle)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>Chief of Staff Insight</p>
          <p style={{ fontSize: 16, lineHeight: 1.5 }}>{data.insight}</p>
        </div>

        {/* Recommendation Card */}
        <div className="glass" style={{ padding: 24, borderLeft: '4px solid var(--meeting-color)' }}>
          <p style={{ fontSize: 12, color: 'var(--text-subtle)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>Recommendation</p>
          <p style={{ fontSize: 16, lineHeight: 1.5 }}>{data.recommendation}</p>
        </div>
      </div>

      <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 20 }}>Categorized Breakdown</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 40 }}>
        {data.categories.map((cat, i) => (
          <div key={i} className="glass" style={{ padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 12, height: 12, borderRadius: '50%', background: getCategoryColor(cat.name) }} />
                <span style={{ fontWeight: 600 }}>{cat.name}</span>
              </div>
              <span style={{ color: 'var(--text-muted)', fontSize: 14 }}>{(cat.minutes / 60).toFixed(1)}h ({cat.percentage}%)</span>
            </div>
            <div style={{ width: '100%', height: 8, background: 'var(--surface-3)', borderRadius: 4, overflow: 'hidden' }}>
              <div style={{ width: `${cat.percentage}%`, height: '100%', background: getCategoryColor(cat.name), transition: 'width 1s ease-out' }} />
            </div>
            <div style={{ marginTop: 16, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {cat.events.map((ev, j) => (
                <span key={j} style={{ fontSize: 11, padding: '4px 8px', borderRadius: 4, background: 'rgba(255,255,255,0.05)', color: 'var(--text-subtle)' }}>
                  {ev}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function getCategoryColor(name: string) {
  const map: Record<string, string> = {
    'Meetings': '#34d399',
    'Deep Work': '#6366f1',
    'Admin': '#fbbf24',
    'Focus Time': '#8b5cf6',
    'Other': '#94a3b8'
  }
  return map[name] ?? '#94a3b8'
}
