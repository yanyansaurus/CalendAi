'use client'
import type { ScheduleTask } from '@/types'

interface Props { task: ScheduleTask }

const TYPE_CONFIG = {
  focus:    { color: '#a78bfa', bg: 'rgba(167,139,250,0.08)', icon: '🧘', label: 'Focus' },
  deep_work:{ color: '#60a5fa', bg: 'rgba(96,165,250,0.08)',  icon: '💡', label: 'Deep Work' },
  meeting:  { color: '#34d399', bg: 'rgba(52,211,153,0.08)',  icon: '🎯', label: 'Meeting' },
  admin:    { color: '#fbbf24', bg: 'rgba(251,191,36,0.08)',  icon: '📝', label: 'Admin' },
} as const

const PRIORITY_COLORS: Record<string, string> = {
  high:   '#f87171',
  medium: '#fbbf24',
  low:    '#6b7280',
}

export default function DayPlanCard({ task }: Props) {
  const cfg = TYPE_CONFIG[task.type as keyof typeof TYPE_CONFIG] ?? TYPE_CONFIG.admin
  const hasTime = task.startTime && task.endTime

  const fmt = (iso: string) =>
    new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })

  return (
    <div className="animate-fade-up" style={{
      background: cfg.bg,
      border: `1px solid ${cfg.color}30`,
      borderLeft: `3px solid ${cfg.color}`,
      borderRadius: 10, padding: '10px 14px',
      display: 'flex', alignItems: 'center', gap: 12,
    }}>
      <span style={{ fontSize: 18, flexShrink: 0 }}>{cfg.icon}</span>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <p style={{ fontWeight: 600, fontSize: 13, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {task.name}
          </p>
          <span style={{
            fontSize: 10, fontWeight: 700, letterSpacing: '0.05em',
            color: PRIORITY_COLORS[task.priority],
            background: `${PRIORITY_COLORS[task.priority]}20`,
            padding: '2px 6px', borderRadius: 4, flexShrink: 0,
          }}>
            {task.priority.toUpperCase()}
          </span>
        </div>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
          {hasTime ? `${fmt(task.startTime!)} – ${fmt(task.endTime!)}` : `${task.estimatedMinutes} min`}
          {' · '}{cfg.label}
        </p>
      </div>

      {(task.meetLink ?? task.zoomLink) && (
        <a
          href={task.meetLink ?? task.zoomLink}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            flexShrink: 0, fontSize: 11, padding: '4px 10px',
            background: 'var(--surface-3)', borderRadius: 6,
            color: 'var(--meeting-color)', textDecoration: 'none',
            border: '1px solid rgba(52,211,153,0.2)',
          }}
        >
          Join
        </a>
      )}
    </div>
  )
}
