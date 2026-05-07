'use client'

import { useState, useEffect } from 'react'
import type { AgentAction } from '@/types'
import { IconCalendar, IconRefresh, IconUsers, IconPencil } from '@/components/Icons'

interface DraftEventCardProps {
  action: AgentAction
  onConfirm: (updatedTitle: string, updatedDescription: string, updatedAttendees: string[]) => void
  onCancel: () => void
  onShuffle?: () => void
}

export default function DraftEventCard({ action, onConfirm, onCancel, onShuffle }: DraftEventCardProps) {
  const [title, setTitle] = useState(action.title || 'Untitled Event')
  const [description, setDescription] = useState(action.agenda?.join('\n') || '')
  const [attendees, setAttendees] = useState<string[]>(action.attendees || [])
  const [newGuest, setNewGuest] = useState('')
  const [suggestedContacts, setSuggestedContacts] = useState<{name: string, email: string}[]>([])
  
  const date = action.startTime ? new Date(action.startTime) : new Date()
  const dateStr = date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
  const timeStr = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
  
  const isMeeting = action.intent === 'draft_meeting' || !!action.platform

  useEffect(() => {
    // Load top 3 contacts for quick suggestions
    fetch('/api/contacts').then(res => res.json()).then(data => {
      setSuggestedContacts(data.contacts?.slice(0, 3) || [])
    }).catch(() => {})
  }, [])

  const addGuest = (email: string) => {
    if (email.includes('@') && !attendees.includes(email)) {
      setAttendees([...attendees, email])
      setNewGuest('')
    }
  }

  // Mini-Timeline Logic
  const renderTimeline = () => {
    if (!action.busySlots) return null
    const startHour = date.getHours()
    const hours = [startHour - 1, startHour, startHour + 1]
    
    return (
      <div style={{ marginTop: 8, padding: '8px 12px', background: 'rgba(0,0,0,0.2)', borderRadius: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: 'var(--text-subtle)', marginBottom: 4 }}>
          {hours.map(h => <span key={h}>{h > 12 ? h - 12 : h === 0 ? 12 : h} {h >= 12 ? 'PM' : 'AM'}</span>)}
        </div>
        <div style={{ height: 6, width: '100%', background: 'rgba(255,255,255,0.1)', borderRadius: 3, position: 'relative', overflow: 'hidden' }}>
          {/* Busy Blocks */}
          {action.busySlots.map((slot, i) => {
            const s = new Date(slot.start)
            const e = new Date(slot.end)
            if (s.getDate() !== date.getDate()) return null
            
            const startPct = ((s.getHours() + s.getMinutes()/60) - (startHour - 1)) / 3 * 100
            const endPct = ((e.getHours() + e.getMinutes()/60) - (startHour - 1)) / 3 * 100
            return (
              <div key={i} style={{ 
                position: 'absolute', left: `${startPct}%`, width: `${endPct - startPct}%`, 
                height: '100%', background: '#f87171', opacity: 0.5 
              }} />
            )
          })}
          {/* The Drafted Event Block */}
          <div style={{ 
            position: 'absolute', left: '33.33%', width: `${(action.duration || 60) / 180 * 100}%`, 
            height: '100%', background: 'var(--brand)', border: '1px solid #fff', boxSizing: 'border-box'
          }} />
        </div>
        <div style={{ fontSize: 9, color: 'var(--brand-light)', marginTop: 4, textAlign: 'center', fontWeight: 600 }}>
          You have this slot free
        </div>
      </div>
    )
  }

  return (
    <div className="glass" style={{
      marginTop: 12,
      borderRadius: 20,
      overflow: 'hidden',
      border: '1px solid rgba(255,255,255,0.1)',
      background: 'rgba(255,255,255,0.03)',
      maxWidth: 400,
    }}>
      {/* Header */}
      <div style={{
        padding: '16px 20px',
        background: isMeeting ? 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)' : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
        color: '#fff',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.9 }}>
            {isMeeting ? 'Draft Online Meeting' : 'Draft Event'}
          </div>
          {onShuffle && (
            <button 
              onClick={onShuffle}
              style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 20, color: '#fff', fontSize: 10, padding: '2px 10px', cursor: 'pointer' }}
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><IconRefresh size={11} /> Shuffle Time</span>
            </button>
          )}
        </div>
        <input 
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          style={{ 
            width: '100%',
            background: 'rgba(255,255,255,0.1)',
            border: 'none',
            borderRadius: 8,
            padding: '4px 8px',
            fontSize: 18, 
            fontWeight: 800, 
            color: '#fff',
            outline: 'none',
          }}
        />
      </div>

      {/* Details */}
      <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', alignItems: 'center' }}><IconCalendar size={18} color="var(--brand-light)" /></div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{dateStr}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{timeStr} ({action.duration ?? 60} mins)</div>
            {renderTimeline()}
          </div>
        </div>

        {action.platform && (
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center' }}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--brand-light)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7" /><rect x="1" y="5" width="15" height="14" rx="2" ry="2" /></svg></div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>
              {action.platform === 'zoom' ? 'Zoom Meeting' : 'Google Meet'}
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', alignItems: 'center' }}><IconUsers size={18} color="var(--text-muted)" /></div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }}>Attendees</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
              {attendees.map((email, i) => (
                <span key={i} style={{ 
                  fontSize: 11, padding: '2px 8px', borderRadius: 12, 
                  background: 'var(--surface-3)', border: '1px solid var(--border)',
                  color: 'var(--text-subtle)', display: 'flex', alignItems: 'center', gap: 4
                }}>
                  {email}
                  <span 
                    onClick={() => setAttendees(attendees.filter(a => a !== email))}
                    style={{ cursor: 'pointer', opacity: 0.6 }}
                  >✕</span>
                </span>
              ))}
            </div>
            
            {/* Quick Add Bubbles */}
            {suggestedContacts.length > 0 && (
              <div style={{ display: 'flex', gap: 4, marginBottom: 8, flexWrap: 'wrap' }}>
                {suggestedContacts.filter(c => !attendees.includes(c.email)).map(c => (
                  <button 
                    key={c.email}
                    onClick={() => addGuest(c.email)}
                    style={{ fontSize: 10, padding: '2px 8px', borderRadius: 8, background: 'none', border: '1px dashed var(--brand)', color: 'var(--brand-light)', cursor: 'pointer' }}
                  >
                    + {c.name.split(' ')[0]}
                  </button>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', gap: 6 }}>
              <input 
                placeholder="Add guest email..."
                value={newGuest}
                onChange={(e) => setNewGuest(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addGuest(newGuest)}
                style={{
                  flex: 1, padding: '6px 10px', borderRadius: 8, fontSize: 12,
                  background: 'var(--surface-2)', border: '1px solid var(--border)',
                  color: 'var(--text)', outline: 'none'
                }}
              />
              <button 
                onClick={() => addGuest(newGuest)}
                className="btn-ghost" 
                style={{ fontSize: 11, padding: '0 10px', borderRadius: 8 }}
              >Add</button>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', alignItems: 'center' }}><IconPencil size={18} color="var(--text-muted)" /></div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }}>Description / Agenda</div>
            <textarea 
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              style={{
                width: '100%',
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid var(--border)',
                borderRadius: 10,
                padding: '8px 12px',
                fontSize: 13,
                color: 'var(--text-subtle)',
                outline: 'none',
                resize: 'none',
                fontFamily: 'inherit',
              }}
              placeholder="Add details or agenda..."
            />
          </div>
        </div>
      </div>

      {/* Actions */}
      <div style={{ 
        padding: '12px 20px 20px', 
        display: 'flex', gap: 10,
        borderTop: '1px solid rgba(255,255,255,0.05)'
      }}>
        <button 
          onClick={() => onConfirm(title, description, attendees)}
          className="btn-brand" 
          style={{ flex: 1, height: 40, fontSize: 13, borderRadius: 12 }}
        >
          Confirm & Create
        </button>
        <button 
          onClick={onCancel}
          className="btn-ghost" 
          style={{ height: 40, padding: '0 16px', fontSize: 13, borderRadius: 12 }}
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
