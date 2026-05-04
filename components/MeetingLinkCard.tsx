'use client'
import type { MeetingResult } from '@/types'
import { useState } from 'react'

interface Props { meeting: MeetingResult }

export default function MeetingLinkCard({ meeting }: Props) {
  const [copied, setCopied] = useState(false)
  const link = meeting.meetLink ?? meeting.zoomLink ?? meeting.joinUrl ?? ''
  const isZoom = meeting.platform === 'zoom'

  const handleCopy = () => {
    navigator.clipboard.writeText(link)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const formattedTime = new Date(meeting.startTime).toLocaleString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })

  return (
    <div className="glass animate-fade-up" style={{
      maxWidth: 400, padding: '16px 18px',
      borderLeft: `3px solid ${isZoom ? '#2d8cff' : 'var(--meeting-color)'}`,
      marginTop: 4,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <span style={{ fontSize: 20 }}>{isZoom ? '📹' : '🎥'}</span>
        <div>
          <p style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)' }}>
            {meeting.title}
          </p>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 1 }}>
            {formattedTime} · {meeting.duration} min · {isZoom ? 'Zoom' : 'Google Meet'}
          </p>
        </div>
      </div>

      {/* Link */}
      <div style={{
        background: 'var(--surface-3)', borderRadius: 8,
        padding: '8px 12px', fontSize: 12,
        color: 'var(--brand-light)', wordBreak: 'break-all',
        marginBottom: 12, fontFamily: 'monospace',
      }}>
        {link}
      </div>

      {/* Agenda Checklist */}
      {meeting.agenda && meeting.agenda.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-subtle)', textTransform: 'uppercase', marginBottom: 8, letterSpacing: '0.03em' }}>
            Suggested Agenda
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {meeting.agenda.map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input type="checkbox" readOnly checked style={{ accentColor: 'var(--brand)', cursor: 'default' }} />
                <span style={{ fontSize: 13, color: 'var(--text)' }}>{item}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          id={`btn-copy-link-${meeting.eventId ?? 'zoom'}`}
          onClick={handleCopy}
          className="btn-brand"
          style={{ flex: 1, justifyContent: 'center', padding: '8px 16px', fontSize: 13 }}
        >
          {copied ? '✅ Copied!' : '📋 Copy Link'}
        </button>
        <a
          href={link}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-ghost"
          style={{ flex: 1, justifyContent: 'center', textDecoration: 'none', padding: '8px 16px', fontSize: 13 }}
        >
          🚀 Join Now
        </a>
      </div>
    </div>
  )
}
