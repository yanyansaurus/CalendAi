'use client'
import type { Reminder } from '@/types'

interface Props {
  reminder: Reminder
  onDismiss: (id: string) => void
}

export default function ReminderBubble({ reminder, onDismiss }: Props) {
  return (
    <div className="reminder-bubble animate-fade-up">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
        <div style={{ display: 'flex', gap: 10 }}>
          <span style={{ fontSize: 20, flexShrink: 0 }}>⏰</span>
          <p style={{ fontSize: 13, lineHeight: 1.5, color: 'var(--text)' }}>
            {reminder.message}
          </p>
        </div>
        <button
          id={`dismiss-reminder-${reminder.id}`}
          onClick={() => onDismiss(reminder.id)}
          style={{
            background: 'transparent', border: 'none',
            color: 'var(--text-muted)', cursor: 'pointer',
            fontSize: 16, flexShrink: 0, lineHeight: 1,
          }}
          aria-label="Dismiss reminder"
        >
          ×
        </button>
      </div>
    </div>
  )
}
