'use client'
import { useEffect, useRef, useState, useCallback } from 'react'
import type { ChatMessage, FreeSlot, MeetingResult, Reminder } from '@/types'
import MeetingLinkCard from '@/components/MeetingLinkCard'
import DayPlanCard from '@/components/DayPlanCard'
import ReminderBubble from '@/components/ReminderBubble'

const QUICK_PROMPTS = [
  { label: '☀️ Good morning', text: 'Good morning! What\'s on my plate today?' },
  { label: '📋 Plan my day', text: 'I need to plan my day. I have ' },
  { label: '🔍 Free time', text: 'Find me time for a 1-hour session this week' },
  { label: '💰 Budget', text: 'How much have I spent this month?' },
  { label: '📧 Check inbox', text: 'Check my unread emails' },
  { label: '✉️ Send email', text: 'Send an email to ' },
  { label: '📊 Analyse week', text: 'Analyse how I spent my time this week' },
]

const WELCOME_MSG: ChatMessage = {
  id:        'welcome',
  role:      'assistant',
  content:   'Good day! I\'m ExecutiveVAi, your AI Executive Assistant. Here\'s what I can do:\n\n📅 Schedule meetings, find free slots, plan your day\n💰 Track expenses, check your budget\n📧 Read & send emails\n📊 Analyse your weekly time\n\nJust tell me what you need!',
  timestamp: new Date().toISOString(),
}

