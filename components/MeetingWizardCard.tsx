'use client'

import { useState, useEffect, useRef } from 'react'

interface MeetingWizardCardProps {
  onComplete: (details: any) => void
  onCancel: () => void
}

export default function MeetingWizardCard({ onComplete, onCancel }: MeetingWizardCardProps) {
  const [step, setStep] = useState(1)

  // Step 1: Configuration
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [recurrence, setRecurrence] = useState('none')
  const [duration, setDuration] = useState(30)
  const [platform, setPlatform] = useState<'google_meet' | 'zoom'>('google_meet')

  // Step 2: Time Slots
  const [busySlots, setBusySlots] = useState<{ start: string, end: string, title?: string }[]>([])
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null)
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [hoverSlot, setHoverSlot] = useState<string | null>(null)

  // Step 3: Details
  const [title, setTitle] = useState('Executive Sync')
  const [description, setDescription] = useState('')
  const [attendees, setAttendees] = useState<string[]>([])
  const [newGuest, setNewGuest] = useState('')

  const [showSuccess, setShowSuccess] = useState(false)

  const fetchSlots = async () => {
    setLoadingSlots(true)
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
      const emails = attendees.join(',')
      const res = await fetch(`/api/slots?date=${date}&tz=${tz}&minMinutes=${duration}&attendees=${emails}`)
      const data = await res.json()
      setBusySlots(data.busySlots || [])
    } catch (e) {
      console.error(e)
    }
    setLoadingSlots(false)
  }

  useEffect(() => {
    fetchSlots()
  }, [date, duration, attendees.length])

  const handleTimelineInteraction = (e: React.MouseEvent<HTMLDivElement>, isClick: boolean) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const y = e.clientY - rect.top
    const hoursFromStart = y / 50
    const clickedHour = 6 + hoursFromStart
    
    // Snap to 15 min increments
    const totalMinutes = Math.round(clickedHour * 60 / 15) * 15
    const snappedHours = Math.floor(totalMinutes / 60)
    const snappedMinutes = totalMinutes % 60
    
    const start = new Date(date)
    start.setHours(snappedHours, snappedMinutes, 0, 0)
    const end = new Date(start.getTime() + duration * 60000)
    
    const hasCollision = busySlots.some(bs => {
      const bsStart = new Date(bs.start).getTime()
      const bsEnd = new Date(bs.end).getTime()
      return start.getTime() < bsEnd && end.getTime() > bsStart
    })
    
    if (!hasCollision) {
      if (isClick) setSelectedSlot(start.toISOString())
      else setHoverSlot(start.toISOString())
    } else {
      if (!isClick) setHoverSlot(null)
    }
  }

  const getPosition = (isoStr: string) => {
    const d = new Date(isoStr)
    const hours = d.getHours() + d.getMinutes() / 60
    const startHour = 6
    return Math.max(0, (hours - startHour) * 50) 
  }

  const getHeight = (start: string, end: string) => {
    const s = new Date(start).getTime()
    const e = new Date(end).getTime()
    return ((e - s) / 3600000) * 50
  }

  const invitePreview = `Hi,\n\nYou have been invited to: ${title}.\n\nWhen: ${selectedSlot ? new Date(selectedSlot).toLocaleString('en-US', { weekday: 'long', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : 'Pending'}\nDuration: ${duration} minutes\nPlatform: ${platform === 'zoom' ? 'Zoom' : 'Google Meet'}\n\nAgenda:\n${description || 'Executive sync and alignment.'}\n\nLooking forward to it!`

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20
    }}>
      <div className="animate-scale-in" style={{
        width: '100%', maxWidth: 900, height: 650,
        background: 'linear-gradient(135deg, rgba(30,27,75,0.9) 0%, rgba(15,12,41,0.95) 100%)',
        borderRadius: 32, border: '1px solid rgba(255,255,255,0.1)',
        overflow: 'hidden', display: 'flex', flexDirection: 'column',
        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5), 0 0 40px rgba(99,102,241,0.2)'
      }}>
        
        {/* Header / Progress */}
        <div style={{ padding: '24px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--brand)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🧙‍♂️</div>
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>Executive Meeting Wizard</h2>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', margin: 0 }}>AURA System Alignment</p>
            </div>
          </div>
          <button onClick={onCancel} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: '#fff', width: 32, height: 32, borderRadius: 16, cursor: 'pointer' }}>✕</button>
        </div>

        {/* Progress Bar */}
        <div style={{ height: 4, width: '100%', background: 'rgba(255,255,255,0.05)' }}>
          <div style={{ height: '100%', width: `${(step / 4) * 100}%`, background: 'var(--brand)', transition: 'width 0.4s cubic-bezier(0.4, 0, 0.2, 1)', boxShadow: '0 0 10px var(--brand)' }} />
        </div>

        {/* Body */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          {/* Side A: Controls */}
          <div style={{ width: 300, borderRight: '1px solid rgba(255,255,255,0.05)', padding: 32, display: 'flex', flexDirection: 'column', gap: 24, background: 'rgba(255,255,255,0.02)' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: 8, display: 'block' }}>Meeting Date</label>
                <input type="date" value={date} onChange={e => setDate(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: 12, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', colorScheme: 'dark' }} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: 8, display: 'block' }}>Target Duration</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {[15, 30, 60, 90].map(d => (
                    <button key={d} onClick={() => setDuration(d)} style={{ padding: '8px', borderRadius: 8, background: duration === d ? 'var(--brand)' : 'rgba(255,255,255,0.05)', border: 'none', color: '#fff', fontSize: 12, cursor: 'pointer', transition: 'all 0.2s' }}>
                      {d >= 60 ? `${d/60}h` : `${d}m`}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: 8, display: 'block' }}>Platform</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => setPlatform('google_meet')} style={{ flex: 1, padding: '10px', borderRadius: 8, background: platform === 'google_meet' ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.05)', border: platform === 'google_meet' ? '1px solid #10b981' : 'none', color: '#fff', fontSize: 12, cursor: 'pointer' }}>Meet</button>
                  <button onClick={() => setPlatform('zoom')} style={{ flex: 1, padding: '10px', borderRadius: 8, background: platform === 'zoom' ? 'rgba(59,130,246,0.2)' : 'rgba(255,255,255,0.05)', border: platform === 'zoom' ? '1px solid #3b82f6' : 'none', color: '#fff', fontSize: 12, cursor: 'pointer' }}>Zoom</button>
                </div>
              </div>
            </div>

            <div style={{ marginTop: 'auto', padding: 20, borderRadius: 20, background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)' }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#fff', marginBottom: 4 }}>Current Selection</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>
                {selectedSlot ? (
                  `${new Date(selectedSlot).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} – ${new Date(new Date(selectedSlot).getTime() + duration * 60000).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`
                ) : (
                  'Click on the timeline →'
                )}
              </div>
            </div>
          </div>

          {/* Side B: Workspace */}
          <div style={{ flex: 1, padding: 32, overflowY: 'auto', position: 'relative' }}>
            {step === 1 && (
              <div style={{ height: '100%', position: 'relative', background: 'rgba(0,0,0,0.3)', borderRadius: 24, border: '1px solid rgba(255,255,255,0.05)', overflowY: 'auto' }}>
                {loadingSlots ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'rgba(255,255,255,0.4)' }}>Optimizing calendar availability...</div>
                ) : (
                  <div 
                    onClick={e => handleTimelineInteraction(e, true)}
                    onMouseMove={e => handleTimelineInteraction(e, false)}
                    onMouseLeave={() => setHoverSlot(null)}
                    style={{ position: 'relative', height: 800, width: '100%', cursor: 'crosshair' }}
                  >
                    {/* Hour Grid */}
                    {Array.from({ length: 17 }).map((_, i) => {
                      const h = i + 6
                      const label = h === 12 ? '12 PM' : h < 12 ? `${h} AM` : `${h - 12} PM`
                      return (
                        <div key={i} style={{ position: 'absolute', top: i * 50, left: 0, right: 0, borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', gap: 12, padding: '0 16px' }}>
                          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', width: 40, marginTop: -8 }}>{label}</span>
                        </div>
                      )
                    })}

                    {/* Busy Slots */}
                    {busySlots.map((bs, i) => (
                      <div key={i} style={{
                        position: 'absolute', top: getPosition(bs.start), height: getHeight(bs.start, bs.end),
                        left: 70, right: 20, background: 'rgba(255,255,255,0.05)', borderLeft: '4px solid #475569',
                        borderRadius: '0 8px 8px 0', zIndex: 1, pointerEvents: 'none',
                        display: 'flex', alignItems: 'center', padding: '0 12px', fontSize: 11, color: 'rgba(255,255,255,0.6)',
                        overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis'
                      }} title={bs.title}>{bs.title || 'Busy'}</div>
                    ))}

                    {/* Hover Preview */}
                    {hoverSlot && !selectedSlot && (
                      <div style={{
                        position: 'absolute', top: getPosition(hoverSlot), height: (duration / 60) * 50,
                        left: 70, right: 20, 
                        background: busySlots.some(bs => {
                          const s = new Date(hoverSlot).getTime()
                          const e = s + duration * 60000
                          return s < new Date(bs.end).getTime() && e > new Date(bs.start).getTime()
                        }) ? 'rgba(239, 68, 68, 0.3)' : 'rgba(99, 102, 241, 0.2)',
                        border: busySlots.some(bs => {
                          const s = new Date(hoverSlot).getTime()
                          const e = s + duration * 60000
                          return s < new Date(bs.end).getTime() && e > new Date(bs.start).getTime()
                        }) ? '2px dashed #ef4444' : '2px dashed rgba(99, 102, 241, 0.4)',
                        borderRadius: 12, zIndex: 5, pointerEvents: 'none'
                      }} />
                    )}

                    {/* Selection */}
                    {selectedSlot && (
                      <div className="animate-scale-in" style={{
                        position: 'absolute', top: getPosition(selectedSlot), height: (duration / 60) * 50,
                        left: 70, right: 20, background: 'var(--brand)', boxShadow: '0 0 30px rgba(99,102,241,0.4)',
                        borderRadius: 12, zIndex: 10, pointerEvents: 'none',
                        display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 20px'
                      }}>
                        <div style={{ fontWeight: 800, color: '#fff' }}>New Meeting</div>
                        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.9)', fontWeight: 600 }}>
                          {new Date(selectedSlot).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} – {new Date(new Date(selectedSlot).getTime() + duration * 60000).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {step === 2 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>Who's attending?</h3>
                  <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginBottom: 20 }}>We'll send them a calendar invite automatically.</p>
                  
                  <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                    <input 
                      placeholder="name@example.com" value={newGuest} onChange={e => setNewGuest(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          if (newGuest.includes('@')) {
                            setAttendees([...attendees, newGuest])
                            setNewGuest('')
                          }
                        }
                      }}
                      style={{ flex: 1, padding: '14px 20px', borderRadius: 16, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
                    />
                    <button onClick={() => { if(newGuest.includes('@')) { setAttendees([...attendees, newGuest]); setNewGuest('') } }} style={{ padding: '0 24px', borderRadius: 16, background: 'var(--brand)', border: 'none', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>Add</button>
                  </div>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                    {attendees.map(a => (
                      <div key={a} style={{ padding: '8px 16px', borderRadius: 12, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                        {a} <span onClick={() => setAttendees(attendees.filter(x => x !== a))} style={{ cursor: 'pointer', opacity: 0.5 }}>✕</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>Meeting Details</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <input placeholder="Title" value={title} onChange={e => setTitle(e.target.value)} style={{ width: '100%', padding: '14px 20px', borderRadius: 16, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontWeight: 600 }} />
                    <textarea placeholder="Agenda..." value={description} onChange={e => setDescription(e.target.value)} rows={4} style={{ width: '100%', padding: '14px 20px', borderRadius: 16, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: 13 }} />
                  </div>
                </div>
              </div>
            )}

            {step === 3 && (
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>Review Email Invite</h3>
                <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginBottom: 20 }}>This is exactly what your guests will receive.</p>
                
                <div style={{ padding: 24, borderRadius: 24, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', whiteSpace: 'pre-wrap', fontSize: 13, lineHeight: 1.6, color: 'rgba(255,255,255,0.8)', fontFamily: 'monospace' }}>
                  {invitePreview}
                </div>
              </div>
            )}

            {step === 4 && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', textAlign: 'center' }}>
                <div style={{ width: 80, height: 80, borderRadius: 40, background: 'rgba(16,185,129,0.1)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, marginBottom: 24 }}>✨</div>
                <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 12 }}>Ready to finalize?</h2>
                <p style={{ maxWidth: 400, color: 'rgba(255,255,255,0.5)', marginBottom: 32 }}>Your meeting is set for {selectedSlot ? new Date(selectedSlot).toLocaleString() : ''}. We'll create the links and send invitations immediately.</p>
                
                <div style={{ width: '100%', maxWidth: 400, padding: 20, borderRadius: 24, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ display: 'flex', gap: 12 }}><span>📅</span> <span>{selectedSlot ? new Date(selectedSlot).toDateString() : ''}</span></div>
                  <div style={{ display: 'flex', gap: 12 }}><span>👥</span> <span>{attendees.length} Guests</span></div>
                  <div style={{ display: 'flex', gap: 12 }}><span>🎥</span> <span>{platform === 'zoom' ? 'Zoom' : 'Google Meet'}</span></div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '24px 32px', display: 'flex', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.05)', background: 'rgba(0,0,0,0.1)' }}>
          <button onClick={() => step === 1 ? onCancel() : setStep(step - 1)} style={{ padding: '12px 24px', borderRadius: 14, background: 'rgba(255,255,255,0.05)', border: 'none', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>
            {step === 1 ? 'Cancel' : 'Back'}
          </button>
          
          <button 
            disabled={step === 1 && !selectedSlot}
            onClick={() => {
              if (step < 4) {
                setStep(step + 1)
              } else {
                setShowSuccess(true)
                setTimeout(() => {
                  onComplete({ title, description, attendees, platform, startTime: selectedSlot, recurrence, duration })
                }, 1500)
              }
            }} 
            style={{ padding: '12px 32px', borderRadius: 14, background: (step === 1 && !selectedSlot) ? 'rgba(255,255,255,0.05)' : 'var(--brand)', border: 'none', color: '#fff', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 4px 12px rgba(99,102,241,0.3)' }}
          >
            {step === 4 ? 'Confirm & Send Invites' : 'Continue'}
          </button>
        </div>

        {showSuccess && (
          <div style={{
            position: 'absolute', inset: 0, zIndex: 100,
            background: 'var(--bg)', display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', textAlign: 'center',
            animation: 'fadeIn 0.5s ease-out'
          }}>
            <div className="animate-scale-in" style={{ fontSize: 64, marginBottom: 24 }}>✅</div>
            <h2 style={{ fontSize: 32, fontWeight: 800, marginBottom: 12, background: 'linear-gradient(to right, #fff, var(--brand-light))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Meeting Confirmed!</h2>
            <p style={{ color: 'rgba(255,255,255,0.6)', maxWidth: 300, lineHeight: 1.6 }}>Invites sent to {attendees.length} guests. Your calendar has been updated.</p>
            <div style={{ marginTop: 40, padding: '12px 24px', borderRadius: 12, background: 'rgba(255,255,255,0.05)', fontSize: 13, border: '1px solid rgba(255,255,255,0.1)' }}>
              Preparing your dashboard...
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
