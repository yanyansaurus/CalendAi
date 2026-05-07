'use client'
import { useEffect, useState } from 'react'
import { 
  IconMail, IconClock, IconLightbulb, IconRefresh, 
  IconCheckCircle, IconXCircle, IconChevronRight, IconChevronDown 
} from '@/components/Icons'

interface ActionItem {
  from: string
  emailAddress?: string
  subject: string
  summary: string
  suggestedAction: string
  priority: string
  timeEstimate: string
}

interface LowPriorityItem {
  from: string
  subject: string
  reason: string
}

interface Category {
  name: string
  count: number
  icon: string
}

interface EmailSummary {
  overview: string
  totalEmails: number
  categories: Category[]
  actionItems: ActionItem[]
  lowPriority: LowPriorityItem[]
}

const PRIORITY_COLORS: Record<string, string> = {
  high: '#f87171',
  medium: '#fbbf24',
  low: '#34d399',
}

export default function EmailSummaryPanel() {
  const [summary, setSummary] = useState<EmailSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showLowPriority, setShowLowPriority] = useState(false)

  const loadSummary = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/emails/summary', {
        headers: { 'x-timezone': localStorage.getItem('executive_vai_timezone') || Intl.DateTimeFormat().resolvedOptions().timeZone }
      })
      if (!res.ok) throw new Error('Failed to load email summary')
      const data = await res.json()
      setSummary(data.summary)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => { loadSummary() }, [])

  if (loading && !summary) {
    return (
      <div style={{ padding: 40, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
        <div style={{ display: 'flex', gap: 6 }}>
          <div className="typing-dot" style={{ width: 10, height: 10 }} />
          <div className="typing-dot" style={{ width: 10, height: 10 }} />
          <div className="typing-dot" style={{ width: 10, height: 10 }} />
        </div>
        <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Scanning your inbox…</p>
      </div>
    )
  }

  if (error && !summary) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <p style={{ color: 'var(--danger)', marginBottom: 16 }}>{error}</p>
        <button className="btn-brand" onClick={() => loadSummary()}>Retry</button>
      </div>
    )
  }

  if (!summary) return null

  return (
    <div style={{ overflowY: 'auto', height: '100%' }} className="container-padding">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 10 }}>
            <IconMail size={24} color="var(--brand)" /> Email Summary
          </h2>
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>{summary.overview}</p>
        </div>
        <button
          onClick={() => loadSummary(true)}
          disabled={refreshing}
          className="btn-ghost"
          style={{ fontSize: 16, padding: '6px 10px', borderRadius: 8, opacity: refreshing ? 0.5 : 1 }}
          title="Refresh"
        >
          {refreshing ? <IconRefresh size={16} /> : <IconRefresh size={16} />}
        </button>
      </div>

      {/* Stats Row */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 24 }}>
        <div className="glass" style={{
          padding: '12px 20px', borderRadius: 12, textAlign: 'center', minWidth: 80,
        }}>
          <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--brand-light)' }}>{summary.totalEmails}</div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600 }}>UNREAD</div>
        </div>
        {summary.categories?.map((cat, i) => (
          <div key={i} className="glass" style={{
            padding: '12px 16px', borderRadius: 12, textAlign: 'center', minWidth: 70,
          }}>
            <div style={{ fontSize: 18, marginBottom: 2 }}>{cat.icon}</div>
            <div style={{ fontSize: 16, fontWeight: 700 }}>{cat.count}</div>
            <div style={{ fontSize: 9, color: 'var(--text-subtle)', fontWeight: 600 }}>{cat.name}</div>
          </div>
        ))}
      </div>

      {/* Action Items */}
      {summary.actionItems?.length > 0 && (
        <section style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <span style={{ display: 'flex', alignItems: 'center' }}><IconLightbulb size={16} color="var(--brand-light)" /></span>
            <h3 style={{ fontSize: 15, fontWeight: 700 }}>Needs Your Attention</h3>
            <span style={{ fontSize: 11, color: 'var(--text-subtle)' }}>({summary.actionItems.length})</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {summary.actionItems.map((item, i) => (
              <div key={i} className="glass" style={{
                padding: 16, borderRadius: 12,
                borderLeft: `3px solid ${PRIORITY_COLORS[item.priority] ?? '#94a3b8'}`,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, flexWrap: 'wrap', gap: 4 }}>
                  <span style={{ fontSize: 13, fontWeight: 700 }}>{item.from}</span>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <span style={{ fontSize: 10, color: 'var(--text-subtle)', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <IconClock size={10} /> {item.timeEstimate}
                    </span>
                    <span style={{
                      fontSize: 9, padding: '2px 8px', borderRadius: 10, fontWeight: 700, textTransform: 'uppercase',
                      background: `${PRIORITY_COLORS[item.priority] ?? '#94a3b8'}20`,
                      color: PRIORITY_COLORS[item.priority] ?? '#94a3b8',
                    }}>{item.priority}</span>
                  </div>
                </div>
                <p style={{ fontSize: 12, color: 'var(--brand-light)', fontWeight: 600, marginBottom: 4 }}>{item.subject}</p>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: 6 }}>{item.summary}</p>
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  fontSize: 11, color: 'var(--brand-light)', fontWeight: 600,
                  background: 'rgba(99,102,241,0.1)', padding: '4px 10px', borderRadius: 8,
                  marginBottom: 10,
                }}>
                  <IconLightbulb size={12} /> {item.suggestedAction}
                </div>
                {/* Action Buttons */}
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button
                    className="btn-brand"
                    style={{ fontSize: 11, padding: '6px 14px', borderRadius: 8, flex: 1 }}
                    onClick={() => {
                      // Switch to chat tab
                      window.dispatchEvent(new CustomEvent('switch-tab', { detail: { tab: 'chat' } }))
                      // Tell chat to draft the email, including the email summary so the AI can extract meeting details
                      window.dispatchEvent(new CustomEvent('send-chat', { 
                        detail: { message: `Use the draft_email intent to draft a professional reply to ${item.emailAddress || item.from} about "${item.subject}". The suggested action is: ${item.suggestedAction}. The email summary says: "${item.summary}". If this email mentions a meeting time, extract it into meetingDetails. DO NOT send it, just draft it.` } 
                      }))
                      // Remove from list
                      setSummary(prev => prev ? {
                        ...prev,
                        actionItems: prev.actionItems.filter((_, idx) => idx !== i),
                      } : prev)
                    }}
                  >
                    Accept & Draft Reply
                  </button>
                  <button
                    className="btn-ghost"
                    style={{ fontSize: 11, padding: '6px 14px', borderRadius: 8 }}
                    onClick={() => {
                      setSummary(prev => prev ? {
                        ...prev,
                        actionItems: prev.actionItems.filter((_, idx) => idx !== i),
                        lowPriority: [...(prev.lowPriority ?? []), { from: item.from, subject: item.subject, reason: 'Dismissed' }],
                      } : prev)
                    }}
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Low Priority */}
      {summary.lowPriority?.length > 0 && (
        <section style={{ marginBottom: 28 }}>
          <button
            onClick={() => setShowLowPriority(!showLowPriority)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer', padding: 0,
              display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, width: '100%',
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center' }}><IconMail size={16} color="var(--text-muted)" /></span>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>Can Wait</h3>
            <span style={{ fontSize: 11, color: 'var(--text-subtle)' }}>({summary.lowPriority.length})</span>
            <span style={{ fontSize: 12, color: 'var(--text-subtle)', marginLeft: 'auto' }}>
              {showLowPriority ? <IconChevronDown size={14} /> : <IconChevronRight size={14} />}
            </span>
          </button>
          {showLowPriority && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {summary.lowPriority.map((item, i) => (
                <div key={i} className="glass" style={{
                  padding: 12, borderRadius: 10, display: 'flex', alignItems: 'center', gap: 12, opacity: 0.7,
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 12, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.from}
                    </p>
                    <p style={{ fontSize: 11, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.subject}
                    </p>
                  </div>
                  <span style={{ fontSize: 10, color: 'var(--text-subtle)', whiteSpace: 'nowrap' }}>{item.reason}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  )
}
