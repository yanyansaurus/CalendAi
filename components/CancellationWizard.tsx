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
  onComplete: (eventId: string, title: string) => void
}

export default function CancellationWizard({ onClose, onComplete }: Props) {
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [scrubbingId, setScrubbingId] = useState<string | null>(null)
  const [confirmingId, setConfirmingId] = useState<string | null>(null)
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const [successEvent, setSuccessEvent] = useState<string | null>(null)

  useEffect(() => {
    const start = new Date()
    start.setHours(0,0,0,0)
    const end = new Date(start)
    end.setDate(start.getDate() + 7)
    
    fetch(`/api/calendar/week?timeMin=${start.toISOString()}&timeMax=${end.toISOString()}`)
      .then(res => res.json())
      .then(data => {
        if (data.events) setEvents(data.events)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const days = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date()
    d.setDate(d.getDate() + i)
    return d
  })

  const formatTime = (iso: string) => {
    return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  }

  const handleScrub = async (id: string, title: string) => {
    setScrubbingId(id)
    setConfirmingId(null)
    try {
      const res = await fetch(`/api/calendar/delete?eventId=${id}`, { method: 'DELETE' })
      if (res.ok) {
        setSuccessEvent(title)
        setTimeout(() => {
          onComplete(id, title)
        }, 1500)
      }
    } catch (e) {
      console.error(e)
    }
    setScrubbingId(null)
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(20, 10, 10, 0.9)', backdropFilter: 'blur(12px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20
    }}>
      <div className="animate-scale-in" style={{
        width: '100%', maxWidth: 1000, height: '85vh',
        background: 'linear-gradient(135deg, rgba(40,10,10,0.95) 0%, rgba(20,5,5,0.98) 100%)',
        borderRadius: 32, border: '1px solid rgba(239,68,68,0.2)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.8), 0 0 40px rgba(239,68,68,0.1)'
      }}>
        
        {/* Header */}
        <div style={{ padding: '24px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(239,68,68,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🧹</div>
            <div>
              <h2 style={{ fontSize: 20, fontWeight: 800, color: '#fff' }}>Executive Scrub Mode</h2>
              <p style={{ fontSize: 12, color: 'rgba(239,68,68,0.6)', margin: 0 }}>Select events to remove from your schedule</p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: '#fff', width: 32, height: 32, borderRadius: 16, cursor: 'pointer' }}>✕</button>
        </div>

        {/* Content */}
        <div style={{ 
          flex: 1, 
          padding: '32px', 
          overflowX: 'auto', 
          display: 'grid', 
          gridTemplateColumns: 'repeat(7, 240px)', 
          gap: 24,
          background: 'rgba(0,0,0,0.1)'
        }}>
          {loading ? (
            <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'rgba(239,68,68,0.4)' }}>
              Retrieving mission target list...
            </div>
          ) : (
            days.map((day, i) => {
              const dayEvents = events.filter(e => new Date(e.start).toDateString() === day.toDateString())
              return (
                <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ borderBottom: '1px solid rgba(239,68,68,0.1)', paddingBottom: 8, marginBottom: 4 }}>
                    <div style={{ fontWeight: 800, color: '#fff', fontSize: 14 }}>{day.toLocaleDateString('en-US', { weekday: 'long' })}</div>
                    <div style={{ fontSize: 11, color: '#ef4444' }}>{day.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
                  </div>
                  
                  {dayEvents.length === 0 ? (
                    <div style={{ padding: 20, borderRadius: 16, border: '1px dashed rgba(255,255,255,0.05)', fontSize: 11, color: 'rgba(255,255,255,0.2)', textAlign: 'center' }}>
                      Clear Path
                    </div>
                  ) : (
                    dayEvents.map(ev => (
                      <button 
                        key={ev.id} 
                        onClick={() => setSelectedEvent(ev)}
                        disabled={!!scrubbingId}
                        style={{
                          width: '100%', padding: 16, borderRadius: 16, textAlign: 'left',
                          background: confirmingId === ev.id ? 'rgba(239,68,68,0.25)' : scrubbingId === ev.id ? 'rgba(239,68,68,0.3)' : 'rgba(239,68,68,0.08)',
                          border: confirmingId === ev.id ? '2px solid #ef4444' : '1px solid rgba(239,68,68,0.2)', cursor: 'pointer',
                          transition: 'all 0.2s', position: 'relative', overflow: 'hidden',
                          boxShadow: confirmingId === ev.id ? '0 0 20px rgba(239,68,68,0.2)' : 'none'
                        }}
                      >
                        <div style={{ fontSize: 10, color: '#ef4444', fontWeight: 700, marginBottom: 4 }}>{formatTime(ev.start)}</div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#fff', lineHeight: 1.3 }}>{ev.title}</div>
                        
                        {confirmingId === ev.id && !scrubbingId && (
                          <div className="animate-pulse" style={{ marginTop: 12, padding: '6px 0', textAlign: 'center', background: '#ef4444', borderRadius: 8, fontSize: 11, fontWeight: 800, color: '#fff' }}>
                            CONFIRM SCRUB
                          </div>
                        )}

                        {scrubbingId === ev.id && (
                          <div style={{ position: 'absolute', bottom: 0, left: 0, height: 2, background: '#ef4444', animation: 'progress 1.5s linear' }} />
                        )}
                        
                        {!confirmingId && (
                          <div className="scrub-hover" style={{ position: 'absolute', inset: 0, background: 'rgba(239, 68, 68, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: 'opacity 0.2s' }}>
                            <span style={{ fontSize: 12, fontWeight: 800, color: '#fff' }}>SCRUB MISSION</span>
                          </div>
                        )}
                      </button>
                    ))
                  )}
                </div>
              )
            })
          )}
        </div>

        {/* Detail Overlay / Confirmation */}
        {selectedEvent && !successEvent && (
          <div style={{
            position: 'absolute', inset: 0, zIndex: 50,
            background: 'rgba(20,5,5,0.9)', backdropFilter: 'blur(10px)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            animation: 'fadeIn 0.3s ease-out'
          }}>
            <div className="glass animate-scale-in" style={{
              width: '100%', maxWidth: 450, padding: 40, borderRadius: 32,
              border: '1px solid #ef4444', textAlign: 'center', background: 'rgba(255,255,255,0.02)'
            }}>
              <div style={{ fontSize: 40, marginBottom: 20 }}>🎯</div>
              <h3 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>Target Audit</h3>
              <div style={{ fontSize: 18, fontWeight: 600, color: '#ef4444', marginBottom: 24 }}>{selectedEvent.title}</div>
              
              <div style={{ padding: 20, borderRadius: 20, background: 'rgba(255,255,255,0.05)', marginBottom: 32, textAlign: 'left', fontSize: 13, display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>🕒 {new Date(selectedEvent.start).toLocaleString()}</div>
                <div style={{ color: '#ef4444', fontWeight: 700 }}>⚠️ This will cancel the meeting for all attendees.</div>
              </div>

              <div style={{ display: 'flex', gap: 16 }}>
                <button 
                  onClick={() => setSelectedEvent(null)}
                  style={{ flex: 1, padding: '14px', borderRadius: 14, background: 'rgba(255,255,255,0.05)', border: 'none', color: '#fff', fontWeight: 600, cursor: 'pointer' }}
                >
                  Abort
                </button>
                <button 
                  onClick={() => handleScrub(selectedEvent.id, selectedEvent.title)}
                  disabled={!!scrubbingId}
                  style={{ flex: 1, padding: '14px', borderRadius: 14, background: '#ef4444', border: 'none', color: '#fff', fontWeight: 800, cursor: 'pointer', boxShadow: '0 10px 20px rgba(239,68,68,0.3)' }}
                >
                  {scrubbingId ? 'Scrubbing...' : 'Confirm Scrub'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Success Overlay */}
        {successEvent && (
          <div style={{
            position: 'absolute', inset: 0, zIndex: 100,
            background: 'rgba(20,5,5,0.95)', display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', textAlign: 'center',
            animation: 'fadeIn 0.4s ease-out'
          }}>
            <div className="animate-scale-in" style={{ fontSize: 64, marginBottom: 24 }}>💨</div>
            <h2 style={{ fontSize: 32, fontWeight: 800, marginBottom: 12, color: '#ef4444' }}>Mission Scrubbed</h2>
            <p style={{ color: 'rgba(255,255,255,0.6)', maxWidth: 300, lineHeight: 1.6 }}>"{successEvent}" has been removed from your path.</p>
          </div>
        )}

        <style jsx>{`
          button:hover .scrub-hover {
            opacity: 1 !important;
          }
          @keyframes progress {
            from { width: 0; }
            to { width: 100%; }
          }
        `}</style>
      </div>
    </div>
  )
}
