'use client'
import type { ScheduleTask } from '@/types'
import { IconFocus, IconLightbulb, IconTarget, IconPencil, IconRefresh, IconX } from '@/components/Icons'
import { ReactNode } from 'react'

interface Props { task: ScheduleTask }

const TYPE_CONFIG: Record<string, { color: string; bg: string; icon: ReactNode; label: string }> = {
  focus:    { color: '#a78bfa', bg: 'rgba(167,139,250,0.08)', icon: <IconFocus size={16} color="#a78bfa" />, label: 'Focus' },
  deep_work:{ color: '#60a5fa', bg: 'rgba(96,165,250,0.08)',  icon: <IconLightbulb size={16} color="#60a5fa" />, label: 'Deep Work' },
  meeting:  { color: '#34d399', bg: 'rgba(52,211,153,0.08)',  icon: <IconTarget size={16} color="#34d399" />, label: 'Meeting' },
  admin:    { color: '#fbbf24', bg: 'rgba(251,191,36,0.08)',  icon: <IconPencil size={16} color="#fbbf24" />, label: 'Admin' },
}

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
      <span style={{ flexShrink: 0, display: 'flex', alignItems: 'center' }}>{cfg.icon}</span>

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

      <div style={{ display: 'flex', gap: 6, flexShrink: 0, alignItems: 'center' }}>
        {(task.meetLink ?? task.zoomLink) && (
          <a
            href={task.meetLink ?? task.zoomLink}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              fontSize: 11, padding: '4px 10px',
              background: 'var(--surface-3)', borderRadius: 6,
              color: 'var(--meeting-color)', textDecoration: 'none',
              border: '1px solid rgba(52,211,153,0.2)',
            }}
          >
            Join
          </a>
        )}
        <button
          title="Reschedule"
          onClick={() => window.dispatchEvent(new CustomEvent('send-chat', { detail: { message: `Reschedule ${task.name}` } }))}
          style={{
            fontSize: 12, padding: '4px 6px', background: 'transparent', border: 'none', cursor: 'pointer',
            opacity: 0.6, transition: 'opacity 0.2s', color: 'var(--text-muted)', display: 'flex', alignItems: 'center',
          }}
          onMouseOver={e => (e.currentTarget.style.opacity = '1')}
          onMouseOut={e => (e.currentTarget.style.opacity = '0.6')}
        >
          <IconRefresh size={14} />
        </button>
        <button
          title="Cancel"
          onClick={() => window.dispatchEvent(new CustomEvent('send-chat', { detail: { message: `Cancel ${task.name}` } }))}
          style={{
            fontSize: 12, padding: '4px 6px', background: 'transparent', border: 'none', cursor: 'pointer',
            opacity: 0.6, transition: 'opacity 0.2s', color: '#ef4444', display: 'flex', alignItems: 'center',
          }}
          onMouseOver={e => (e.currentTarget.style.opacity = '1')}
          onMouseOut={e => (e.currentTarget.style.opacity = '0.6')}
        >
          <IconX size={14} />
        </button>
      </div>
    </div>
  )
}
