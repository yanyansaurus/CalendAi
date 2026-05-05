'use client'
import { useEffect, useState } from 'react'

interface HomeStat {
  label: string
  value: string | number
  icon: string
  color: string
}

interface TimelineEvent {
  time: string
  title: string
  description?: string
  duration: string
  type: 'meeting' | 'task' | 'focus'
}

export default function HomePanel() {
  const [stats, setStats] = useState<HomeStat[]>([
    { label: 'Meetings Today', value: '...', icon: '🗓️', color: 'var(--brand)' },
    { label: 'Pending Tasks', value: '...', icon: '✅', color: '#10b981' },
    { label: 'Email Insights', value: '...', icon: '📧', color: '#6366f1' },
  ])
  const [timeline, setTimeline] = useState<TimelineEvent[]>([])
  const [loading, setLoading] = useState(true)

  const loadData = async () => {
    // 1. Try to load from cache first for instant UI
    const cached = localStorage.getItem('executive_vai_home_cache')
    if (cached) {
      try {
        const { stats: cStats, timeline: cTimeline } = JSON.parse(cached)
        setStats(cStats)
        setTimeline(cTimeline)
        setLoading(false) // We have data, don't show spinner
      } catch { /* ignore */ }
    }

    try {
      const res = await fetch('/api/briefing')
      if (res.ok) {
        const data = await res.json()
        const b = data.briefing
        
        // Map stats
        const newStats: HomeStat[] = [
          { label: 'Meetings Today', value: b.todayReminders?.filter((r: any) => r.type === 'calendar').length || 0, icon: '🗓️', color: 'var(--brand)' },
          { label: 'Pending Tasks', value: data.tasksCount || 0, icon: '✅', color: '#10b981' },
          { label: 'Email Insights', value: data.emailsCount || 0, icon: '📧', color: '#6366f1' },
        ]

        // Map timeline
        const newTimeline: TimelineEvent[] = b.todayReminders?.map((r: any) => ({
          time: r.time,
          title: r.title,
          description: r.description,
          duration: r.duration || (r.type === 'calendar' ? '30m' : 'Task'),
          type: r.type === 'calendar' ? 'meeting' : 'task'
        })) || []

        setStats(newStats)
        setTimeline(newTimeline)
        
        // 2. Save to cache for next time
        localStorage.setItem('executive_vai_home_cache', JSON.stringify({
          stats: newStats,
          timeline: newTimeline,
          timestamp: Date.now()
        }))
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, [])

  return (
    <div style={{ overflowY: 'auto', height: '100%', paddingBottom: 80 }} className="container-padding">
      {/* Hero Welcome */}
      <section style={{ marginBottom: 40, marginTop: 10 }}>
        <h2 style={{ fontSize: 28, fontWeight: 800, marginBottom: 8, letterSpacing: '-0.02em' }}>
          Your Command Center
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: 15, maxWidth: 600 }}>
          You have {stats[0].value} meetings and {stats[1].value} tasks on your radar today.
        </p>
      </section>

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
        
        {/* Left Column: Today's Timeline */}
        <section>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h3 style={{ fontSize: 18, fontWeight: 700 }}>Today&apos;s Timeline</h3>
            <button 
              className="btn-ghost" 
              style={{ fontSize: 12 }}
              onClick={() => window.dispatchEvent(new CustomEvent('switch-tab', { detail: { tab: 'briefing' } }))}
            >
              Full Briefing →
            </button>
          </div>
          
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center' }} className="glass">
              <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Gathering schedule...</p>
            </div>
          ) : timeline.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', borderRadius: 20 }} className="glass">
              <span style={{ fontSize: 32, display: 'block', marginBottom: 12 }}>✨</span>
              <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Your schedule is clear for today.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0, paddingLeft: 12, borderLeft: '2px solid var(--border)' }}>
              {timeline.map((ev, i) => (
                <div key={i} style={{ position: 'relative', paddingLeft: 24, paddingBottom: 24 }}>
                  {/* Timeline Dot */}
                  <div style={{ 
                    position: 'absolute', left: -7, top: 4, width: 12, height: 12, 
                    borderRadius: '50%', background: ev.type === 'meeting' ? 'var(--brand)' : '#10b981',
                    border: '3px solid var(--bg)'
                  }} />
                  <div className="glass" style={{ padding: '12px 16px', borderRadius: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-subtle)' }}>{ev.time}</span>
                      <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: 'var(--surface-3)', color: 'var(--text-muted)' }}>{ev.duration}</span>
                    </div>
                    <p style={{ fontSize: 14, fontWeight: 700, marginBottom: ev.description ? 6 : 0, color: 'var(--text)' }}>{ev.title}</p>
                    {ev.description && (
                      <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>
                        {ev.description}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Right Column: Stats & Quick Actions */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: -4 }}>Quick Stats</h3>
          {stats.map((stat, i) => (
            <div key={i} className="glass" style={{ padding: 20, borderRadius: 18, display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ 
                width: 44, height: 44, borderRadius: 12, background: `${stat.color}15`, 
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20
              }}>
                {stat.icon}
              </div>
              <div>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 2 }}>{stat.label}</p>
                <p style={{ fontSize: 20, fontWeight: 800 }}>{stat.value}</p>
              </div>
            </div>
          ))}

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
