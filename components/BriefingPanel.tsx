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
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <h2 className="gradient-text" style={{ fontSize: 24, letterSpacing: '-0.02em' }}>
              {currentTime.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </h2>
            <div style={{ padding: '4px 12px', borderRadius: 20, background: 'var(--brand-glow)', border: '1px solid rgba(99,102,241,0.2)', display: 'flex', alignItems: 'center', gap: 6, color: 'var(--brand-light)', fontWeight: 700, fontSize: 13 }}>
              <span style={{ fontSize: 14 }}>🕒</span>
              {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
          <p style={{ fontSize: 14, color: 'var(--text-muted)', fontWeight: 500 }}>
            {briefing.greeting.includes('Good') ? 'Your personalized AI strategy for today.' : briefing.greeting}
          </p>
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


      {/* Main Content Grid */}
      <div className="responsive-grid" style={{ gap: 32, alignItems: 'start' }}>
        
        {/* Left Column: Schedule & Digest */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
          {/* Urgent Alerts */}
          {briefing.urgentAlerts?.length > 0 && (
            <section className="animate-in">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <span style={{ fontSize: 20 }}>🚨</span>
                <h3 style={{ fontSize: 16, fontWeight: 800, color: '#f87171', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Immediate Attention</h3>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {briefing.urgentAlerts.map((a, i) => (
                  <div key={i} className="glass-premium" style={{ padding: '16px 20px', borderRadius: 16, background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <p style={{ fontSize: 14, fontWeight: 800, color: '#ef4444' }}>{a.title}</p>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#f87171', background: 'rgba(239,68,68,0.1)', padding: '2px 10px', borderRadius: 20 }}>{a.timeLeft} left</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Today's Digest / Reminders */}
          {briefing.todayReminders?.length > 0 && (
            <section>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <span style={{ fontSize: 20 }}>📅</span>
                <h3 style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-0.01em' }}>Today&apos;s Highlights</h3>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {briefing.todayReminders.map((r, i) => {
                  const isRoutine = r.title.toLowerCase().includes('wake') || r.title.toLowerCase().includes('sleep')
                  return (
                    <div key={i} className="glass-premium animate-in" style={{ padding: '16px 20px', borderRadius: 16, display: 'flex', alignItems: 'center', gap: 16, borderLeft: `4px solid ${URGENCY_COLORS[r.urgency] ?? '#94a3b8'}`, opacity: isRoutine ? 0.7 : 1, animationDelay: `${i * 0.05}s` }}>
                      <div style={{ minWidth: 90, textAlign: 'center' }}>
                        <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text)' }}>{r.time}</div>
                        {!isRoutine && <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>{r.endTime}</div>}
                      </div>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: 15, fontWeight: 700, marginBottom: isRoutine ? 0 : 4, color: isRoutine ? 'var(--text-muted)' : 'var(--text)' }}>{r.title}</p>
                        {!isRoutine && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 12, color: 'var(--brand-light)', fontWeight: 700, background: 'rgba(99,102,241,0.1)', padding: '2px 8px', borderRadius: 6 }}>{r.duration}</span>
                            <span style={{ fontSize: 12, color: 'var(--text-subtle)', textTransform: 'capitalize', fontWeight: 500 }}>{r.type}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>
          )}

          {/* Motivational Note */}
          {briefing.motivationalNote && (
            <div className="glass-premium" style={{ padding: 24, borderRadius: 20, textAlign: 'center', background: 'linear-gradient(135deg, rgba(99,102,241,0.05), rgba(192,132,252,0.05))' }}>
              <p style={{ fontSize: 14, fontStyle: 'italic', color: 'var(--text-muted)', lineHeight: 1.7, maxWidth: 500, margin: '0 auto' }}>
                &quot;{briefing.motivationalNote}&quot;
              </p>
            </div>
          )}
        </div>

        {/* Right Column: Performance & Insights */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
          {/* Weekly Performance Scorecard */}
          {briefing.weeklyAnalysis && (
            <section>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <span style={{ fontSize: 20 }}>📊</span>
                <h3 style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-0.01em' }}>Performance</h3>
              </div>
              <div className="glass-premium" style={{ padding: 24, borderRadius: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                  <div>
                    <p style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Productivity</p>
                    <h4 style={{ fontSize: 40, fontWeight: 900, color: 'var(--brand-light)', lineHeight: 1 }}>{briefing.weeklyAnalysis.productivityScore}%</h4>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Top Focus</p>
                    <p style={{ fontSize: 14, fontWeight: 800, color: 'var(--text)' }}>{briefing.weeklyAnalysis.topCategory}</p>
                  </div>
                </div>
                {/* Score Bar */}
                <div style={{ height: 10, background: 'rgba(255,255,255,0.05)', borderRadius: 10, overflow: 'hidden', marginBottom: 20 }}>
                  <div className="btn-brand" style={{ height: '100%', width: `${briefing.weeklyAnalysis.productivityScore}%`, borderRadius: 10 }} />
                </div>
                <p style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--text-muted)', paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                  {briefing.weeklyAnalysis.summary}
                </p>
              </div>
            </section>
          )}

          {/* Email Insights */}
          {briefing.emailInsights?.length > 0 && (
            <section>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <span style={{ fontSize: 20 }}>📧</span>
                <h3 style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-0.01em' }}>Email Actions</h3>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {briefing.emailInsights.map((e, i) => (
                  <div key={i} className="glass-premium animate-in" style={{ padding: 18, borderRadius: 18, animationDelay: `${i * 0.1}s` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{e.from.split('<')[0]}</span>
                      <span style={{ fontSize: 10, padding: '3px 10px', borderRadius: 20, background: `${URGENCY_COLORS[e.priority]}15`, color: URGENCY_COLORS[e.priority], fontWeight: 800, border: `1px solid ${URGENCY_COLORS[e.priority]}33` }}>
                        {e.priority.toUpperCase()}
                      </span>
                    </div>
                    <p style={{ fontSize: 13, color: 'var(--brand-light)', fontWeight: 600, marginBottom: 6 }}>{e.subject}</p>
                    <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5 }}>💡 {e.action}</p>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  )
}
