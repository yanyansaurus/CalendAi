'use client'
import { useEffect, useState } from 'react'

interface Reminder {
  time: string
  endTime: string
  title: string
  type: string
  duration: string
  urgency: string
}

interface EmailInsight {
  from: string
  subject: string
  action: string
  priority: string
}

interface ScheduleRec {
  time: string
  activity: string
  reason: string
  duration: string
}

interface UrgentAlert {
  title: string
  timeLeft: string
  urgency: string
}

interface WeeklyAnalysis {
  summary: string
  topCategory: string
  productivityScore: number
}

interface Briefing {
  greeting: string
  urgentAlerts: UrgentAlert[]
  todayReminders: Reminder[]
  emailInsights: EmailInsight[]
  recommendedSchedule: ScheduleRec[]
  weeklyAnalysis: WeeklyAnalysis
  motivationalNote: string
}

const URGENCY_COLORS: Record<string, string> = {
  high: '#f87171',
  medium: '#fbbf24',
  low: '#34d399',
}

export default function BriefingPanel() {
  const [briefing, setBriefing] = useState<Briefing | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [emailing, setEmailing] = useState(false)
  const [emailSent, setEmailSent] = useState(false)
  const [currentTime, setCurrentTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const sendEmailBriefing = async () => {
    if (!briefing) return
    setEmailing(true)
    try {
      const res = await fetch('/api/briefing/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ briefing })
      })
      if (res.ok) {
        setEmailSent(true)
        setTimeout(() => setEmailSent(false), 5000)
      }
    } finally {
      setEmailing(false)
    }
  }

  const loadBriefing = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/briefing', {
        headers: { 'x-timezone': localStorage.getItem('executive_vai_timezone') || Intl.DateTimeFormat().resolvedOptions().timeZone }
      })
      if (!res.ok) throw new Error('Failed to load briefing')
      const data = await res.json()
      setBriefing(data.briefing)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  // Auto-load on mount
  useEffect(() => { loadBriefing() }, [])

  if (loading && !briefing) {
    return (
      <div style={{ padding: 40, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
        <div style={{ display: 'flex', gap: 6 }}>
          <div className="typing-dot" style={{ width: 10, height: 10 }} />
          <div className="typing-dot" style={{ width: 10, height: 10 }} />
          <div className="typing-dot" style={{ width: 10, height: 10 }} />
        </div>
        <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Generating your AI briefing…</p>
      </div>
    )
  }

  if (error && !briefing) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <p style={{ color: 'var(--danger)', marginBottom: 16 }}>{error}</p>
        <button className="btn-brand" onClick={() => loadBriefing()}>🔄 Retry</button>
      </div>
    )
  }

  if (!briefing) return null

  return (
    <div style={{ overflowY: 'auto', height: '100%', paddingBottom: 40 }} className="container-padding">
      {/* Header with Refresh */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
            <h2 style={{ fontSize: 22, fontWeight: 700 }}>{briefing.greeting}</h2>
            <button
              onClick={() => window.dispatchEvent(new CustomEvent('open-routine-setup'))}
              style={{ background: 'transparent', border: 'none', color: 'var(--brand)', fontSize: 12, fontWeight: 700, cursor: 'pointer', padding: 0 }}
            >
              Full Detailed View →
            </button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              {currentTime.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </p>
            <div style={{ width: 1, height: 12, background: 'var(--border)' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--brand-light)', fontWeight: 700, fontSize: 13 }}>
              <span style={{ fontSize: 14 }}>🕒</span>
              {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={sendEmailBriefing}
            disabled={emailing || emailSent}
            className="btn-brand"
            style={{ fontSize: 13, padding: '6px 14px', borderRadius: 8, transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: 6 }}
          >
            {emailSent ? '✅ Sent!' : emailing ? 'Sending...' : '📧 Email Me'}
          </button>
          <button
            onClick={() => loadBriefing(true)}
            disabled={refreshing}
            className="btn-ghost"
            style={{ fontSize: 16, padding: '6px 10px', borderRadius: 8, opacity: refreshing ? 0.5 : 1, transition: 'all 0.2s' }}
            title="Refresh briefing"
          >
            {refreshing ? '⏳' : '🔄'}
          </button>
        </div>
      </div>


      {/* Today's Digest / Reminders */}
      {briefing.todayReminders?.length > 0 && (
        <section style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <span style={{ fontSize: 18 }}>📅</span>
            <h3 style={{ fontSize: 16, fontWeight: 700 }}>Today&apos;s Highlights</h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {briefing.todayReminders.map((r, i) => {
              const isRoutine = r.title.toLowerCase().includes('wake') || r.title.toLowerCase().includes('sleep')
              return (
                <div key={i} className="glass" style={{ padding: 14, borderRadius: 12, display: 'flex', alignItems: 'center', gap: 12, borderLeft: `3px solid ${URGENCY_COLORS[r.urgency] ?? '#94a3b8'}`, opacity: isRoutine ? 0.8 : 1 }}>
                  <div style={{ minWidth: 90, textAlign: 'center' }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{r.time}</div>
                    {!isRoutine && <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 500 }}>{r.endTime}</div>}
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 14, fontWeight: 700, marginBottom: isRoutine ? 0 : 2 }}>{r.title}</p>
                    {!isRoutine && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 11, color: 'var(--brand-light)', fontWeight: 600 }}>{r.duration}</span>
                        <span style={{ color: 'var(--border)', fontSize: 10 }}>•</span>
                        <span style={{ fontSize: 11, color: 'var(--text-subtle)', textTransform: 'capitalize' }}>{r.type}</span>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* Weekly Performance Scorecard */}
      {briefing.weeklyAnalysis && (
        <section style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <span style={{ fontSize: 18 }}>📈</span>
            <h3 style={{ fontSize: 16, fontWeight: 700 }}>Weekly Performance</h3>
          </div>
          <div className="glass" style={{ padding: 20, borderRadius: 20, background: 'var(--surface-2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 16 }}>
              <div>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Productivity Score</p>
                <h4 style={{ fontSize: 32, fontWeight: 900, color: 'var(--brand-light)' }}>{briefing.weeklyAnalysis.productivityScore}%</h4>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Top Focus</p>
                <p style={{ fontSize: 14, fontWeight: 700 }}>{briefing.weeklyAnalysis.topCategory}</p>
              </div>
            </div>
            {/* Score Bar */}
            <div style={{ height: 8, background: 'var(--surface-3)', borderRadius: 4, overflow: 'hidden', marginBottom: 16 }}>
              <div style={{ height: '100%', width: `${briefing.weeklyAnalysis.productivityScore}%`, background: 'var(--brand)', borderRadius: 4 }} />
            </div>
            <p style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--text-muted)', borderTop: '1px solid var(--border)', paddingTop: 12 }}>
              {briefing.weeklyAnalysis.summary}
            </p>
          </div>
        </section>
      )}

      {/* Email Insights */}
      {briefing.emailInsights?.length > 0 && (
        <section style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <span style={{ fontSize: 18 }}>📧</span>
            <h3 style={{ fontSize: 16, fontWeight: 700 }}>Email Actions</h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {briefing.emailInsights.map((e, i) => (
              <div key={i} className="glass" style={{ padding: 14, borderRadius: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{e.from}</span>
                  <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 10, background: `${URGENCY_COLORS[e.priority]}20`, color: URGENCY_COLORS[e.priority], fontWeight: 700 }}>{e.priority.toUpperCase()}</span>
                </div>
                <p style={{ fontSize: 12, color: 'var(--brand-light)', fontWeight: 500, marginBottom: 4 }}>{e.subject}</p>
                <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>💡 {e.action}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Motivational Note */}
      {briefing.motivationalNote && (
        <div className="glass" style={{ padding: 20, borderRadius: 16, textAlign: 'center', background: 'linear-gradient(135deg, rgba(99,102,241,0.05), rgba(79,70,229,0.02))', border: '1px solid var(--border)' }}>
          <p style={{ fontSize: 13, fontStyle: 'italic', color: 'var(--text-muted)', lineHeight: 1.6 }}>✨ {briefing.motivationalNote}</p>
        </div>
      )}
    </div>
  )
}
