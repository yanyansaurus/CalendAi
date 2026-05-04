'use client'
import { useEffect, useState } from 'react'

interface Reminder {
  time: string
  title: string
  type: string
  urgency: string
}

interface EmailInsight {
  from: string
  subject: string
  action: string
  suggestedTime: string
  priority: string
}

interface ScheduleRec {
  time: string
  activity: string
  reason: string
  duration: string
}

interface Briefing {
  greeting: string
  todayReminders: Reminder[]
  emailInsights: EmailInsight[]
  recommendedSchedule: ScheduleRec[]
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
    <div style={{ overflowY: 'auto', height: '100%' }} className="container-padding">
      {/* Header with Refresh */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 6 }}>{briefing.greeting}</h2>
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {/* Feature: Send Daily Briefing to my Email 📰 */}
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

      {/* Today's Reminders */}
      {briefing.todayReminders?.length > 0 && (
        <section style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <span style={{ fontSize: 18 }}>⏰</span>
            <h3 style={{ fontSize: 16, fontWeight: 700 }}>Today&apos;s Reminders</h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {briefing.todayReminders.map((r, i) => (
              <div key={i} className="glass" style={{ padding: 14, borderRadius: 12, display: 'flex', alignItems: 'center', gap: 12, borderLeft: `3px solid ${URGENCY_COLORS[r.urgency] ?? '#94a3b8'}` }}>
                <div style={{ minWidth: 64, fontSize: 12, fontWeight: 600, color: URGENCY_COLORS[r.urgency] ?? 'var(--text-muted)' }}>
                  {r.time}
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 13, fontWeight: 600 }}>{r.title}</p>
                  <p style={{ fontSize: 11, color: 'var(--text-subtle)', textTransform: 'capitalize' }}>{r.type}</p>
                </div>
                <span style={{
                  fontSize: 10, padding: '2px 8px', borderRadius: 10, fontWeight: 600, textTransform: 'uppercase',
                  background: `${URGENCY_COLORS[r.urgency] ?? '#94a3b8'}20`,
                  color: URGENCY_COLORS[r.urgency] ?? '#94a3b8',
                }}>{r.urgency}</span>
              </div>
            ))}
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, flexWrap: 'wrap', gap: 4 }}>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{e.from}</span>
                  <span style={{
                    fontSize: 10, padding: '2px 8px', borderRadius: 10, fontWeight: 600, textTransform: 'uppercase',
                    background: `${URGENCY_COLORS[e.priority] ?? '#94a3b8'}20`,
                    color: URGENCY_COLORS[e.priority] ?? '#94a3b8',
                  }}>{e.priority}</span>
                </div>
                <p style={{ fontSize: 12, color: 'var(--brand-light)', fontWeight: 500, marginBottom: 4 }}>{e.subject}</p>
                <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>💡 {e.action}</p>
                <p style={{ fontSize: 11, color: 'var(--text-subtle)', marginTop: 4 }}>⏰ {e.suggestedTime}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Recommended Schedule */}
      {briefing.recommendedSchedule?.length > 0 && (
        <section style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <span style={{ fontSize: 18 }}>📋</span>
            <h3 style={{ fontSize: 16, fontWeight: 700 }}>AI Recommended Schedule</h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {briefing.recommendedSchedule.map((s, i) => (
              <div key={i} className="glass" style={{ padding: 14, borderRadius: 12, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <div style={{ minWidth: 64, fontSize: 12, fontWeight: 700, color: 'var(--brand-light)' }}>{s.time}</div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>{s.activity}</p>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>{s.reason}</p>
                </div>
                <span style={{ fontSize: 11, color: 'var(--text-subtle)', whiteSpace: 'nowrap' }}>{s.duration}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Motivational Note */}
      {briefing.motivationalNote && (
        <div className="glass" style={{
          padding: 20, borderRadius: 16, textAlign: 'center', marginBottom: 28,
          background: 'linear-gradient(135deg, rgba(99,102,241,0.08), rgba(79,70,229,0.04))',
          border: '1px solid rgba(99,102,241,0.15)',
        }}>
          <p style={{ fontSize: 14, fontStyle: 'italic', color: 'var(--text-muted)', lineHeight: 1.6 }}>
            ✨ {briefing.motivationalNote}
          </p>
        </div>
      )}

    </div>
  )
}
