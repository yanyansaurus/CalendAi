'use client'
import { useEffect, useRef, useState, useCallback } from 'react'
import type { ChatMessage, FreeSlot, MeetingResult, Reminder } from '@/types'
import MeetingLinkCard from '@/components/MeetingLinkCard'
import DayPlanCard from '@/components/DayPlanCard'
import DraftEventCard from '@/components/DraftEventCard'
import MeetingWizardCard from '@/components/MeetingWizardCard'
import CancellationWizard from '@/components/CancellationWizard'
import ReminderBubble from '@/components/ReminderBubble'
import BudgetChart from '@/components/BudgetChart'
import CommandPalette from '@/components/CommandPalette'
import RoutineModal from '@/components/RoutineModal'
import SettingsModal, { UserPreferences } from '@/components/SettingsModal'
import WeekScheduleModal from '@/components/WeekScheduleModal'
import { saveTasksToCalendar } from '@/app/actions/saveTasks.action'

const COMMAND_CATEGORIES = [
  {
    label: '📅 Calendar',
    commands: [
      { icon: '📅', name: 'Create event', text: 'Add an event called "Project Planning" tomorrow at 2 PM for 1 hour' },
      { icon: '🤝', name: 'Schedule meeting', text: 'Schedule Meeting' },
      { icon: '☀️', name: 'Daily briefing', text: 'Good morning! What\'s on my plate today?' },
      { icon: '🔄', name: 'Reschedule', text: 'Reschedule my "Budget Review" meeting to Thursday at 1 PM' },
      { icon: '❌', name: 'Cancel event', text: 'Cancel my afternoon sync today' },
    ],
  },
  {
    label: '📧 Email',
    commands: [
      { icon: '📨', name: 'Check inbox', text: 'Check my unread emails and tell me if anything is urgent' },
      { icon: '✉️', name: 'Send email', text: 'Send an email to john@example.com letting him know I am running 5 minutes late' },
    ],
  },
  {
    label: '💰 Finance',
    commands: [
      { icon: '💸', name: 'Log expense', text: 'Log expense: $14.50 for airport coffee on a business trip' },
      { icon: '📊', name: 'Check budget', text: 'How much have I spent on Food this month?' },
    ],
  },
  {
    label: '📊 Analysis',
    commands: [
      { icon: '⏱️', name: 'Time analysis', text: 'Analyse how I spent my time this week. How many hours were in meetings?' },
      { icon: '🧠', name: 'Check routine', text: 'Analyze my weekly routine, assume my calendar is empty' },
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

function DraftEmailCard({ action, onSend, onCancel }: { action: any, onSend: (to: string, subject: string, body: string) => void, onCancel: () => void }) {
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
          style={{ flex: 2, padding: '10px', fontSize: 13, display: 'flex', justifyContent: 'center', gap: 6 }}
          onClick={() => onSend(to, subject, body)}
        >
          🚀 Send Email Now
        </button>
        <button
          className="btn-ghost"
          style={{ flex: 1, padding: '10px', fontSize: 13, display: 'flex', justifyContent: 'center' }}
          onClick={onCancel}
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

const WELCOME_MSG: ChatMessage = {
  id: 'welcome',
  role: 'assistant',
  content: 'Good day! I\'m ExecutiveVAi, your AI Executive Assistant. Here\'s what I can do:\n\n📅 Schedule meetings, find free slots, plan your day\n💰 Track expenses, check your budget\n📧 Read & send emails\n📊 Analyse your weekly time\n\nJust tell me what you need!',
  timestamp: new Date().toISOString(),
}

interface ChatPanelProps {
  reminders: any[]
  setReminders: (val: any[] | ((prev: any[]) => any[])) => void
  suggestions: any[]
  setSuggestions: (val: any[] | ((prev: any[]) => any[])) => void
}

export default function ChatPanel({ reminders, setReminders, suggestions, setSuggestions }: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_MSG])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [historyLoaded, setHistoryLoaded] = useState(false)
  const [showCommands, setShowCommands] = useState(false)
  const [showPalette, setShowPalette] = useState(false)
  const [showRoutineModal, setShowRoutineModal] = useState(false)
  const [showWeekModal, setShowWeekModal] = useState(false)
  const [modalMode, setModalMode] = useState<'event' | 'task'>('event')
  const [imageBase64, setImageBase64] = useState<string | null>(null)
  const [isVoiceMode, setIsVoiceMode] = useState(false)
  const [isRescheduling, setIsRescheduling] = useState(false)
  const [showManualWizard, setShowManualWizard] = useState(false)
  const [showScrubMode, setShowScrubMode] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [prefs, setPrefs] = useState<UserPreferences | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const commandRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (suggestions.length > 0) {
      localStorage.setItem('executive_vai_suggestions', JSON.stringify(suggestions))
    }
  }, [suggestions])

  useEffect(() => {
    const savedSuggestions = localStorage.getItem('executive_vai_suggestions')
    if (savedSuggestions) setSuggestions(JSON.parse(savedSuggestions))
  }, [])

  useEffect(() => {
    const handleSendChat = (e: any) => {
      if (e.detail?.message) {
        sendMessage(e.detail.message)
      }
    }
    window.addEventListener('send-chat', handleSendChat)
    return () => window.removeEventListener('send-chat', handleSendChat)
  }, [messages])

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }, [])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (commandRef.current && !commandRef.current.contains(e.target as Node)) {
        setShowCommands(false)
      }
    }
    if (showCommands) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showCommands])

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

  useEffect(() => {
    if (!historyLoaded) return
    const toSave = messages.filter(m => m.id !== 'welcome')
    if (toSave.length === 0) return
    fetch('/api/chat/history', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: toSave }),
    }).catch(() => { })
  }, [messages, historyLoaded])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping])

  const dismissReminder = useCallback((id: string) => {
    setReminders((prev) => prev.filter((r) => r.id !== id))
  }, [setReminders])

  const clearHistory = useCallback(async () => {
    setMessages([WELCOME_MSG])
    try {
      await fetch('/api/chat/history', { method: 'DELETE' })
    } catch { }
  }, [])

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() && !imageBase64) return
    if (text.trim().toLowerCase() === 'clear chat history') {
      clearHistory()
      return
    }
    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text || '[Uploaded Image]',
      timestamp: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, userMsg])
    setInput('')
    const currentImg = imageBase64
    setImageBase64(null)
    setIsTyping(true)
    try {
      const history = messages.map((m) => ({ role: m.role, content: m.content }))
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-timezone': Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
        body: JSON.stringify({ message: text, history, imageBase64: currentImg }),
      })
      const data = await res.json()
      const aiMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: data.text ?? '',
        timestamp: new Date().toISOString(),
        action: data.action,
        type: data.type,
        meetingResult: data.meetingResult,
        schedule: data.schedule,
        freeSlots: data.freeSlots,
        suggestedAnswers: data.suggestedAnswers || [],
      }
      setMessages((prev) => [...prev, aiMsg])
      if (data.action?.intent === 'show_routine_modal') setShowRoutineModal(true)
      if (data.action?.intent === 'show_week_modal') {
        setIsRescheduling(true)
        setShowWeekModal(true)
      }
      if (isVoiceMode && 'speechSynthesis' in window && data.text) {
        const utterance = new SpeechSynthesisUtterance(data.text)
        utterance.rate = 1.05
        window.speechSynthesis.speak(utterance)
      }
      setIsVoiceMode(false)
    } catch (err) {
      setMessages((prev) => [...prev, {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: '⚠️ Something went wrong. Please try again.',
        timestamp: new Date().toISOString(),
      }])
    } finally {
      setIsTyping(false)
    }
  }, [messages, imageBase64, isVoiceMode, clearHistory])

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
    reader.onload = (event) => setImageBase64(event.target?.result as string)
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
            style={{
              display: 'flex', flexDirection: 'column', gap: 8,
              alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start'
            }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', maxWidth: '100%', flexDirection: msg.role === 'user' ? 'row-reverse' : 'row' }}>
              {msg.role === 'assistant' && (
                <img src="/logo.png" alt="AI" style={{ width: 24, height: 24, borderRadius: 6, flexShrink: 0, marginBottom: 4 }} className="hidden-mobile" />
              )}
              <div className={msg.role === 'user' ? 'bubble-user' : 'bubble-ai'} style={{ fontSize: '13px', padding: '10px 14px' }}>
                {msg.content}
              </div>
            </div>
            {msg.type === 'show_meeting_wizard' && (
              <MeetingWizardCard 
                onComplete={(details) => {
                  const emails = details.attendees.join(', ')
                  sendMessage(`Confirm: Create a ${details.platform} meeting titled "${details.title}" on ${details.startTime} for ${details.duration} minutes with attendees: ${emails}. Description: ${details.description}`)
                }}
                onCancel={() => sendMessage("Cancel meeting schedule.")}
              />
            )}
            {msg.type === 'draft_event' && msg.action && (
              <DraftEventCard
                action={msg.action}
                onConfirm={(title, desc, attendees) => sendMessage(`Confirm: Create this titled "${title}" with description "${desc}" and attendees: ${attendees.join(', ')}`)}
                onCancel={() => sendMessage("Nevermind, cancel this draft")}
              />
            )}
            {msg.meetingResult && <MeetingLinkCard meeting={msg.meetingResult} />}
            {msg.schedule && msg.schedule.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%' }}>
                {msg.schedule.map((task, i) => <DayPlanCard key={i} task={task} />)}
              </div>
            )}
            {msg.freeSlots && msg.freeSlots.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%' }}>
                {msg.freeSlots.map((slot, i) => (
                  <button key={i} className="glass btn-ghost" onClick={() => sendMessage(`Book ${slot.label}`)} style={{ textAlign: 'left', padding: '10px 14px', borderRadius: 10 }}>
                    {slot.label} ({slot.durationMinutes} min free)
                  </button>
                ))}
              </div>
            )}
            {msg.budgetResult && <BudgetChart data={msg.budgetResult} />}
            {msg.action?.intent === 'draft_email' && (
              <DraftEmailCard
                action={msg.action}
                onSend={(to, subject, body) => sendMessage(`Send this email to ${to}`)}
                onCancel={() => sendMessage("Cancel this email draft")}
              />
            )}
            <span style={{ fontSize: 11, color: 'var(--text-subtle)', marginTop: 2 }}>
              {new Date(msg.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        ))}
        {isTyping && (
          <div className="bubble-ai animate-fade-up" style={{ alignSelf: 'flex-start', display: 'flex', gap: 5, alignItems: 'center', padding: '14px 18px' }}>
            <div className="typing-dot" /><div className="typing-dot" /><div className="typing-dot" />
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Command Dropdown */}
      {showCommands && (
        <div ref={commandRef} style={{ position: 'absolute', bottom: 140, left: 20, right: 20, maxHeight: 340, overflowY: 'auto', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, zIndex: 50, padding: '8px 0' }}>
          {COMMAND_CATEGORIES.map(cat => (
            <div key={cat.label}>
              <div style={{ padding: '8px 16px 4px', fontSize: 11, fontWeight: 700, color: 'var(--text-subtle)', textTransform: 'uppercase' }}>{cat.label}</div>
              {cat.commands.map(cmd => (
                <button key={cmd.name} onClick={() => { setInput(cmd.text); setShowCommands(false); }} style={{ display: 'flex', gap: 10, width: '100%', padding: '8px 16px', background: 'none', border: 'none', color: 'var(--text)', fontSize: 13, textAlign: 'left' }}>
                  <span>{cmd.icon}</span><span>{cmd.name}</span>
                </button>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* Input Bar */}
      <div style={{ padding: '12px 16px', background: 'rgba(5, 5, 8, 0.6)', backdropFilter: 'blur(20px)', borderTop: '1px solid var(--border)', marginBottom: 'env(safe-area-inset-bottom, 0px)', paddingBottom: 'clamp(12px, 2vh, 80px)' }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', maxWidth: 1000, margin: '0 auto', width: '100%' }}>
          <div style={{ display: 'flex', gap: 4 }}>
            <button onClick={() => setShowCommands(!showCommands)} className="btn-ghost" style={{ width: 40, height: 40, borderRadius: 12 }}>⚡</button>
            <button onClick={() => fileInputRef.current?.click()} className="btn-ghost hidden-mobile" style={{ width: 40, height: 40, borderRadius: 12 }}>🖼️</button>
            <input type="file" accept="image/*" ref={fileInputRef} style={{ display: 'none' }} onChange={handleFileChange} />
          </div>
          <div style={{ flex: 1, position: 'relative' }}>
            {imageBase64 && <div style={{ position: 'absolute', top: -60, left: 0, padding: 4, background: 'var(--surface)', borderRadius: 10 }}><img src={imageBase64} style={{ height: 40, width: 40, borderRadius: 8 }} /><button onClick={() => setImageBase64(null)} style={{ position: 'absolute', top: -5, right: -5, background: '#ef4444', color: 'white', borderRadius: '50%', width: 16, height: 16 }}>✕</button></div>}
            <textarea id="chat-input" value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKeyDown} placeholder="Message ExecutiveVAi..." style={{ width: '100%', minHeight: 44, maxHeight: 120, padding: '10px 16px', borderRadius: 18, background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text)', fontSize: 14, outline: 'none', resize: 'none' }} rows={1} />
          </div>
          <button onClick={() => sendMessage(input)} disabled={(!input.trim() && !imageBase64) || isTyping} className="btn-brand" style={{ width: 40, height: 40, borderRadius: 12 }}><span style={{ fontSize: 16 }}>🚀</span></button>
        </div>
      </div>

      {showPalette && <CommandPalette isOpen={showPalette} onClose={() => setShowPalette(false)} onSelect={(text) => { setInput(text); setShowPalette(false); }} />}
      {showRoutineModal && <RoutineModal onClose={() => setShowRoutineModal(false)} onSave={async (tasks) => { setShowRoutineModal(false); await saveTasksToCalendar(tasks); }} />}
      {showWeekModal && <WeekScheduleModal onClose={() => setShowWeekModal(false)} onSelectSlot={(dateStr, timeStr, title) => { setInput(`Add ${title} on ${dateStr} at ${timeStr}`); setShowWeekModal(false); }} />}
      {showManualWizard && <MeetingWizardCard onComplete={(details) => { setShowManualWizard(false); sendMessage(`Create ${details.platform} meeting`); }} onCancel={() => setShowManualWizard(false)} />}
      {showScrubMode && <CancellationWizard onClose={() => setShowScrubMode(false)} onComplete={() => setShowScrubMode(false)} />}
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} onSave={(newPrefs) => { setPrefs(newPrefs); setShowSettings(false); }} />}
    </div>
  )
}