export default function ChatPanel() {
  const [messages, setMessages]       = useState<ChatMessage[]>([WELCOME_MSG])
  const [input, setInput]             = useState('')
  const [isTyping, setIsTyping]       = useState(false)
  const [reminders, setReminders]     = useState<Reminder[]>([])
  const [historyLoaded, setHistoryLoaded] = useState(false)
  const bottomRef                     = useRef<HTMLDivElement>(null)

  // ── Load chat history from cloud on mount ─────────────────────────────────
  useEffect(() => {
    fetch('/api/chat/history')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data?.messages?.length) {
          setMessages([WELCOME_MSG, ...data.messages])
        }
        setHistoryLoaded(true)
      })
      .catch(() => setHistoryLoaded(true))
  }, [])

  // ── Save chat history to cloud whenever messages change ───────────────────
  useEffect(() => {
    if (!historyLoaded) return // don't save until initial load is done
    // Save all messages except the static welcome message
    const toSave = messages.filter(m => m.id !== 'welcome')
    if (toSave.length === 0) return
    fetch('/api/chat/history', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: toSave }),
    }).catch(() => { /* silent — don't block chat */ })
  }, [messages, historyLoaded])

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping])

  // Poll for reminders every 60 seconds
  useEffect(() => {
    const poll = async () => {
      try {
        const res  = await fetch('/api/schedule/reminder')
        if (!res.ok) return // silently skip if not authenticated
        const data = await res.json()
        if (data.reminders?.length) {
          setReminders((prev) => [...prev, ...data.reminders])
        }
      } catch { /* ignore */ }
    }
    poll()
    const interval = setInterval(poll, 60000)
    return () => clearInterval(interval)
  }, [])

  const dismissReminder = useCallback((id: string) => {
    setReminders((prev) => prev.filter((r) => r.id !== id))
  }, [])

  const clearHistory = useCallback(async () => {
    setMessages([WELCOME_MSG])
    try {
      await fetch('/api/chat/history', { method: 'DELETE' })
    } catch { /* silent */ }
  }, [])

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim()) return

    const userMsg: ChatMessage = {
      id:        crypto.randomUUID(),
      role:      'user',
      content:   text,
      timestamp: new Date().toISOString(),
    }

    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setIsTyping(true)

    try {
      const history = messages.map((m) => ({ role: m.role, content: m.content }))
      const res  = await fetch('/api/chat', {
        method:  'POST',
        headers: {
          'Content-Type':  'application/json',
          'x-timezone':    Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
        body: JSON.stringify({ message: text, history }),
      })

      const data = await res.json()

      const aiMsg: ChatMessage = {
        id:            crypto.randomUUID(),
        role:          'assistant',
        content:       data.text ?? '',
        timestamp:     new Date().toISOString(),
        action:        data.action,
        meetingResult: data.meetingResult,
        schedule:      data.schedule,
        freeSlots:     data.freeSlots,
      }

      setMessages((prev) => [...prev, aiMsg])
    } catch (err) {
      setMessages((prev) => [...prev, {
        id:        crypto.randomUUID(),
        role:      'assistant',
        content:   '⚠️ Something went wrong. Please try again.',
        timestamp: new Date().toISOString(),
      }])
    } finally {
      setIsTyping(false)
    }
  }, [messages])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' }}>

      {/* Reminder bubbles */}
      <div style={{ position: 'fixed', top: 24, right: 24, zIndex: 100, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {reminders.map((r) => (
          <ReminderBubble key={r.id} reminder={r} onDismiss={dismissReminder} />
        ))}
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {messages.map((msg) => (
          <div key={msg.id} className="animate-fade-up"
               style={{ display: 'flex', flexDirection: 'column', gap: 8,
                        alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>

            {/* Bubble */}
            <div className={msg.role === 'user' ? 'bubble-user' : 'bubble-ai'} style={{ maxWidth: '90%' }}>
              {msg.content}
            </div>

            {/* Meeting link card */}
            {msg.meetingResult && <MeetingLinkCard meeting={msg.meetingResult} />}

            {/* Day plan cards */}
            {msg.schedule && msg.schedule.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%', maxWidth: '100%' }}>
                {msg.schedule.map((task, i) => (
                  <DayPlanCard key={i} task={task} />
                ))}
              </div>
            )}

            {/* Free slot suggestions */}
            {msg.freeSlots && msg.freeSlots.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%', maxWidth: '100%' }}>
                {msg.freeSlots.map((slot, i) => (
                  <button
                    key={i}
                    id={`slot-${i}`}
                    className="glass btn-ghost"
                    onClick={() => sendMessage(`Book ${slot.label} — ${slot.durationMinutes} mins free`)}
                    style={{ textAlign: 'left', padding: '10px 14px', borderRadius: 10, width: '100%' }}
                  >
                    <span style={{ color: 'var(--meeting-color)', fontWeight: 600 }}>
                      {i + 1}.
                    </span>{' '}
                    {slot.label}{' '}
                    <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                      ({slot.durationMinutes} min free)
                    </span>
                  </button>
                ))}
              </div>
            )}

            {/* Email list */}
            {msg.emails && msg.emails.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%', maxWidth: '100%', marginTop: 8 }}>
                {msg.emails.map((email: any, i: number) => (
                  <div key={i} className="glass" style={{ padding: 16, borderRadius: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, flexWrap: 'wrap', gap: 4 }}>
                      <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--text)' }}>{email.from.split('<')[0].trim()}</span>
                      <span style={{ fontSize: 11, color: 'var(--text-subtle)' }}>
                        {new Date(email.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                    <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--brand-light)', marginBottom: 8 }}>
                      {email.subject}
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5 }}>
                      {email.body.substring(0, 150)}...
                    </div>
                    <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <button
                        className="btn-brand"
                        style={{ fontSize: 11, padding: '6px 12px', borderRadius: 6, flex: 1 }}
                        onClick={() => sendMessage(`Draft a professional reply to the email from ${email.from.split('<')[0].trim()} about "${email.subject}". Keep it brief and polite.`)}
                      >
                        ✍️ Draft Reply
                      </button>
                      <button
                        className="btn-ghost"
                        style={{ fontSize: 11, padding: '6px 12px', borderRadius: 6, flex: 1 }}
                        onClick={() => sendMessage(`Schedule a follow-up meeting about "${email.subject}" with ${email.from.split('<')[0].trim()}`)}
                      >
                        📅 Follow-up
                      </button>
                      <button
                        className="btn-ghost"
                        style={{ fontSize: 11, padding: '6px 12px', borderRadius: 6, flex: 1 }}
                        onClick={() => sendMessage(`Summarize the email from ${email.from.split('<')[0].trim()} about "${email.subject}" and tell me if I need to take any action`)}
                      >
                        📝 Summarize
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <span style={{ fontSize: 11, color: 'var(--text-subtle)', marginTop: 2 }}>
              {new Date(msg.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        ))}

        {/* Typing indicator */}
        {isTyping && (
          <div className="bubble-ai animate-fade-up" style={{ alignSelf: 'flex-start', display: 'flex', gap: 5, alignItems: 'center', padding: '14px 18px' }}>
            <div className="typing-dot" />
            <div className="typing-dot" />
            <div className="typing-dot" />
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Quick prompt chips */}
      <div style={{ padding: '0 20px 12px', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {QUICK_PROMPTS.map((p) => (
          <button
            key={p.label}
            id={`quick-${p.label.replace(/\s+/g, '-')}`}
            onClick={() => {
              if (p.text.endsWith(' ')) { setInput(p.text); }
              else { sendMessage(p.text); }
            }}
            style={{
              background: 'var(--surface-2)', border: '1px solid var(--border)',
              borderRadius: 20, padding: '6px 12px', fontSize: 12,
              color: 'var(--text-muted)', cursor: 'pointer',
              transition: 'all 0.15s',
            }}
            onMouseEnter={(e) => {
              (e.target as HTMLElement).style.borderColor = 'var(--brand-light)'
              ;(e.target as HTMLElement).style.color = 'var(--text)'
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLElement).style.borderColor = 'var(--border)'
              ;(e.target as HTMLElement).style.color = 'var(--text-muted)'
            }}
          >
            {p.label}
          </button>
        ))}
        {messages.length > 1 && (
          <button
            id="btn-clear-history"
            onClick={clearHistory}
            style={{
              background: 'transparent', border: '1px solid rgba(248,113,113,0.3)',
              borderRadius: 20, padding: '6px 12px', fontSize: 12,
              color: 'var(--danger)', cursor: 'pointer',
              transition: 'all 0.15s',
            }}
            onMouseEnter={(e) => {
              (e.target as HTMLElement).style.borderColor = 'var(--danger)'
              ;(e.target as HTMLElement).style.background = 'rgba(248,113,113,0.08)'
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLElement).style.borderColor = 'rgba(248,113,113,0.3)'
              ;(e.target as HTMLElement).style.background = 'transparent'
            }}
          >
            🗑️ Clear History
          </button>
        )}
      </div>

      {/* Input bar */}
      <div style={{ padding: '0 20px 20px' }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end',
                      background: 'var(--surface-2)', border: '1px solid var(--border)',
                      borderRadius: 16, padding: '8px 8px 8px 16px',
                      transition: 'border-color 0.2s' }}
             onFocus={() => {}} >
          <textarea
            id="chat-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask ExecutiveVAi anything… e.g. 'Set up a Zoom call tomorrow at 3pm'"
            rows={1}
            style={{
              flex: 1, background: 'transparent', border: 'none', outline: 'none',
              color: 'var(--text)', fontSize: 14, resize: 'none',
              fontFamily: 'inherit', lineHeight: 1.6, paddingTop: 6,
              maxHeight: 120, overflowY: 'auto',
            }}
          />
          <button
            id="btn-send"
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || isTyping}
            style={{
              width: 40, height: 40, borderRadius: 12, border: 'none', cursor: 'pointer',
              background: input.trim() && !isTyping
                ? 'linear-gradient(135deg, var(--brand), #4f46e5)'
                : 'var(--surface-3)',
              color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.2s', flexShrink: 0,
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>
        <p style={{ fontSize: 11, color: 'var(--text-subtle)', marginTop: 8, textAlign: 'center' }}>
          Press <kbd style={{ background: 'var(--surface-3)', padding: '1px 5px', borderRadius: 4, fontSize: 10 }}>Enter</kbd> to send · <kbd style={{ background: 'var(--surface-3)', padding: '1px 5px', borderRadius: 4, fontSize: 10 }}>Shift+Enter</kbd> for new line
        </p>
      </div>
    </div>
  )
}
