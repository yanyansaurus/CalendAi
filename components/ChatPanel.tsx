'use client'
import { useEffect, useRef, useState, useCallback } from 'react'
import type { ChatMessage, FreeSlot, MeetingResult, Reminder } from '@/types'
import MeetingLinkCard from '@/components/MeetingLinkCard'
import DayPlanCard from '@/components/DayPlanCard'
import ReminderBubble from '@/components/ReminderBubble'
import BudgetChart from '@/components/BudgetChart'
import CommandPalette from '@/components/CommandPalette'

const COMMAND_CATEGORIES = [
  {
    label: '📅 Calendar',
    commands: [
      { icon: '📅', name: 'Create event', text: 'Add an event called ' },
      { icon: '🤝', name: 'Schedule meeting', text: 'Schedule a meeting with ' },
      { icon: '🔍', name: 'Find free time', text: 'Find me time for a 1-hour session this week' },
      { icon: '📋', name: 'Plan my day', text: 'I need to plan my day. I have ' },
      { icon: '☀️', name: 'Daily briefing', text: 'Good morning! What\'s on my plate today?' },
      { icon: '🔄', name: 'Reschedule', text: 'Reschedule my ' },
      { icon: '❌', name: 'Cancel event', text: 'Cancel my ' },
    ],
  },
  {
    label: '📧 Email',
    commands: [
      { icon: '📨', name: 'Check inbox', text: 'Check my unread emails' },
      { icon: '✉️', name: 'Send email', text: 'Send an email to ' },
      { icon: '✍️', name: 'Draft reply', text: 'Draft a reply to ' },
    ],
  },
  {
    label: '💰 Finance',
    commands: [
      { icon: '💸', name: 'Log expense', text: 'Log expense: ' },
      { icon: '📊', name: 'Check budget', text: 'How much have I spent this month?' },
    ],
  },
  {
    label: '📊 Analysis',
    commands: [
      { icon: '⏱️', name: 'Time analysis', text: 'Analyse how I spent my time this week' },
    ],
  },
]

function SuggestionBubble({ suggestion, onDismiss, onAccept }: { suggestion: any, onDismiss: (id: string) => void, onAccept: (s: any) => void }) {
  return (
    <div className="reminder-bubble animate-fade-up" style={{ width: 280, borderLeft: '4px solid var(--brand)', background: 'var(--surface)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--brand-light)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          ✨ Suggested Action
        </span>
        <button onClick={() => onDismiss(suggestion.id)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-subtle)', padding: 0 }}>✕</button>
      </div>
      <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>{suggestion.from}</p>
      <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12, lineHeight: 1.4 }}>{suggestion.question}</p>
      <div style={{ display: 'flex', gap: 8 }}>
        <button 
          className="btn-brand" 
          style={{ flex: 1, padding: '6px', fontSize: 11, borderRadius: 6 }}
          onClick={() => onAccept(suggestion)}
        >
          ✅ Yes, do it
        </button>
        <button 
          className="btn-ghost" 
          style={{ padding: '6px 12px', fontSize: 11, borderRadius: 6 }}
          onClick={() => onDismiss(suggestion.id)}
        >
          Ignore
        </button>
      </div>
    </div>
  )
}



