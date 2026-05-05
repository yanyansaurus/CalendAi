'use client'
import { useState, useEffect } from 'react'

interface CalendarEvent {
  id: string
  title: string
  start: string
  end: string
}

interface Props {
  onClose: () => void
  onSelectSlot: (dateStr: string, timeStr: string, title: string, description: string, durationStr: string, recurrence: string) => void
  onSelectEvent?: (event: CalendarEvent) => void
  isRescheduleMode?: boolean
}

export default function WeekScheduleModal({ onClose, onSelectSlot, onSelectEvent, isRescheduleMode }: Props) {
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)

  // Draft Form State
  const [title, setTitle] = useState('Meeting')
  const [description, setDescription] = useState('')
  const [durationMode, setDurationMode] = useState<'15m' | '30m' | '1hr' | '2hr' | 'custom'>('1hr')
  const [customMins, setCustomMins] = useState('45')
  const [recurrence, setRecurrence] = useState<'One-time' | 'Weekly' | 'Permanent'>('One-time')

  useEffect(() => {
    fetch('/api/calendar/week')
      .then(res => res.json())
      .then(data => {
        if (data.events) setEvents(data.events)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  // Generate the next 7 days
  const days = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date()
    d.setDate(d.getDate() + i)
    return d
  })

  // Standard working hours start/end
  const START_HOUR = 9
  const END_HOUR = 17

  const formatTime = (h: number) => {
    const hour = Math.floor(h)
    const mins = Math.round((h - hour) * 60)
    const period = hour >= 12 ? 'PM' : 'AM'
    const displayHour = hour > 12 ? hour - 12 : (hour === 0 ? 12 : hour)
    return `${displayHour}:${mins.toString().padStart(2, '0')} ${period}`
  }

  // Generate slots based on duration mode
  const getSlots = () => {
    // If duration is 15m, show 15m slots. Otherwise show 30m slots for flexibility.
    const step = durationMode === '15m' ? 0.25 : 0.5
    const list: number[] = []
    for (let h = START_HOUR; h < END_HOUR; h += step) {
      list.push(h)
    }
    return list
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)',
      padding: 20
    }} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="glass" style={{
        width: '100%', maxWidth: 900, height: '80vh',
        background: 'var(--surface)', borderRadius: 24,
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        boxShadow: '0 24px 64px rgba(0,0,0,0.5)', border: '1px solid var(--border)'
      }}>
        {/* Header & Settings Form */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h2 style={{ fontSize: 20, fontWeight: 800 }}>
                {isRescheduleMode ? '🔄 Select Event to Reschedule' : '📅 Draft New Event'}
              </h2>
              <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                {isRescheduleMode 
                  ? 'Click an existing event (highlighted) to pick it for rescheduling.' 
                  : 'Configure details, then click a slot below to insert.'}
              </p>
            </div>
            <button onClick={onClose} style={{ background: 'var(--surface-3)', border: 'none', width: 32, height: 32, borderRadius: '50%', color: 'var(--text)', cursor: 'pointer' }}>✕</button>
          </div>

          {!isRescheduleMode && (
            <>
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                <div style={{ flex: '1 1 200px' }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-subtle)', marginBottom: 4 }}>Event Title</label>
                  <input value={title} onChange={e => setTitle(e.target.value)} style={{ width: '100%', padding: '8px 12px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', fontSize: 14 }} placeholder="E.g., Strategy Sync" />
                </div>
                <div style={{ flex: '1 1 300px' }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-subtle)', marginBottom: 4 }}>Description (Optional)</label>
                  <input value={description} onChange={e => setDescription(e.target.value)} style={{ width: '100%', padding: '8px 12px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', fontSize: 14 }} placeholder="E.g., Discuss Q3 goals" />
                </div>
              </div>

              <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'center' }}>
                {/* Duration */}
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-subtle)', marginBottom: 6 }}>Duration</label>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    {['15m', '30m', '1hr', '2hr'].map(mode => (
                      <button key={mode} onClick={() => setDurationMode(mode as any)} style={{ padding: '6px 12px', fontSize: 12, borderRadius: 6, cursor: 'pointer', border: '1px solid', borderColor: durationMode === mode ? 'var(--brand)' : 'var(--border)', background: durationMode === mode ? 'rgba(99,102,241,0.1)' : 'var(--surface-2)', color: durationMode === mode ? 'var(--brand-light)' : 'var(--text)', fontWeight: durationMode === mode ? 700 : 500, transition: 'all 0.2s' }}>{mode}</button>
                    ))}
                    <button onClick={() => setDurationMode('custom')} style={{ padding: '6px 12px', fontSize: 12, borderRadius: 6, cursor: 'pointer', border: '1px solid', borderColor: durationMode === 'custom' ? 'var(--brand)' : 'var(--border)', background: durationMode === 'custom' ? 'rgba(99,102,241,0.1)' : 'var(--surface-2)', color: durationMode === 'custom' ? 'var(--brand-light)' : 'var(--text)', fontWeight: durationMode === 'custom' ? 700 : 500, transition: 'all 0.2s' }}>Custom</button>
                    {durationMode === 'custom' && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 6 }}>
                        <input type="number" value={customMins} onChange={e => setCustomMins(e.target.value)} style={{ width: 60, padding: '6px', background: 'var(--surface-3)', border: '1px solid var(--brand)', borderRadius: 6, color: 'var(--text)', fontSize: 12, textAlign: 'center' }} />
                        <span style={{ fontSize: 12, color: 'var(--text-subtle)' }}>mins</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Recurrence */}
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-subtle)', marginBottom: 6 }}>Recurrence</label>
                  <select value={recurrence} onChange={e => setRecurrence(e.target.value as any)} style={{ padding: '6px 12px', fontSize: 12, borderRadius: 6, cursor: 'pointer', border: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--text)', outline: 'none' }}>
                    <option value="One-time">One-time Event</option>
                    <option value="Weekly">Weekly</option>
                    <option value="Permanent">Permanent (Daily)</option>
                  </select>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
              <div className="typing-dot" />
              <div className="typing-dot" style={{ margin: '0 6px' }} />
              <div className="typing-dot" />
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
              {days.map((day, i) => {
                const dayEvents = events.filter(e => new Date(e.start).toDateString() === day.toDateString())
                
                return (
                  <div key={i} style={{ background: 'var(--surface-2)', borderRadius: 16, padding: 16, border: '1px solid var(--border)' }}>
                    <div style={{ marginBottom: 12, borderBottom: '1px solid var(--border)', paddingBottom: 8 }}>
                      <div style={{ fontWeight: 800 }}>{day.toLocaleDateString('en-US', { weekday: 'long' })}</div>
                      <div style={{ fontSize: 12, color: 'var(--brand-light)' }}>{day.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
                    </div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {(() => {
                        const slots: JSX.Element[] = []
                        let currentH = START_HOUR
                        const step = durationMode === '15m' ? 0.25 : 0.5

                        // Sort events for the day to handle them sequentially
                        const sortedEvents = [...dayEvents].sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())

                        while (currentH < END_HOUR) {
                          const timeStr = formatTime(currentH)
                          
                          // Is there an event starting at or covering this currentH?
                          const event = sortedEvents.find(e => {
                            const start = new Date(e.start)
                            const eStart = start.getHours() + (start.getMinutes() / 60)
                            const eEnd = new Date(e.end).getHours() + (new Date(e.end).getMinutes() / 60)
                            return currentH >= eStart && currentH < eEnd
                          })

                          if (event) {
                            const eStart = new Date(event.start).getHours() + (new Date(event.start).getMinutes() / 60)
                            const eEnd = new Date(event.end).getHours() + (new Date(event.end).getMinutes() / 60)
                            const durationHrs = eEnd - eStart
                            
                            if (isRescheduleMode && onSelectEvent) {
                              slots.push(
                                <button
                                  key={event.id + currentH}
                                  onClick={() => onSelectEvent(event)}
                                  className="animate-pulse"
                                  style={{ 
                                    fontSize: 11, padding: '10px', background: 'rgba(99, 102, 241, 0.1)', 
                                    color: 'var(--brand-light)', borderRadius: 12, border: '1px solid var(--brand)',
                                    textAlign: 'left', cursor: 'pointer', transition: 'all 0.2s',
                                    marginBottom: 4
                                  }}
                                >
                                  <strong style={{ display: 'block', fontSize: 12 }}>{formatTime(eStart)} – {formatTime(eEnd)}</strong>
                                  <span style={{ fontSize: 11, fontWeight: 600 }}>{event.title}</span>
                                </button>
                              )
                            } else {
                              slots.push(
                                <div key={event.id + currentH} style={{ fontSize: 11, padding: '10px', background: 'rgba(239, 68, 68, 0.05)', color: 'rgba(239, 68, 68, 0.6)', borderRadius: 12, borderLeft: '3px solid rgba(239, 68, 68, 0.3)', marginBottom: 4 }}>
                                  <strong style={{ display: 'block' }}>{formatTime(eStart)} – {formatTime(eEnd)}</strong>
                                  <span>{event.title}</span>
                                </div>
                              )
                            }
                            // Advance currentH to the end of this event
                            currentH = eEnd
                            continue
                          }

                          // If no event, render an empty slot
                          if (!isRescheduleMode) {
                            let durHours = 1
                            if (durationMode === '15m') durHours = 0.25
                            if (durationMode === '30m') durHours = 0.5
                            if (durationMode === '2hr') durHours = 2
                            if (durationMode === 'custom') durHours = Math.max(0.25, parseInt(customMins) / 60)
                            
                            const endH = currentH + durHours
                            const endTimeStr = formatTime(endH)

                            // Don't render if it goes past the end hour
                            if (endH <= END_HOUR) {
                              slots.push(
                                <button
                                  key={currentH}
                                  onClick={() => {
                                    let durStr = '1 hour'
                                    if (durationMode === '15m') durStr = '15 minutes'
                                    if (durationMode === '30m') durStr = '30 minutes'
                                    if (durationMode === '2hr') durStr = '2 hours'
                                    if (durationMode === 'custom') durStr = `${customMins} minutes`
                                    onSelectSlot(day.toLocaleDateString('en-US', { weekday: 'long' }), timeStr, title, description, durStr, recurrence)
                                  }}
                                  style={{ 
                                    fontSize: 12, padding: '10px 12px', background: 'var(--surface-3)', border: '1px dashed var(--border)', 
                                    color: 'var(--text)', borderRadius: 12, textAlign: 'left', cursor: 'pointer', transition: 'all 0.2s',
                                    display: 'flex', flexDirection: 'column', gap: 2, marginBottom: 4
                                  }}
                                  onMouseEnter={e => {
                                    e.currentTarget.style.borderColor = 'var(--brand)'
                                    e.currentTarget.style.background = 'rgba(99, 102, 241, 0.05)'
                                  }}
                                  onMouseLeave={e => {
                                    e.currentTarget.style.borderColor = 'var(--border)'
                                    e.currentTarget.style.background = 'var(--surface-3)'
                                  }}
                                >
                                  <span style={{ fontWeight: 700, color: 'var(--brand-light)', fontSize: 11 }}>{timeStr} – {endTimeStr}</span>
                                  <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Available Slot</span>
                                </button>
                              )
                            }
                            
                            // Advance currentH by the duration of the slot we just rendered
                            currentH = endH
                            continue
                          }
                          currentH += step
                        }
                        return slots
                      })()}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
