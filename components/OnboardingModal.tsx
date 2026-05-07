'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import confetti from 'canvas-confetti'
import { useTheme } from '@/components/ThemeProvider'
import { useSession } from 'next-auth/react'

const getColor = (id: string) => {
  const colors: Record<string, string> = {
    '1': '#a4bdfc', '2': '#7ae7bf', '3': '#dbadff', '4': '#ff887c', '5': '#fbd75b',
    '6': '#ffb878', '7': '#46d6db', '8': '#e1e1e1', '9': '#5484ed', '10': '#51b886', '11': '#dc2127'
  }
  return colors[id] || 'var(--brand)'
}

interface Activity {
  id: string
  name: string
  startTime: string
  endTime: string
  type: string
  colorId: string
}

interface DailyRoutine {
  date: string
  formattedDate: string
  activities: Activity[]
  wakeTime: string
  sleepTime: string
}

export default function OnboardingModal() {
  const [isOpen, setIsOpen] = useState(false)
  const [step, setStep] = useState(0) // 0: Profession, 1: Scope, 2: Routine Builder, 3: Final Sync
  const [currentDayIndex, setCurrentDayIndex] = useState(0)
  const [syncing, setSyncing] = useState(false)
  const [loadingEvents, setLoadingEvents] = useState(false)
  const [isIncomplete, setIsIncomplete] = useState(true)
  const { theme } = useTheme()
  const { data: session } = useSession()
  
  const [profession, setProfession] = useState('Work')
  const [scope, setScope] = useState('Full Week')
  const [timezone, setTimezone] = useState('Asia/Manila')
  const [meetingPref, setMeetingPref] = useState('Google Meet')

  const [dailyRoutines, setDailyRoutines] = useState<DailyRoutine[]>([])

  useEffect(() => {
    // Check onboarding status using the same user-specific key as HomePanel
    const checkStatus = async () => {
      try {
        // We need to wait for a tick to ensure we have the session if needed, 
        // but for now we'll look for any v11 key as a fallback
        // const keys = Object.keys(localStorage)
        // const hasV11 = keys.some(k => k.startsWith('executive_vai_onboarded_v11_'))
        
        // if (!hasV11) {
        //   setIsOpen(true)
        // }
      } catch (e) {}
    }
    
    checkStatus()
    
    try {
      const detected = Intl.DateTimeFormat().resolvedOptions().timeZone
      if (detected) setTimezone(detected)
    } catch {}

    const handleOpen = () => { setIsOpen(true); setStep(0); }
    window.addEventListener('open-routine-setup', handleOpen)
    return () => window.removeEventListener('open-routine-setup', handleOpen)
  }, [])

  const timeToMin = (t: string) => {
    if (!t) return 0
    const [h, m] = t.split(':').map(Number)
    return h * 60 + m
  }

  const calculateDates = useCallback(() => {
    const now = new Date()
    const userNow = new Date(now.toLocaleString('en-US', { timeZone: timezone }))
    const dates: Date[] = []

    if (scope === 'Today') {
      dates.push(userNow)
    } else if (scope === 'Tomorrow') {
      const d = new Date(userNow); d.setDate(userNow.getDate() + 1)
      dates.push(d)
    } else if (scope === 'Next 3 Days') {
      for (let i = 0; i < 3; i++) {
        const d = new Date(userNow); d.setDate(userNow.getDate() + i)
        dates.push(d)
      }
    } else if (scope === 'Weekend') {
      const day = userNow.getDay()
      const diff = (day === 0 ? -1 : 6 - day)
      const sat = new Date(userNow); sat.setDate(userNow.getDate() + diff)
      const sun = new Date(userNow); sun.setDate(userNow.getDate() + diff + 1)
      dates.push(sat, sun)
    } else {
      const day = userNow.getDay()
      const monday = new Date(userNow); monday.setDate(userNow.getDate() - (day === 0 ? 6 : day - 1))
      const count = (scope === 'Full Week') ? 7 : 5
      for (let i = 0; i < count; i++) {
        const d = new Date(monday); d.setDate(monday.getDate() + i)
        dates.push(d)
      }
    }

    return dates.map(d => ({
      date: `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`,
      formattedDate: d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }),
      activities: [
        { id: '1', name: 'Deep Work', startTime: '09:00', endTime: '12:00', type: 'Work', colorId: '9' },
        { id: '2', name: 'Lunch Break', startTime: '12:00', endTime: '13:00', type: 'Rest', colorId: '10' },
        { id: '3', name: 'Focus Time', startTime: '14:00', endTime: '16:00', type: 'Work', colorId: '7' },
        { id: '4', name: 'Exercise', startTime: '17:00', endTime: '18:00', type: 'Health', colorId: '2' },
        { id: '5', name: 'Email Cleanup', startTime: '18:30', endTime: '19:30', type: 'Admin', colorId: '8' }
      ],
      wakeTime: '07:00',
      sleepTime: '22:30'
    }))
  }, [scope, timezone])

  const startArchitecting = async () => {
    setLoadingEvents(true)
    const routines = calculateDates()
    setDailyRoutines(routines)
    setCurrentDayIndex(0)
    
    try {
      const res = await fetch(`/api/calendar/routine-sync?scope=${scope}&timezone=${timezone}`)
      if (res.ok) {
        const data = await res.json()
        if (data.events && data.events.length > 0) {
          const updated = routines.map((r) => {
            // Filter events that actually belong to this specific date (YYYY-MM-DD)
            const dayEvents = data.events.filter((e: any) => e.date === r.date)
            if (dayEvents.length > 0) {
              return { ...r, activities: dayEvents.sort((a: any, b: any) => timeToMin(a.startTime) - timeToMin(b.startTime)) }
            }
            return r
          })
          setDailyRoutines(updated)
        }
      }
    } catch (e) {} finally {
      setLoadingEvents(false)
      setStep(2)
    }
  }

  const currentRoutine = dailyRoutines[currentDayIndex]

  const updateCurrentDay = (key: keyof DailyRoutine, val: any) => {
    setDailyRoutines(prev => {
      const updated = [...prev]
      updated[currentDayIndex] = { ...updated[currentDayIndex], [key]: val }
      return updated
    })
  }

  const copyDay = (fromIndex: number) => {
    const sourceDay = dailyRoutines[fromIndex]
    setDailyRoutines(prevAll => {
      const updated = [...prevAll]
      updated[currentDayIndex] = { 
        ...updated[currentDayIndex], 
        activities: sourceDay.activities.map(a => ({ ...a, id: `${a.id}_copy_${Date.now()}` })),
        wakeTime: sourceDay.wakeTime,
        sleepTime: sourceDay.sleepTime
      }
      return updated
    })
  }

  const addActivity = (name = '', type = 'Work') => {
    const acts = currentRoutine.activities
    const lastActivity = acts[acts.length - 1]
    let nextStart = currentRoutine.wakeTime
    if (lastActivity) nextStart = lastActivity.endTime
    
    const usedIds = acts.map(a => parseInt(a.colorId))
    let nextColorId = 1
    while ([3, 5, 9, 10].includes(nextColorId) || usedIds.includes(nextColorId)) {
      nextColorId = (nextColorId % 11) + 1
      if (nextColorId === 1 && usedIds.length > 5) break 
    }

    const h = parseInt(nextStart.split(':')[0])
    const m = parseInt(nextStart.split(':')[1])
    const endMin = h * 60 + m + 60
    const nextEnd = `${Math.floor(endMin / 60).toString().padStart(2, '0')}:${(endMin % 60).toString().padStart(2, '0')}`
    
    const newAct = { id: Date.now().toString(), name, startTime: nextStart, endTime: nextEnd, type, colorId: nextColorId.toString() }
    const updated = [...acts, newAct].sort((a, b) => timeToMin(a.startTime) - timeToMin(b.startTime))
    updateCurrentDay('activities', updated)
  }

  const timelineItems = useMemo(() => {
    if (!currentRoutine) return []
    const wakeM = timeToMin(currentRoutine.wakeTime)
    const sleepM = timeToMin(currentRoutine.sleepTime)
    const sortedActivities = [...currentRoutine.activities].sort((a, b) => timeToMin(a.startTime) - timeToMin(b.startTime))

    const items = [
      { id: 'wake', name: 'Wake Up', start: wakeM, end: wakeM + 15, colorId: '5' },
      ...sortedActivities.map(a => ({ ...a, start: timeToMin(a.startTime), end: timeToMin(a.endTime) })),
      { id: 'sleep', name: 'Sleep', start: sleepM, end: 1440, colorId: '3' }
    ].sort((a, b) => a.start - b.start)

    const mapped = items.map((item, i) => {
      // Back-to-back events (End of A == Start of B) are NOT conflicts.
      // A conflict only exists if (StartA < EndB) AND (EndA > StartB).
      const conflicts = items.filter(other => {
        if (other.id === item.id) return false
        // Markers (wake/sleep) don't trigger conflict errors if they overlap with tasks
        if (item.id === 'wake' || item.id === 'sleep' || other.id === 'wake' || other.id === 'sleep') return false
        
        // Check for actual time intersection
        const hasIntersection = item.start < other.end && item.end > other.start
        return hasIntersection
      })
      
      const overlapping = conflicts.length > 0 || (item.end <= item.start && item.id !== 'sleep')
      return { ...item, overlapping }
    })

    const isSparse = mapped.length < 5
    setIsIncomplete(isSparse)
    return mapped
  }, [currentRoutine])

  const hasOverlap = timelineItems.some(item => item.overlapping)

  const handleFinish = async () => {
    setSyncing(true)
    try {
      const safeRoutines = dailyRoutines.map(r => ({
        ...r,
        activities: r.activities.filter(a => a.name && a.startTime && a.endTime)
      }))

      const res = await fetch('/api/calendar/routine-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          routines: safeRoutines.filter(r => r && r.wakeTime), 
          scope, 
          timezone 
        })
      })

      if (res.ok) {
        const data = await res.json()
        confetti({
          particleCount: 150,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#4f46e5', '#6366f1', '#10b981', '#ffffff']
        })
        const onboardedKey = `executive_vai_onboarded_v11_${session?.user?.email}`
        localStorage.setItem(onboardedKey, 'true')
        window.dispatchEvent(new CustomEvent('routine-synced'))
        setIsOpen(false)
      } else {
        const err = await res.json()
        alert(`Sync failed: ${err.error}`)
      }
    } catch (e) {
      alert('Sync failed. Please try again.')
    } finally {
      setSyncing(false)
    }
  }

  if (!isOpen) return null

  const sortedDisplayActivities = currentRoutine ? [...currentRoutine.activities].sort((a, b) => timeToMin(a.startTime) - timeToMin(b.startTime)) : []

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.85)', zIndex: 9999,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      backdropFilter: 'blur(16px)', padding: 16
    }}>
      <div className="animate-fade-up" style={{
        background: 'var(--surface-1)', border: '1px solid var(--border)',
        borderRadius: 32, padding: step === 2 ? '40px' : '48px 40px', width: '100%', 
        maxWidth: step === 2 ? 1000 : 480,
        boxShadow: '0 40px 100px rgba(0,0,0,0.5)',
        position: 'relative', maxHeight: '95vh', overflowY: 'auto'
      }}>
        <button 
          onClick={() => setIsOpen(false)}
          style={{ 
            position: 'absolute', top: 24, right: 24, background: 'var(--surface-3)', 
            border: 'none', color: 'var(--text-subtle)', borderRadius: '50%',
            width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', zIndex: 100, fontSize: 18, fontWeight: 800
          }}
        >
          ✕
        </button>

        {step === 0 && (
          <div className="animate-fade-up">
            <h2 style={{ fontSize: 24, fontWeight: 900, textAlign: 'center', marginBottom: 32 }}>Choose Your Path</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 32 }}>
              {['CEO', 'Work', 'Freelancer', 'Student', 'No Work'].map(p => (
                <button key={p} onClick={() => setProfession(p)} style={{ padding: '20px', borderRadius: 20, background: profession === p ? 'var(--brand-glow)' : 'var(--surface-2)', border: profession === p ? '2px solid var(--brand)' : '2px solid transparent', cursor: 'pointer' }}>
                   <div style={{ fontSize: 12, fontWeight: 800, color: profession === p ? 'var(--brand)' : 'var(--text)' }}>{p}</div>
                </button>
              ))}
            </div>
            <button onClick={() => setStep(1)} className="btn-brand" style={{ width: '100%', padding: 16, borderRadius: 16, fontWeight: 800 }}>Next Step →</button>
          </div>
        )}

        {step === 1 && (
          <div className="animate-fade-up">
            <h2 style={{ fontSize: 24, fontWeight: 900, textAlign: 'center', marginBottom: 12 }}>Planning Horizon</h2>
            <p style={{ fontSize: 13, textAlign: 'center', color: 'var(--text-subtle)', marginBottom: 24 }}>{scope === 'Full Week' ? "Your schedule is looking sharp! You can refine, add, or delete events for today, tomorrow, three days, weekend, weekdays, or your full week anytime." : "Your schedule looks a bit thin. I recommend setting up a planning template (Work, Sleep, Lunch, etc.) to keep your routine consistent. Wanna try?"}</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 32 }}>
              {['Today', 'Tomorrow', 'Next 3 Days', 'Weekend', 'Weekdays', 'Full Week'].map(s => (
                <button key={s} onClick={() => setScope(s)} style={{ padding: '16px 20px', borderRadius: 20, background: scope === s ? 'var(--brand-glow)' : 'var(--surface-2)', border: scope === s ? '1px solid var(--brand)' : '1px solid transparent', textAlign: 'left', cursor: 'pointer' }}>
                  <div style={{ fontWeight: 800, color: scope === s ? 'var(--brand)' : 'var(--text)', fontSize: 13 }}>{s}</div>
                </button>
              ))}
            </div>
            <button disabled={loadingEvents} onClick={startArchitecting} className="btn-brand" style={{ width: '100%', padding: 16, borderRadius: 16, fontWeight: 800 }}>
              {loadingEvents ? '⌛ Fetching Calendar...' : 'Start Building →'}
            </button>
          </div>
        )}

        {step === 2 && currentRoutine && (
          <div className="animate-fade-up" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <h2 style={{ fontSize: 24, fontWeight: 900 }}>Daily Architect</h2>
                <div style={{ padding: '4px 12px', background: 'var(--brand)', color: '#fff', borderRadius: 20, fontSize: 10, fontWeight: 800 }}>DAY {currentDayIndex + 1} OF {dailyRoutines.length}</div>
              </div>
              <p style={{ color: 'var(--brand)', fontWeight: 800, marginBottom: 24, fontSize: 14 }}>📅 {currentRoutine.formattedDate}</p>
              
              {currentDayIndex > 0 && (
                <div style={{ marginBottom: 20 }}>
                  <label style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-subtle)', display: 'block', marginBottom: 8 }}>✨ COPY FROM MEMORY</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {dailyRoutines.slice(0, currentDayIndex).map((r, idx) => (
                      <button 
                        key={idx} 
                        onClick={() => copyDay(idx)}
                        style={{ 
                          padding: '8px 12px', background: 'var(--brand-glow)', border: '1px solid var(--brand)', 
                          borderRadius: 12, color: 'var(--brand)', fontWeight: 800, fontSize: 11, cursor: 'pointer'
                        }}
                      >
                        Day {idx + 1}: {r.formattedDate.split(',')[0].slice(0, 3)}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ padding: 16, background: 'var(--surface-2)', borderRadius: 16, border: '1px solid var(--border)' }}>
                   <label style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-subtle)', display: 'block', marginBottom: 4 }}>WAKE UP</label>
                   <input type="time" value={currentRoutine.wakeTime} onChange={e => updateCurrentDay('wakeTime', e.target.value)} style={{ background: 'transparent', border: 'none', color: 'var(--text)', fontSize: 16, fontWeight: 700 }} />
                </div>

                {sortedDisplayActivities.map((act) => {
                  const isConflicting = timelineItems.find(t => t.id === act.id)?.overlapping
                  return (
                    <div key={act.id} className="animate-fade-up" style={{ 
                      padding: '12px 16px', background: 'var(--surface-2)', borderRadius: 16, borderLeft: `4px solid ${getColor(act.colorId)}`,
                      borderTop: `1px solid ${isConflicting ? '#ef4444' : 'var(--border)'}`,
                      borderRight: `1px solid ${isConflicting ? '#ef4444' : 'var(--border)'}`,
                      borderBottom: `1px solid ${isConflicting ? '#ef4444' : 'var(--border)'}`,
                      position: 'relative', transition: 'all 0.5s ease'
                    }}>
                      <button onClick={() => updateCurrentDay('activities', currentRoutine.activities.filter(a => a.id !== act.id))} style={{ position: 'absolute', top: 8, right: 8, border: 'none', background: 'transparent', cursor: 'pointer', opacity: 0.4 }}>✕</button>
                      <input value={act.name} onChange={e => {
                        const updated = [...currentRoutine.activities]; const i = updated.findIndex(a => a.id === act.id); updated[i].name = e.target.value; updateCurrentDay('activities', updated)
                      }} placeholder="Activity Name" style={{ width: '100%', background: 'transparent', border: 'none', color: 'var(--text)', fontWeight: 700, marginBottom: 8 }} />
                      <div style={{ display: 'flex', gap: 12 }}>
                        <div style={{ flex: 1 }}>
                          <label style={{ fontSize: 9, fontWeight: 800, color: 'var(--text-subtle)', display: 'block' }}>START</label>
                          <input type="time" value={act.startTime} onChange={e => {
                             const updated = [...currentRoutine.activities]; const i = updated.findIndex(a => a.id === act.id); updated[i].startTime = e.target.value; updateCurrentDay('activities', updated)
                          }} onBlur={() => {
                            const sorted = [...currentRoutine.activities].sort((a, b) => timeToMin(a.startTime) - timeToMin(b.startTime))
                            updateCurrentDay('activities', sorted)
                          }} style={{ width: '100%', background: 'transparent', border: 'none', color: 'var(--text)', fontSize: 14, fontWeight: 600 }} />
                        </div>
                        <div style={{ flex: 1 }}>
                          <label style={{ fontSize: 9, fontWeight: 800, color: 'var(--text-subtle)', display: 'block' }}>END</label>
                          <input type="time" value={act.endTime} onChange={e => {
                             const updated = [...currentRoutine.activities]; const i = updated.findIndex(a => a.id === act.id); updated[i].endTime = e.target.value; updateCurrentDay('activities', updated)
                          }} style={{ width: '100%', background: 'transparent', border: 'none', color: 'var(--text)', fontSize: 14, fontWeight: 600 }} />
                        </div>
                      </div>
                    </div>
                  )
                })}

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                  {['Gym', 'Lunch', 'Strategy', 'Deep Work'].map(tag => (
                    <button key={tag} onClick={() => addActivity(tag)} style={{ padding: '6px 12px', borderRadius: 20, background: 'var(--surface-3)', border: '1px solid var(--border)', fontSize: 10, fontWeight: 700, cursor: 'pointer' }}>+ {tag}</button>
                  ))}
                </div>

                <div style={{ padding: 16, background: 'var(--surface-2)', borderRadius: 16, border: '1px solid var(--border)', marginTop: 8 }}>
                   <label style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-subtle)', display: 'block', marginBottom: 4 }}>SLEEP</label>
                   <input type="time" value={currentRoutine.sleepTime} onChange={e => updateCurrentDay('sleepTime', e.target.value)} style={{ background: 'transparent', border: 'none', color: 'var(--text)', fontSize: 16, fontWeight: 700 }} />
                </div>
              </div>

              {hasOverlap && (
                <div style={{ marginTop: 16, padding: 12, background: 'rgba(239,68,68,0.1)', color: '#ef4444', borderRadius: 12, fontSize: 12, fontWeight: 700 }}>
                   ⚠️ Conflict detected on {currentRoutine.formattedDate}.
                </div>
              )}

              <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
                <button onClick={() => currentDayIndex > 0 ? setCurrentDayIndex(currentDayIndex - 1) : setStep(1)} style={{ flex: 1, padding: 14, borderRadius: 14, fontWeight: 700, border: '1px solid var(--border)', background: 'transparent' }}>Back</button>
                <button disabled={hasOverlap || timelineItems.length < 6} onClick={() => currentDayIndex < dailyRoutines.length - 1 ? setCurrentDayIndex(currentDayIndex + 1) : setStep(3)} className="btn-brand" style={{ flex: 2, padding: 14, borderRadius: 14, fontWeight: 800, opacity: (hasOverlap || timelineItems.length < 6) ? 0.5 : 1 }}>
                  {currentDayIndex < dailyRoutines.length - 1 ? 'Next Day →' : 'Review & Sync →'}
                </button>
              </div>
              {timelineItems.length < 6 && (
                <div style={{ marginTop: 12, padding: 12, background: 'rgba(59,130,246,0.1)', color: 'var(--brand)', borderRadius: 12, fontSize: 11, fontWeight: 700 }}>
                   ℹ️ Minimum 6 tasks required ({timelineItems.length}/6)
                </div>
              )}
            </div>

            <div className="glass" style={{ borderRadius: 24, padding: 24, background: 'var(--surface-2)', display: 'flex', flexDirection: 'column' }}>
               <h3 style={{ fontSize: 11, fontWeight: 800, color: 'var(--brand)', marginBottom: 20 }}>MOCK CALENDAR (24H)</h3>
               <div style={{ flex: 1, position: 'relative', borderLeft: '1px solid var(--border)', marginLeft: 40, minHeight: 700 }}>
                  {[0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24].map(h => (
                    <div key={h} style={{ position: 'absolute', top: `${(h / 24) * 100}%`, left: -40, fontSize: 9, color: 'var(--text-subtle)', fontWeight: 700 }}>
                      {h === 0 || h === 24 ? '12 AM' : h > 12 ? `${h - 12} PM` : `${h} ${h === 12 ? 'PM' : 'AM'}`}
                    </div>
                  ))}

                  {timelineItems.map(item => {
                    const startPos = (item.start / 1440) * 100
                    const height = ((item.end - item.start) / 1440) * 100
                    if (height <= 0) return null
                    return (
                      <div key={item.id} style={{
                        position: 'absolute', top: `${startPos}%`, left: 8, right: 8, height: `${Math.max(height, 2)}%`,
                        background: getColor(item.colorId),
                        opacity: item.overlapping ? 0.6 : 1,
                        border: `1px solid ${item.overlapping ? '#ef4444' : 'rgba(255,255,255,0.1)'}`,
                        borderRadius: 8, padding: '4px 8px', overflow: 'hidden', zIndex: item.overlapping ? 10 : 1,
                        boxShadow: item.overlapping ? '0 0 15px rgba(239,68,68,0.3)' : 'none',
                        transition: 'all 0.3s'
                      }}>
                        <div style={{ fontSize: 9, fontWeight: 800, color: '#fff', textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>{item.name}</div>
                      </div>
                    )
                  })}
               </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="animate-fade-up">
            <h2 style={{ fontSize: 24, fontWeight: 900, textAlign: 'center', marginBottom: 32 }}>Final Review</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 32 }}>
               {dailyRoutines.map(r => (
                 <div key={r.date} style={{ padding: '12px 16px', background: 'var(--surface-2)', borderRadius: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontWeight: 700 }}>{r.formattedDate}</div>
                    <div style={{ fontSize: 12, color: 'var(--brand)', fontWeight: 800 }}>{r.activities.length + 2} Tasks</div>
                 </div>
               ))}
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button 
                onClick={() => setStep(2)}
                style={{ flex: 1, padding: 18, borderRadius: 18, fontWeight: 800, border: '1px solid var(--border)', background: 'transparent' }}
              >
                Back to Architect
              </button>
              <button disabled={syncing} onClick={handleFinish} className="btn-brand" style={{ flex: 2, padding: 18, borderRadius: 18, fontWeight: 800, opacity: syncing ? 0.7 : 1 }}>
                {syncing ? '⌛ Syncing...' : 'Push to Google Calendar →'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