function DraftEmailCard({ action, onSend }: { action: any, onSend: (to: string, subject: string, body: string) => void }) {
  const [body, setBody] = useState(action.emailBody || '')
  const [to, setTo] = useState(action.emailTo || '')
  const [subject, setSubject] = useState(action.emailSubject || '')
  
  useEffect(() => {
    setBody(action.emailBody || '')
    setTo(action.emailTo || '')
    setSubject(action.emailSubject || '')
  }, [action.emailBody])

  const meetingDetails = action.meetingDetails
  const hasMeeting = meetingDetails && (meetingDetails.suggestedTime || meetingDetails.title)

  // Build a scheduling command with the extracted meeting details
  const buildScheduleCommand = () => {
    const parts: string[] = []
    const title = meetingDetails.title || action.emailSubject || 'Meeting'
    const platform = meetingDetails.platform || 'google_meet'
    const duration = meetingDetails.duration || 30
    
    parts.push(`Schedule a ${duration}-minute ${platform === 'zoom' ? 'Zoom' : 'Google Meet'} meeting titled "${title}"`)
    
    if (meetingDetails.suggestedTime) {
      const dt = new Date(meetingDetails.suggestedTime)
      const timeStr = dt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
      const dateStr = dt.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
      parts.push(`on ${dateStr} at ${timeStr}`)
    }
    
    if (meetingDetails.attendees?.length) {
      parts.push(`with ${meetingDetails.attendees.join(', ')}`)
    }
    
    return parts.join(' ')
  }

  // Format the meeting time for display
  const formatMeetingTime = () => {
    if (!meetingDetails?.suggestedTime) return null
    const dt = new Date(meetingDetails.suggestedTime)
    const timeStr = dt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
    const dateStr = dt.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
    return `${dateStr} at ${timeStr}`
  }

  return (
    <div className="glass animate-fade-up" style={{ padding: 16, borderRadius: 12, marginTop: 8, width: '100%', border: '1px solid rgba(99,102,241,0.3)' }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-subtle)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>
        Draft Email
      </div>
      <div style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 12, color: 'var(--text-muted)', width: 50 }}>To: </span>
        <input 
          value={to}
          onChange={e => setTo(e.target.value)}
          style={{ 
            flex: 1, background: 'transparent', border: 'none', borderBottom: '1px solid var(--border)',
            fontSize: 13, fontWeight: 600, color: 'var(--text)', outline: 'none', padding: '4px 0'
          }}
        />
      </div>
      <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 12, color: 'var(--text-muted)', width: 50 }}>Subject: </span>
        <input 
          value={subject}
          onChange={e => setSubject(e.target.value)}
          style={{ 
            flex: 1, background: 'transparent', border: 'none', borderBottom: '1px solid var(--border)',
            fontSize: 13, fontWeight: 600, color: 'var(--text)', outline: 'none', padding: '4px 0'
          }}
        />
      </div>
      <textarea 
        value={body}
        onChange={e => setBody(e.target.value)}
        style={{ 
          background: 'var(--bg)', padding: 12, borderRadius: 8, fontSize: 13, 
          color: 'var(--text)', width: '100%', minHeight: 120, lineHeight: 1.5,
          border: '1px solid var(--border)', resize: 'vertical', fontFamily: 'inherit',
          outline: 'none'
        }}
      />

      {/* Meeting Details Banner — shown when the email is about scheduling */}
      {hasMeeting && (
        <div style={{
          marginTop: 12, padding: '10px 14px', borderRadius: 10,
          background: 'rgba(52, 211, 153, 0.08)', border: '1px solid rgba(52, 211, 153, 0.25)',
          display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
        }}>
          <span style={{ fontSize: 16 }}>📅</span>
          <div style={{ flex: 1, minWidth: 150 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#34d399' }}>
              Meeting Detected
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
              {meetingDetails.title || action.emailSubject}
              {formatMeetingTime() && ` · ${formatMeetingTime()}`}
              {meetingDetails.duration && ` · ${meetingDetails.duration} min`}
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <button
          className="btn-brand"
          style={{ flex: 1, padding: '10px', fontSize: 13, display: 'flex', justifyContent: 'center', gap: 6 }}
          onClick={() => onSend(to, subject, body)}
        >
          🚀 Send Email Now
        </button>
        {hasMeeting && (
          <>
            <button
              className="btn-ghost"
              style={{
                flex: 1, padding: '10px', fontSize: 13, display: 'flex', justifyContent: 'center', gap: 6,
                border: '1px solid rgba(52, 211, 153, 0.3)', color: '#34d399',
              }}
              onClick={() => {
                const cmd = buildScheduleCommand()
                window.dispatchEvent(new CustomEvent('send-chat', { detail: { message: cmd } }))
              }}
            >
              📹 Create Meeting
            </button>
            <button
              className="btn-ghost"
              style={{
                flex: 1, padding: '10px', fontSize: 13, display: 'flex', justifyContent: 'center', gap: 6,
                border: '1px solid rgba(96, 165, 250, 0.3)', color: '#60a5fa',
              }}
              onClick={() => {
                const title = meetingDetails.title || action.emailSubject || 'Event'
                const dt = meetingDetails.suggestedTime ? new Date(meetingDetails.suggestedTime) : new Date()
                const dateStr = dt.toLocaleString()
                const dur = meetingDetails.duration || 30
                window.dispatchEvent(new CustomEvent('send-chat', { 
                  detail: { message: `Add an event to my calendar for "${title}" on ${dateStr} for ${dur} minutes` } 
                }))
              }}
            >
              🗓️ Add to Calendar
            </button>
          </>
        )}
      </div>
    </div>
  )
}

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
  const [isListening, setIsListening] = useState(false)
  const [reminders, setReminders]     = useState<Reminder[]>([])
  const [suggestions, setSuggestions] = useState<any[]>([])
  const [historyLoaded, setHistoryLoaded] = useState(false)
  const [showCommands, setShowCommands] = useState(false)
  const [showPalette, setShowPalette] = useState(false)
  const [imageBase64, setImageBase64] = useState<string | null>(null)
  const [isVoiceMode, setIsVoiceMode] = useState(false)
  const bottomRef                     = useRef<HTMLDivElement>(null)
  const commandRef                    = useRef<HTMLDivElement>(null)
  const fileInputRef                  = useRef<HTMLInputElement>(null)

  // Save suggestions to localStorage
  useEffect(() => {
    if (suggestions.length > 0) {
      localStorage.setItem('executive_vai_suggestions', JSON.stringify(suggestions))
    }
  }, [suggestions])

  // Initial load
  useEffect(() => {
    const saved = localStorage.getItem('executive_vai_chat_history')
    if (saved) setMessages(JSON.parse(saved))
    setHistoryLoaded(true)

    const savedSuggestions = localStorage.getItem('executive_vai_suggestions')
    if (savedSuggestions) setSuggestions(JSON.parse(savedSuggestions))
  }, [])

  // Listen for custom 'send-chat' events from other components (like EmailSummaryPanel)
  useEffect(() => {
    const handleSendChat = (e: any) => {
      if (e.detail?.message) {
        sendMessage(e.detail.message)
      }
    }
    window.addEventListener('send-chat', handleSendChat)
    return () => window.removeEventListener('send-chat', handleSendChat)
  }, [messages]) // Need messages dependency for sendMessage state

  // Request notification permission on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }, [])

  // Close command menu on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (commandRef.current && !commandRef.current.contains(e.target as Node)) {
        setShowCommands(false)
      }
    }
    if (showCommands) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showCommands])

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

  // ── Keyboard Shortcut: Cmd+K ──────────────────────────────────────────
  useEffect(() => {
    const handleGlobalKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setShowPalette(prev => !prev)
      }
    }
    window.addEventListener('keydown', handleGlobalKey)
    return () => window.removeEventListener('keydown', handleGlobalKey)
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
          // Feature: Browser Push Notifications 🔔
          if ('Notification' in window && Notification.permission === 'granted') {
            data.reminders.forEach((r: any) => {
              new Notification('ExecutiveVAi Reminder', { 
                body: r.title,
                icon: 'https://cdn-icons-png.flaticon.com/512/825/825590.png'
              })
            })
          }
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
    if (!text.trim() && !imageBase64) return

    const userMsg: ChatMessage = {
      id:        crypto.randomUUID(),
      role:      'user',
      content:   text || '[Uploaded Image]',
      timestamp: new Date().toISOString(),
    }

    setMessages((prev) => [...prev, userMsg])
    setInput('')
    const currentImg = imageBase64
    setImageBase64(null)
    setIsTyping(true)

    try {
      const history = messages.map((m) => ({ role: m.role, content: m.content }))
      const res  = await fetch('/api/chat', {
        method:  'POST',
        headers: {
          'Content-Type':  'application/json',
          'x-timezone':    Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
        body: JSON.stringify({ message: text, history, imageBase64: currentImg }),
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

      // Text-To-Speech if in voice mode
      if (isVoiceMode && 'speechSynthesis' in window && data.text) {
        const utterance = new SpeechSynthesisUtterance(data.text)
        utterance.rate = 1.05 // slightly faster for a more natural assistant feel
        window.speechSynthesis.speak(utterance)
      }
      setIsVoiceMode(false) // reset voice mode after one response
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (event) => {
      setImageBase64(event.target?.result as string)
    }
    reader.readAsDataURL(file)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' }}>

      {/* Reminder bubbles */}
      <div style={{ position: 'fixed', top: 24, right: 24, zIndex: 100, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {suggestions.map((s) => (
          <SuggestionBubble 
            key={s.id} 
            suggestion={s} 
            onDismiss={(id) => {
              const next = suggestions.filter(x => x.id !== id)
              setSuggestions(next)
              localStorage.setItem('executive_vai_suggestions', JSON.stringify(next))
            }}
            onAccept={(s) => {
              sendMessage(s.command)
              const next = suggestions.filter(x => x.id !== s.id)
              setSuggestions(next)
              localStorage.setItem('executive_vai_suggestions', JSON.stringify(next))
            }}
          />
        ))}
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

            {/* Bubble Container */}
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', maxWidth: '90%', flexDirection: msg.role === 'user' ? 'row-reverse' : 'row' }}>
              {msg.role === 'assistant' && (
                <img src="/logo.png" alt="AI" style={{ width: 28, height: 28, borderRadius: 6, flexShrink: 0, marginBottom: 4 }} />
              )}
              <div className={msg.role === 'user' ? 'bubble-user' : 'bubble-ai'} style={{ flex: 1 }}>
                {msg.content}
              </div>
            </div>

            {/* Meeting link card & Follow-up Actions */}
            {msg.meetingResult && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%' }}>
                <MeetingLinkCard meeting={msg.meetingResult} />
                <div className="animate-fade-up" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', animationDelay: '0.2s' }}>
                  <button 
                    className="btn-ghost" 
                    style={{ fontSize: 12, padding: '6px 12px', background: 'var(--surface-2)', border: '1px solid var(--border)' }}
                    onClick={() => sendMessage(`Draft an email to the attendees sharing this meeting link: ${msg.meetingResult?.joinUrl}`)}
                  >
                    📧 Draft Email with Link
                  </button>
                  <button 
                    className="btn-ghost" 
                    style={{ fontSize: 12, padding: '6px 12px', background: 'var(--surface-2)', border: '1px solid var(--border)' }}
                    onClick={() => sendMessage(`Prepare a meeting agenda for this call`)}
                  >
                    📝 Draft Agenda
                  </button>
                  {msg.meetingResult.platform === 'zoom' && (
                    <button 
                      className="btn-ghost" 
                      style={{ fontSize: 12, padding: '6px 12px', background: 'var(--surface-2)', border: '1px solid var(--border)' }}
                      onClick={() => sendMessage(`Add an event to my calendar for "${msg.meetingResult?.title}" on ${new Date(msg.meetingResult?.startTime || '').toLocaleString()} for ${msg.meetingResult?.duration} minutes`)}
                    >
                      🗓️ Add to Calendar
                    </button>
                  )}
                </div>
              </div>
            )}

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

            {/* Budget Dashboard Chart 📊 */}
            {msg.budgetResult && (
              <BudgetChart data={msg.budgetResult} />
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
                        onClick={() => sendMessage(`Draft a professional reply to the email from ${email.from.split('<')[0].trim()} about "${email.subject}". The email body says: "${email.body.substring(0, 300)}". If this email mentions a meeting time, extract it into meetingDetails. Keep it brief and polite.`)}
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

            {/* Draft Email Card */}
            {msg.action?.intent === 'draft_email' && (
              <DraftEmailCard 
                action={msg.action} 
                onSend={(to, subject, body) => sendMessage(`Send this exact email directly to ${to} with subject "${subject}" and body:\n\n${body}`)} 
              />
            )}

            <span suppressHydrationWarning style={{ fontSize: 11, color: 'var(--text-subtle)', marginTop: 2 }}>
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

      {/* Command Dropdown */}
      {showCommands && (
        <div
          ref={commandRef}
          style={{
            position: 'absolute', bottom: 140, left: 20, right: 20,
            maxHeight: 340, overflowY: 'auto',
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 14, boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
            zIndex: 50, padding: '8px 0',
          }}
        >
          {COMMAND_CATEGORIES.map(cat => (
            <div key={cat.label}>
              <div style={{ padding: '8px 16px 4px', fontSize: 11, fontWeight: 700, color: 'var(--text-subtle)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {cat.label}
              </div>
              {cat.commands.map(cmd => (
                <button
                  key={cmd.name}
                  onClick={() => {
                    if (cmd.text.endsWith(' ')) { setInput(cmd.text) }
                    else { sendMessage(cmd.text) }
                    setShowCommands(false)
                  }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                    padding: '8px 16px', background: 'none', border: 'none',
                    color: 'var(--text)', fontSize: 13, cursor: 'pointer',
                    transition: 'background 0.1s', textAlign: 'left',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(99,102,241,0.1)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                >
                  <span style={{ fontSize: 16 }}>{cmd.icon}</span>
                  <span>{cmd.name}</span>
                </button>
              ))}
            </div>
          ))}
          {messages.length > 1 && (
            <>
              <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />
              <button
                onClick={() => { clearHistory(); setShowCommands(false) }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                  padding: '8px 16px', background: 'none', border: 'none',
                  color: 'var(--danger)', fontSize: 13, cursor: 'pointer',
                  transition: 'background 0.1s', textAlign: 'left',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(248,113,113,0.08)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'none')}
              >
                <span style={{ fontSize: 16 }}>🗑️</span>
                <span>Clear chat history</span>
              </button>
            </>
          )}
        </div>
      )}

      {/* Input bar */}
      <div style={{ padding: '0 20px 20px' }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end',
                      background: 'var(--surface-2)', border: '1px solid var(--border)',
                      borderRadius: 16, padding: '8px 8px 8px 12px',
                      transition: 'border-color 0.2s' }}
             onFocus={() => {}} >
          <button
            onClick={() => setShowCommands(!showCommands)}
            style={{
              width: 36, height: 36, borderRadius: 10, border: 'none', cursor: 'pointer',
              background: showCommands ? 'rgba(99,102,241,0.2)' : 'var(--surface-3)',
              color: showCommands ? 'var(--brand-light)' : 'var(--text-muted)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 16, flexShrink: 0, transition: 'all 0.15s',
            }}
            title="Show commands"
          >
            ⚡
          </button>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {imageBase64 && (
              <div style={{ position: 'relative', width: 60, height: 60 }}>
                <img src={imageBase64} alt="Attached" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 8, border: '1px solid var(--border)' }} />
                <button 
                  onClick={() => setImageBase64(null)} 
                  style={{ position: 'absolute', top: -6, right: -6, background: '#ef4444', color: 'white', borderRadius: '50%', width: 18, height: 18, fontSize: 10, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  ✕
                </button>
              </div>
            )}
            <textarea
              id="chat-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask ExecutiveVAi anything… e.g. 'Set up a Zoom call tomorrow at 3pm'"
              rows={1}
              style={{
                width: '100%', background: 'transparent', border: 'none', outline: 'none',
                color: 'var(--text)', fontSize: 14, resize: 'none',
                fontFamily: 'inherit', lineHeight: 1.6, paddingTop: 6,
                maxHeight: 120, overflowY: 'auto',
              }}
            />
          </div>
          {/* Feature: Image Attachment 📎 */}
          <button
            onClick={() => fileInputRef.current?.click()}
            style={{
              width: 36, height: 36, borderRadius: 10, border: 'none', cursor: 'pointer',
              background: 'transparent', color: 'var(--text-muted)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 18, flexShrink: 0, transition: 'color 0.2s',
            }}
            title="Attach Receipt or Image"
          >
            📎
          </button>
          <input 
            type="file" 
            accept="image/*" 
            ref={fileInputRef} 
            style={{ display: 'none' }} 
            onChange={handleFileChange} 
          />

          {/* Feature: Voice Commands 🎙️ */}
          <button
            onClick={() => {
              const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
              if (!SpeechRecognition) {
                alert("Voice commands are not supported in your browser.")
                return
              }
              const recognition = new SpeechRecognition()
              recognition.lang = 'en-US'
              // Important: use interimResults = false to avoid duplication loops
              recognition.interimResults = false 
              recognition.continuous = false
              
              recognition.onstart = () => setIsListening(true)
              recognition.onresult = (e: any) => {
                // Since we only want the final result of this short utterance, just take the first final transcript
                const text = e.results[0][0].transcript
                setInput(prev => {
                  const prefix = prev.trim()
                  return prefix ? `${prefix} ${text}` : text
                })
              }
              recognition.onerror = () => setIsListening(false)
              recognition.onend = () => setIsListening(false)
              recognition.start()
            }}
            style={{
              width: 40, height: 40, borderRadius: 12, border: 'none', cursor: 'pointer',
              background: isListening ? 'rgba(248,113,113,0.2)' : 'var(--surface-3)',
              color: isListening ? '#f87171' : 'var(--text-muted)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.2s', flexShrink: 0,
            }}
            title="Voice input"
          >
            {isListening ? '🛑' : '🎙️'}
          </button>
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
      {/* Command Palette (Cmd+K) */}
      <CommandPalette 
        isOpen={showPalette} 
        onClose={() => setShowPalette(false)} 
        onSelect={(text) => {
          setInput(text)
          // focus input after a small delay
          setTimeout(() => document.getElementById('chat-input')?.focus(), 50)
        }} 
      />
    </div>
  )
}
