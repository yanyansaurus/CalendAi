'use client'
import { useEffect, useState } from 'react'

interface HomeStat {
  label: string
  value: string | number
  icon: string
  color: string
}

interface Briefing {
  greeting: string
  urgentAlerts: { title: string; timeLeft: string; urgency: string }[]
  todayReminders: { time: string; endTime: string; title: string; description: string; duration: string; type: string; urgency: string }[]
  emailInsights: { from: string; subject: string; action: string; priority: string }[]
  recommendedSchedule: { time: string; activity: string; reason: string; duration: string }[]
  weeklyAnalysis: { summary: string; topCategory: string; productivityScore: number }
  motivationalNote: string
}

interface TimelineEvent {
  time: string
  endTime?: string
  title: string
  description?: string
  duration: string
  type: 'meeting' | 'task' | 'focus'
}

const URGENCY_COLORS: Record<string, string> = {
  high: '#f87171',
  medium: '#fbbf24',
  low: '#34d399',
}

interface HomePanelProps {
  session: any
  setActiveTab: (tab: any) => void
}

export default function HomePanel({ session, setActiveTab }: HomePanelProps) {
  const [stats, setStats] = useState<HomeStat[]>([
    { label: 'Meetings Today', value: '...', icon: '🗓️', color: 'var(--brand)' },
    { label: 'Pending Tasks', value: '...', icon: '✅', color: '#10b981' },
    { label: 'Email Insights', value: '...', icon: '📧', color: '#6366f1' },
  ])
  const [timeline, setTimeline] = useState<TimelineEvent[]>([])
  const [briefing, setBriefing] = useState<Briefing | null>(null)
  const [loading, setLoading] = useState(true)
  const [showWelcome, setShowWelcome] = useState(false)
  const [isIncomplete, setIsIncomplete] = useState(false)
  const [currentTime, setCurrentTime] = useState(new Date())

  // Update clock every minute
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000)
    return () => clearInterval(timer)
  }, [])

  const getEventStatus = (ev: TimelineEvent) => {
    const now = new Date()
    const nowMin = now.getHours() * 60 + now.getMinutes()

    const parseTime = (t: string) => {
      let [h, m] = t.split(':').map(Number)
      if (t.includes('PM') && h < 12) h += 12
      if (t.includes('AM') && h === 12) h = 0
      return h * 60 + m
    }

    const startMin = parseTime(ev.time)
    const endMin = ev.endTime ? parseTime(ev.endTime) : startMin + 30

    if (nowMin >= startMin && nowMin < endMin) return 'NOW'
    if (nowMin < startMin) return 'UP NEXT'
    return 'PAST'
  }

  const loadData = async (forceRefresh = false) => {
    const now = new Date()
    // Calculate the most recent 12 AM (Midnight) threshold
    const threshold = new Date(now)
    threshold.setHours(0, 0, 0, 0)

    // 1. Try to load from cache first for instant UI (unless forced)
    const cached = localStorage.getItem('executive_vai_home_cache_v4')
    const todayStr = now.toDateString()

    if (!forceRefresh && cached && session?.user?.email) {
      try {
        const parsed = JSON.parse(cached)
        const { stats: cStats, timeline: cTimeline, briefing: cBriefing, lastFetchedAt, userId } = parsed

        if (userId !== session.user.email) {
          localStorage.removeItem('executive_vai_home_cache_v4')
        } else {
          setStats(cStats)
          setTimeline(cTimeline)
          if (cBriefing) setBriefing(cBriefing)

          if (lastFetchedAt && new Date(lastFetchedAt).toDateString() === todayStr) {
            setLoading(false)
            return
          }
        }
      } catch { /* ignore cache errors */ }
    }

    try {
      const res = await fetch('/api/briefing', {
        headers: {
          'x-timezone': Intl.DateTimeFormat().resolvedOptions().timeZone
        }
      })
      if (res.ok) {
        const data = await res.json()
        const b = data.briefing
        setBriefing(b)

        // Map stats
        const newStats: HomeStat[] = [
          { label: 'Meetings Today', value: b.todayReminders?.filter((r: any) => r.type === 'calendar').length || 0, icon: '🗓️', color: 'var(--brand)' },
          { label: 'Pending Tasks', value: data.tasksCount || 0, icon: '✅', color: '#10b981' },
          { label: 'Email Insights', value: data.emailsCount || 0, icon: '📧', color: '#6366f1' },
        ]

        // Map timeline
        const newTimeline: TimelineEvent[] = b.todayReminders?.map((r: any) => ({
          time: r.time,
          endTime: r.endTime,
          title: r.title,
          description: r.description,
          duration: r.duration || (r.type === 'calendar' ? '30m' : 'Task'),
          type: r.type === 'calendar' ? 'meeting' : 'task'
        })) || []

        setStats(newStats)
        setTimeline(newTimeline)

        // 2. Save to cache
        localStorage.setItem('executive_vai_home_cache_v4', JSON.stringify({
          stats: newStats,
          timeline: newTimeline,
          briefing: b,
          lastFetchedAt: now.toISOString(),
          userId: session?.user?.email
        }))
      }
    } finally {
      setLoading(false)
    }
  }

  // Trigger analysis whenever timeline or stats changes
  useEffect(() => {
    if (session?.user?.email) {
      // Consider it sparse only if both the curated timeline and the raw counts are low
      const meetingCount = typeof stats[0].value === 'number' ? stats[0].value : 0
      const taskCount = typeof stats[1].value === 'number' ? stats[1].value : 0

      const isSparse = timeline.length < 5 && (meetingCount + taskCount) < 5
      setIsIncomplete(isSparse)
      console.log('[Onboarding v12] Analysis - Timeline:', timeline.length, 'Total Items:', meetingCount + taskCount, 'IsSparse:', isSparse)

      const onboardedKey = `executive_vai_onboarded_v11_${session?.user?.email}`
      const neverOnboarded = !localStorage.getItem(onboardedKey)
      
      if (neverOnboarded) {
        setShowWelcome(true)
      } else {
        setShowWelcome(false)
      }
    }
  }, [timeline, stats, session])

  useEffect(() => {
    const handleRefresh = () => loadData(true) // FORCE TRUE
    window.addEventListener('routine-synced', handleRefresh)
    return () => window.removeEventListener('routine-synced', handleRefresh)
  }, [loadData])

  useEffect(() => {
    if (session?.user?.email) {
      loadData()
    }
  }, [session])

  return (
    <div style={{ overflowY: 'auto', height: '100%', paddingBottom: 80 }} className="container-padding">
      {/* Top Status Bar (Clock & Sync) */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 16, marginBottom: 12, marginTop: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--brand-light)', fontWeight: 700, fontSize: 14 }}>
          <span style={{ fontSize: 16 }}>🕒</span>
          {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          <span style={{ opacity: 0.6, fontWeight: 500, fontSize: 12, marginLeft: 4 }}>
            {currentTime.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}
          </span>
        </div>
        <button 
          onClick={() => loadData(true)}
          className="btn-ghost"
          style={{ 
            padding: '6px 12px', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 8,
            fontSize: 12, fontWeight: 700, color: 'var(--brand)', background: 'var(--surface-2)'
          }}
        >
          <span style={{ animation: loading ? 'spin 1s linear infinite' : 'none', display: 'inline-block' }}>🔄</span>
          Sync
        </button>
      </div>

      {/* Proactive Onboarding / Welcome */}
      {showWelcome && (
        <section
          className="glass"
          style={{
            padding: 'clamp(20px, 5vw, 32px)', borderRadius: 24, marginBottom: 32, marginTop: 10,
            background: 'linear-gradient(135deg, var(--brand) 0%, #4f46e5 100%)',
            color: 'white', border: 'none', position: 'relative', overflow: 'hidden'
          }}
        >
          <div style={{ position: 'relative', zIndex: 2 }}>
            <h2 style={{ fontSize: 'clamp(20px, 5vw, 24px)', fontWeight: 800, marginBottom: 12 }}>Welcome, {session?.user?.name?.split(' ')[0] || 'Adriane'}! 👋</h2>
            <p style={{ fontSize: 'clamp(14px, 4vw, 16px)', opacity: 0.9, lineHeight: 1.6, maxWidth: 600 }}>
              I&apos;ve analyzed your schedule. Your schedule is looking sharp! You can refine, add, or delete events for today, tomorrow, next three days, weekend, weekdays, or your full week anytime.
            </p>
            
            <div style={{ display: 'flex', gap: 12, marginTop: 24, alignItems: 'center', flexWrap: 'wrap' }}>
              <button
                onClick={() => {
                  window.dispatchEvent(new CustomEvent('switch-tab', { detail: { tab: 'planner' } }))
                  setTimeout(() => {
                    window.dispatchEvent(new CustomEvent('open-routine-setup'))
                  }, 100)
                }}
                className="clutch-glow"
                style={{
                  padding: '12px 24px', borderRadius: 12, background: 'white', color: 'var(--brand)',
                  fontWeight: 800, border: 'none', cursor: 'pointer', fontSize: 14,
                  boxShadow: '0 4px 14px rgba(0,0,0,0.1)', transition: 'transform 0.2s'
                }}
                onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
              >
                Edit Schedule →
              </button>

              <button
                onClick={() => {
                  localStorage.setItem(`executive_vai_onboarded_v11_${session?.user?.email}`, 'true')
                  setShowWelcome(false)
                }}
                style={{
                  padding: '12px 24px', borderRadius: 12, background: 'rgba(255,255,255,0.15)', color: 'white',
                  fontWeight: 700, border: '1px solid rgba(255,255,255,0.3)', cursor: 'pointer', fontSize: 14,
                  backdropFilter: 'blur(10px)', transition: 'background 0.2s'
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.25)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}
              >
                Let&apos;s go
              </button>
            </div>
          </div>
          {/* Decorative Circle */}
          <div style={{
            position: 'absolute', right: -40, top: -40, width: 200, height: 200,
            borderRadius: '50%', background: 'rgba(255,255,255,0.1)', zIndex: 1
          }} />
        </section>
      )}

      {/* Hero Welcome (Normal state) */}
      {!showWelcome && (
        <section style={{ marginBottom: 40, marginTop: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div>
            <h2 style={{ fontSize: 28, fontWeight: 800, marginBottom: 8, letterSpacing: '-0.02em' }}>
              Your Command Center
            </h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <p style={{ color: 'var(--text-muted)', fontSize: 15, maxWidth: 600 }}>
                You have {stats[0].value} meetings and {stats[1].value} tasks on your radar today.
              </p>
            </div>
          </div>
        </section>
      )}

      {/* Plan My Week Hero Button */}
      <button
        onClick={() => {
          window.dispatchEvent(new CustomEvent('switch-tab', { detail: { tab: 'planner' } }))
          // Force calendar view if planner
          setTimeout(() => {
            // We can't easily force the sub-state from here without global state, 
            // but switching to planner is a good start.
          }, 100)
        }}
        className="glass"
        style={{
          width: '100%', padding: '32px 24px', borderRadius: 24, marginBottom: 40,
          background: 'linear-gradient(135deg, var(--brand-glow), rgba(99,102,241,0.05))',
          border: '1px solid rgba(99,102,241,0.2)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          cursor: 'pointer', transition: 'transform 0.2s',
          textAlign: 'left'
        }}
        onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
        onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
      >
        <div>
          <h3 style={{ fontSize: 20, fontWeight: 800, marginBottom: 6 }}>Plan Your Week</h3>
          <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>Visualize your full schedule and block time for deep work.</p>
        </div>
        <div style={{
          width: 48, height: 48, borderRadius: '50%', background: 'var(--brand)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20
        }}>
          📅
        </div>
      </button>

      {/* Grid Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 32 }}>

        {/* Left Column: AI Daily Briefing */}
        <section>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
            <h3 style={{ fontSize: 20, fontWeight: 800 }}>AI Daily Briefing</h3>
            <button
              className="btn-ghost"
              style={{ fontSize: 13, fontWeight: 700, color: 'var(--brand)' }}
              onClick={() => window.dispatchEvent(new CustomEvent('switch-tab', { detail: { tab: 'briefing' } }))}
            >
              Full Detailed View →
            </button>
          </div>

          {loading ? (
            <div style={{ padding: 60, textAlign: 'center' }} className="glass">
              <div className="typing-dot" style={{ margin: '0 auto 12px' }} />
              <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Synthesizing your briefing...</p>
            </div>
          ) : (!briefing?.greeting && timeline.length === 0) ? (
            <div style={{ padding: 40, textAlign: 'center', borderRadius: 24 }} className="glass">
              <span style={{ fontSize: 32, display: 'block', marginBottom: 12 }}>✨</span>
              <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Sync your schedule to generate a briefing.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

              {/* 1. Critical Radar */}
              {briefing?.urgentAlerts && briefing.urgentAlerts.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 16 }}>🚨</span>
                    <h4 style={{ fontSize: 14, fontWeight: 800, color: '#f87171', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Critical Radar</h4>
                  </div>
                  {briefing.urgentAlerts.map((a, i) => (
                    <div key={i} className="glass animate-pulse" style={{ padding: 16, borderRadius: 16, background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <p style={{ fontSize: 14, fontWeight: 800, color: '#ef4444' }}>{a.title} <span style={{ fontWeight: 400, opacity: 0.7, fontSize: 12, marginLeft: 8 }}>starts in {a.timeLeft}</span></p>
                    </div>
                  ))}
                </div>
              )}

              {/* 2. Timeline List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 16 }}>📅</span>
                  <h4 style={{ fontSize: 14, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Timeline</h4>
                </div>
                {timeline.length === 0 ? (
                  <div className="glass" style={{ padding: 24, borderRadius: 16, textAlign: 'center' }}>
                    <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No events scheduled for today.</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {timeline.map((ev, i) => {
                      const status = getEventStatus(ev)
                      const isPast = status === 'PAST'
                      const isNow = status === 'NOW'
                      const isNext = status === 'UP NEXT'

                      return (
                        <div
                          key={i}
                          className="glass-hover"
                          style={{
                            padding: 16, borderRadius: 16, display: 'flex', alignItems: 'center', gap: 16, transition: 'all 0.2s',
                            opacity: isPast ? 0.5 : 1,
                            border: isNow ? '1px solid var(--brand-glow)' : '1px solid transparent',
                            background: isNow ? 'rgba(99,102,241,0.05)' : 'transparent',
                            transform: isNow ? 'scale(1.02)' : 'scale(1)',
                            position: 'relative'
                          }}
                        >
                          <div style={{ minWidth: 60, fontSize: 12, fontWeight: 700, color: isNow ? 'var(--brand)' : 'var(--brand-light)' }}>{ev.time}</div>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <p style={{ fontSize: 14, fontWeight: 700 }}>{ev.title}</p>
                              {isNow && (
                                <span className="animate-pulse" style={{ padding: '2px 8px', borderRadius: 20, background: 'var(--brand)', color: 'white', fontSize: 9, fontWeight: 800 }}>
                                  NOW
                                </span>
                              )}
                              {isNext && i === timeline.findIndex(e => getEventStatus(e) === 'UP NEXT') && (
                                <span style={{ padding: '2px 8px', borderRadius: 20, background: 'rgba(99,102,241,0.1)', color: 'var(--brand-light)', fontSize: 9, fontWeight: 800, border: '1px solid var(--brand-glow)' }}>
                                  UP NEXT
                                </span>
                              )}
                            </div>
                            <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>{ev.duration} • {ev.type}</p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* 3. Email Actions */}
              {briefing?.emailInsights && briefing.emailInsights.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 16 }}>📧</span>
                    <h4 style={{ fontSize: 14, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Email Actions</h4>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 10 }}>
                    {briefing.emailInsights.slice(0, 3).map((e, i) => (
                      <div key={i} className="glass" style={{ padding: 14, borderRadius: 14, borderLeft: `4px solid ${e.priority === 'high' ? '#f87171' : 'var(--brand)'}` }}>
                        <p style={{ fontSize: 13, fontWeight: 700, marginBottom: 2 }}>{e.from}</p>
                        <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }}>{e.subject}</p>
                        <p style={{ fontSize: 12, color: 'var(--brand-light)', fontWeight: 600 }}>💡 {e.action}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 4. Motivational Note */}
              {briefing?.motivationalNote && (
                <div className="glass" style={{ padding: 20, borderRadius: 20, background: 'var(--surface-3)', textAlign: 'center', border: '1px dashed var(--brand-glow)' }}>
                  <p style={{ fontSize: 13, fontStyle: 'italic', color: 'var(--text-muted)', lineHeight: 1.6 }}>&ldquo;{briefing.motivationalNote}&rdquo;</p>
                </div>
              )}

            </div>
          )}
        </section>

        {/* Right Column: Performance & Actions */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

          {/* Weekly Performance Scorecard (New) */}
          {briefing && briefing.weeklyAnalysis && (
            <div className="glass" style={{ padding: 24, borderRadius: 24, background: 'linear-gradient(135deg, var(--surface-2) 0%, var(--bg) 100%)', border: '1px solid var(--brand-glow)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
                <span style={{ fontSize: 18 }}>📈</span>
                <h4 style={{ fontSize: 14, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Performance Scorecard</h4>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 16 }}>
                <div>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Productivity Score</p>
                  <h4 style={{ fontSize: 40, fontWeight: 900, color: 'var(--brand-light)', lineHeight: 1 }}>{briefing.weeklyAnalysis.productivityScore}%</h4>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Top Focus</p>
                  <p style={{ fontSize: 15, fontWeight: 800 }}>{briefing.weeklyAnalysis.topCategory}</p>
                </div>
              </div>
              <div style={{ height: 6, background: 'var(--surface-3)', borderRadius: 3, overflow: 'hidden', marginBottom: 16 }}>
                <div style={{ height: '100%', width: `${briefing.weeklyAnalysis.productivityScore}%`, background: 'var(--brand)', borderRadius: 3 }} />
              </div>
              <p style={{ fontSize: 12, lineHeight: 1.6, color: 'var(--text-subtle)', fontStyle: 'italic' }}>
                {briefing.weeklyAnalysis.summary}
              </p>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16 }}>
            {stats.map((stat, idx) => (
              <div
                key={idx}
                className="glass-hover"
                style={{
                  padding: 20,
                  borderRadius: 20,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 16,
                  transition: 'all 0.3s ease'
                }}
              >
                <div style={{
                  width: 48, height: 48, borderRadius: 14,
                  background: `${stat.color}15`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 20
                }}>
                  {stat.icon}
                </div>
                <div>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 2 }}>{stat.label}</div>
                  <div style={{ fontSize: 24, fontWeight: 800 }}>{stat.value}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="glass" style={{ padding: 24, borderRadius: 20, marginTop: 8, background: 'var(--surface-2)' }}>
            <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Pro Tip</h4>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6 }}>
              Ask me to &quot;Analyze my routine&quot; to see if you have enough focus blocks scheduled for this week.
            </p>
            <button
              onClick={() => {
                window.dispatchEvent(new CustomEvent('switch-tab', { detail: { tab: 'chat' } }))
                setTimeout(() => {
                  window.dispatchEvent(new CustomEvent('set-chat-input', { detail: { text: 'Analyze my routine for this week' } }))
                }, 100)
              }}
              style={{ marginTop: 12, color: 'var(--brand-light)', fontSize: 13, fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}
            >
              Try it now →
            </button>
          </div>
        </section>

      </div>
    </div>
  )
}
