'use client'
import { useEffect, useState, useCallback } from 'react'

interface CalendarEvent {
  id: string
  title: string
  start: string
  end: string
  isAllDay: boolean
  location: string
  meetLink: string
  colorId: string
  status: string
}

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const HOURS = Array.from({ length: 19 }, (_, i) => i + 5) // 5 AM – 11 PM

const EVENT_COLORS: Record<string, string> = {
  '0': '#6366f1', '1': '#a78bfa', '2': '#34d399', '3': '#c084fc',
  '4': '#f87171', '5': '#fbbf24', '6': '#f97316', '7': '#38bdf8',
  '8': '#64748b', '9': '#818cf8', '10': '#22d3ee', '11': '#ef4444',
}

export default function WeekSchedule() {
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [weekStart, setWeekStart] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [offsetWeeks, setOffsetWeeks] = useState(0)

  const loadWeek = useCallback(async (offset: number) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/calendar/week?offset=${offset}`)
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? `Error ${res.status}`)
      }
      const data = await res.json()
      setEvents(data.events)
      setWeekStart(data.weekStart)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadWeek(offsetWeeks) }, [offsetWeeks, loadWeek])

  const goToWeek = (dir: number) => setOffsetWeeks(prev => prev + dir)

  // Derive the 7 days from weekStart
  const days = weekStart
    ? Array.from({ length: 7 }, (_, i) => {
        const d = new Date(weekStart)
        d.setDate(d.getDate() + i)
        return d
      })
    : []

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Format the week range for the header
  const weekLabel = days.length
    ? `${days[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${days[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
    : ''

  // Get events for a specific day (non-all-day)
  const getDayEvents = (dayDate: Date) =>
    events.filter(e => {
      if (e.isAllDay) return false
      const eStart = new Date(e.start)
      return (
        eStart.getFullYear() === dayDate.getFullYear() &&
        eStart.getMonth() === dayDate.getMonth() &&
        eStart.getDate() === dayDate.getDate()
      )
    })

  // Get all-day events for a specific day
  const getAllDayEvents = (dayDate: Date) =>
    events.filter(e => {
      if (!e.isAllDay) return false
      const eDate = new Date(e.start)
      return (
        eDate.getFullYear() === dayDate.getFullYear() &&
        eDate.getMonth() === dayDate.getMonth() &&
        eDate.getDate() === dayDate.getDate()
      )
    })

  // Calculate top offset & height for timed events
  const getEventStyle = (event: CalendarEvent) => {
    const start = new Date(event.start)
    const end   = new Date(event.end)
    const startHour = start.getHours() + start.getMinutes() / 60
    const endHour   = end.getHours()   + end.getMinutes()   / 60
    const top    = Math.max(0, (startHour - 5) * 60) // px, 60px per hour
    const height = Math.max(20, (endHour - startHour) * 60)
    return { top, height }
  }

  if (loading) {
    return (
      <div style={{ padding: 40, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
        <div style={{ display: 'flex', gap: 6 }}>
          <div className="typing-dot" style={{ width: 10, height: 10 }} />
          <div className="typing-dot" style={{ width: 10, height: 10 }} />
          <div className="typing-dot" style={{ width: 10, height: 10 }} />
        </div>
        <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Loading your schedule…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <p style={{ color: 'var(--danger)', marginBottom: 16 }}>{error}</p>
        <button className="btn-brand" onClick={() => loadWeek(offsetWeeks)}>🔄 Retry</button>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>

      {/* ── Week Navigation Header ─────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 24px', borderBottom: '1px solid var(--border)', flexShrink: 0,
      }}>
        <button className="btn-ghost" onClick={() => goToWeek(-1)} style={{ fontSize: 18, padding: '4px 12px' }}>←</button>
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>{weekLabel}</h2>
          {offsetWeeks !== 0 && (
            <button
              onClick={() => setOffsetWeeks(0)}
              style={{
                background: 'none', border: 'none', color: 'var(--brand-light)',
                fontSize: 12, cursor: 'pointer', marginTop: 4,
              }}
            >
              ← Back to this week
            </button>
          )}
        </div>
        <button className="btn-ghost" onClick={() => goToWeek(1)} style={{ fontSize: 18, padding: '4px 12px' }}>→</button>
      </div>

      {/* ── Event count summary ────────────────────────────────────── */}
      <div style={{
        display: 'flex', gap: 16, padding: '10px 24px', borderBottom: '1px solid var(--border)',
        fontSize: 12, color: 'var(--text-muted)', flexShrink: 0,
      }}>
        <span>📅 {events.filter(e => !e.isAllDay).length} timed events</span>
        <span>🌐 {events.filter(e => e.isAllDay).length} all-day events</span>
        <span>🔗 {events.filter(e => e.meetLink).length} with meeting links</span>
      </div>

      {/* ── Grid: Time slots ───────────────────────────────────────── */}
      <div style={{ flex: 1, overflow: 'auto' }} className="calendar-scroll-container">
        
        {/* Day Headers (Sticky at top) */}
        <div style={{
          display: 'grid', 
          gridTemplateColumns: '60px repeat(7, minmax(120px, 1fr))',
          position: 'sticky',
          top: 0,
          zIndex: 30,
          background: 'var(--surface)',
          borderBottom: '1px solid var(--border)',
          minWidth: 'fit-content'
        }}>
          <div style={{ position: 'sticky', left: 0, background: 'var(--surface)', zIndex: 31, borderRight: '1px solid var(--border)' }} />
          {days.map((d, i) => {
            const isToday = d.getTime() === today.getTime()
            return (
              <div key={i} style={{
                textAlign: 'center', padding: '10px 4px',
                borderLeft: '1px solid var(--border)',
                background: isToday ? 'rgba(99,102,241,0.08)' : 'transparent',
                minWidth: 120
              }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: isToday ? 'var(--brand-light)' : 'var(--text-muted)' }}>
                  {DAY_LABELS[i]}
                </div>
                <div style={{
                  fontSize: 18, fontWeight: 700, marginTop: 2,
                  color: isToday ? 'var(--brand-light)' : 'var(--text)',
                  ...(isToday ? {
                    background: 'var(--brand)', color: '#fff', borderRadius: '50%',
                    width: 28, height: 28, lineHeight: '28px', margin: '2px auto 0',
                  } : {}),
                }}>
                  {d.getDate()}
                </div>
              </div>
            )
          })}
        </div>

        {/* All-day events (Sticky below headers) */}
        {events.some(e => e.isAllDay) && (
          <div style={{
            display: 'grid', 
            gridTemplateColumns: '60px repeat(7, minmax(120px, 1fr))',
            position: 'sticky',
            top: 50, // Height of headers
            zIndex: 25,
            background: 'var(--surface)',
            borderBottom: '1px solid var(--border)',
            minWidth: 'fit-content'
          }}>
            <div style={{ 
              position: 'sticky', left: 0, background: 'var(--surface)', zIndex: 26, 
              padding: '6px 8px', fontSize: 9, color: 'var(--text-subtle)', borderRight: '1px solid var(--border)' 
            }}>All Day</div>
            {days.map((d, i) => {
              const adEvents = getAllDayEvents(d)
              return (
                <div key={i} style={{ padding: '4px 4px', minHeight: 28, borderLeft: '1px solid var(--border)', minWidth: 120 }}>
                  {adEvents.map(ev => (
                    <div key={ev.id} style={{
                      background: 'rgba(99,102,241,0.2)', color: 'var(--brand-light)',
                      padding: '2px 6px', borderRadius: 4, fontSize: 10, marginBottom: 2,
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    }}>
                      {ev.title}
                    </div>
                  ))}
                </div>
              )
            })}
          </div>
        )}

        <div style={{
          display: 'grid', 
          gridTemplateColumns: '60px repeat(7, minmax(120px, 1fr))',
          position: 'relative',
          minWidth: 'fit-content'
        }}>
          {/* Time gutter - Sticky on mobile? */}
          <div style={{ 
            position: 'sticky', 
            left: 0, 
            zIndex: 20, 
            background: 'var(--bg)',
            borderRight: '1px solid var(--border)'
          }}>
            {HOURS.map(h => (
              <div key={h} style={{
                height: 60, padding: '0 8px', display: 'flex', alignItems: 'flex-start',
                justifyContent: 'flex-end', fontSize: 10, color: 'var(--text-subtle)',
                borderBottom: '1px solid var(--border)',
              }}>
                {h === 0 ? '12 AM' : h <= 12 ? `${h} AM` : `${h - 12} PM`}
              </div>
            ))}
          </div>

          {/* Day columns */}
          {days.map((d, dayIdx) => {
            const dayEvents = getDayEvents(d)
            const isToday = d.getTime() === today.getTime()
            return (
              <div key={dayIdx} style={{
                position: 'relative',
                borderLeft: '1px solid var(--border)',
                background: isToday ? 'rgba(99,102,241,0.05)' : 'transparent',
                borderRight: isToday ? '1px solid var(--brand-glow)' : 'none',
                minWidth: 120
              }}>
                {/* Hour grid lines */}
                {HOURS.map(h => (
                  <div key={h} style={{
                    height: 60,
                    borderBottom: '1px solid var(--border)',
                  }} />
                ))}

                {/* Events */}
                {dayEvents.map(ev => {
                  const { top, height } = getEventStyle(ev)
                  const color = EVENT_COLORS[ev.colorId] ?? EVENT_COLORS['0']
                  const startTime = new Date(ev.start).toLocaleTimeString('en-US', {
                    hour: 'numeric', minute: '2-digit', hour12: true,
                  })
                  return (
                    <div
                      key={ev.id}
                      title={`${ev.title}\n${startTime}${ev.location ? `\n📍 ${ev.location}` : ''}`}
                      style={{
                        position: 'absolute',
                        top, left: 2, right: 2,
                        height: Math.max(height, 22),
                        background: `${color}22`,
                        borderLeft: `3px solid ${color}`,
                        borderRadius: 6,
                        padding: '3px 6px',
                        overflow: 'hidden',
                        cursor: 'default',
                        transition: 'transform 0.1s, box-shadow 0.1s',
                        zIndex: 1,
                      }}
                      onMouseEnter={e => {
                        (e.currentTarget as HTMLElement).style.transform = 'scale(1.02)'
                        ;(e.currentTarget as HTMLElement).style.boxShadow = `0 4px 12px ${color}33`
                        ;(e.currentTarget as HTMLElement).style.zIndex = '10'
                      }}
                      onMouseLeave={e => {
                        (e.currentTarget as HTMLElement).style.transform = 'scale(1)'
                        ;(e.currentTarget as HTMLElement).style.boxShadow = 'none'
                        ;(e.currentTarget as HTMLElement).style.zIndex = '1'
                      }}
                    >
                      <div style={{
                        fontSize: 11, fontWeight: 600, color,
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      }}>
                        {ev.title}
                      </div>
                      {height >= 36 && (
                        <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 1 }}>
                          {startTime}
                        </div>
                      )}
                    </div>
                  )
                })}

                {/* Current time indicator */}
                {isToday && (() => {
                  const now = new Date()
                  const nowHour = now.getHours() + now.getMinutes() / 60
                  if (nowHour < 5 || nowHour > 23) return null
                  const top = (nowHour - 5) * 60
                  return (
                    <div style={{
                      position: 'absolute', top, left: 0, right: 0,
                      height: 2, background: '#ef4444', zIndex: 5,
                      boxShadow: '0 0 6px rgba(239,68,68,0.5)',
                    }}>
                      <div style={{
                        width: 8, height: 8, borderRadius: '50%',
                        background: '#ef4444', position: 'absolute',
                        left: -4, top: -3,
                      }} />
                    </div>
                  )
                })()}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
