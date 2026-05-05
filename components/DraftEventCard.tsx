'use client'

import type { AgentAction } from '@/types'

interface DraftEventCardProps {
  action: AgentAction
  onConfirm: () => void
  onCancel: () => void
}

export default function DraftEventCard({ action, onConfirm, onCancel }: DraftEventCardProps) {
  const date = action.startTime ? new Date(action.startTime) : new Date()
  const dateStr = date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
  const timeStr = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
  
  const isMeeting = action.intent === 'draft_meeting' || !!action.platform

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
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.9, marginBottom: 4 }}>
          {isMeeting ? 'Draft Meeting' : 'Draft Event'}
        </div>
        <h3 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>{action.title || 'Untitled Event'}</h3>
      </div>

      {/* Details */}
      <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <div style={{ fontSize: 20 }}>📅</div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{dateStr}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{timeStr} ({action.duration ?? 60} mins)</div>
          </div>
        </div>

        {action.platform && (
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <div style={{ fontSize: 20 }}>📹</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>
              {action.platform === 'zoom' ? 'Zoom Meeting' : 'Google Meet'}
            </div>
          </div>
        )}

        {action.attendees && action.attendees.length > 0 && (
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <div style={{ fontSize: 20 }}>👥</div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }}>Attendees</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {action.attendees.map((email, i) => (
                  <span key={i} style={{ 
                    fontSize: 11, padding: '2px 8px', borderRadius: 12, 
                    background: 'var(--surface-3)', border: '1px solid var(--border)',
                    color: 'var(--text-subtle)'
                  }}>
                    {email}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {action.agenda && action.agenda.length > 0 && (
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <div style={{ fontSize: 20 }}>📝</div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }}>Agenda</div>
              <ul style={{ margin: 0, paddingLeft: 16, fontSize: 13, color: 'var(--text-subtle)' }}>
                {action.agenda.map((item, i) => <li key={i}>{item}</li>)}
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div style={{ 
        padding: '12px 20px 20px', 
        display: 'flex', gap: 10,
        borderTop: '1px solid rgba(255,255,255,0.05)'
      }}>
        <button 
          onClick={onConfirm}
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
