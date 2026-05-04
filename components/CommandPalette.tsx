'use client'
import { useEffect, useState, useRef } from 'react'

interface Command {
  icon: string
  name: string
  description: string
  text: string
}

const COMMANDS: Command[] = [
  { icon: '📅', name: 'Schedule Meeting', description: 'Book a Zoom or Google Meet call', text: 'Schedule a meeting with ' },
  { icon: '🔍', name: 'Find Free Time', description: 'Scan calendar for vacant slots', text: 'Find me time for a 1-hour session this week' },
  { icon: '☀️', name: 'Daily Briefing', description: 'Get your schedule and budget summary', text: 'Good morning! What\'s on my plate today?' },
  { icon: '📨', name: 'Check Inbox', description: 'Triage and summarize unread emails', text: 'Check my unread emails' },
  { icon: '💰', name: 'View Budget', description: 'Show spending charts and limits', text: 'Show my budget dashboard' },
  { icon: '📎', name: 'Log Expense', description: 'Parse a receipt or log cost', text: 'Log an expense for ' },
  { icon: '🌍', name: 'Travel Mode', description: 'Shift meetings to a new timezone', text: 'I am traveling to ' },
  { icon: '🔄', name: 'Reschedule', description: 'Move an existing meeting', text: 'Reschedule my ' },
  { icon: '❌', name: 'Cancel Event', description: 'Remove something from calendar', text: 'Cancel my ' },
]

interface Props {
  isOpen: boolean
  onClose: () => void
  onSelect: (text: string) => void
}

export default function CommandPalette({ isOpen, onClose, onSelect }: Props) {
  const [search, setSearch] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const filteredCommands = COMMANDS.filter(cmd => 
    cmd.name.toLowerCase().includes(search.toLowerCase()) ||
    cmd.description.toLowerCase().includes(search.toLowerCase())
  )

  useEffect(() => {
    if (isOpen) {
      setSearch('')
      setSelectedIndex(0)
      setTimeout(() => inputRef.current?.focus(), 10)
    }
  }, [isOpen])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return

      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex(prev => (prev + 1) % filteredCommands.length)
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex(prev => (prev - 1 + filteredCommands.length) % filteredCommands.length)
      }
      if (e.key === 'Enter' && filteredCommands[selectedIndex]) {
        e.preventDefault()
        onSelect(filteredCommands[selectedIndex].text)
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, filteredCommands, selectedIndex, onClose, onSelect])

  if (!isOpen) return null

  return (
    <div 
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        paddingTop: '15vh', background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)',
        animation: 'fade-in 0.2s ease-out'
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div 
        className="glass"
        style={{
          width: '100%', maxWidth: 600, 
          background: 'var(--surface-1)', borderRadius: 16,
          boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
          overflow: 'hidden', border: '1px solid var(--border)'
        }}
      >
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 18, opacity: 0.5 }}>🔍</span>
          <input 
            ref={inputRef}
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Type a command or search..."
            style={{
              flex: 1, background: 'transparent', border: 'none', outline: 'none',
              color: 'var(--text)', fontSize: 16, fontFamily: 'inherit'
            }}
          />
          <div style={{ padding: '4px 8px', borderRadius: 6, background: 'var(--surface-3)', fontSize: 10, color: 'var(--text-muted)', fontWeight: 700 }}>
            ESC
          </div>
        </div>

        <div style={{ maxHeight: 400, overflowY: 'auto', padding: 8 }}>
          {filteredCommands.length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>
              No commands found for "{search}"
            </div>
          ) : (
            filteredCommands.map((cmd, i) => (
              <div 
                key={cmd.name}
                onClick={() => { onSelect(cmd.text); onClose(); }}
                onMouseEnter={() => setSelectedIndex(i)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  padding: '12px 16px', borderRadius: 10, cursor: 'pointer',
                  background: i === selectedIndex ? 'var(--surface-3)' : 'transparent',
                  transition: 'background 0.1s'
                }}
              >
                <div style={{ 
                  width: 32, height: 32, borderRadius: 8, background: i === selectedIndex ? 'var(--brand)' : 'var(--surface-2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
                  transition: 'all 0.2s'
                }}>
                  {cmd.icon}
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 14, fontWeight: 600, color: i === selectedIndex ? 'var(--text)' : 'var(--text)' }}>
                    {cmd.name}
                  </p>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    {cmd.description}
                  </p>
                </div>
                {i === selectedIndex && (
                  <div style={{ fontSize: 12, color: 'var(--brand-light)', fontWeight: 600 }}>
                    Enter ↵
                  </div>
                )}
              </div>
            ))
          )}
        </div>
        
        <div style={{ padding: '12px 20px', background: 'var(--surface-2)', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <kbd style={{ padding: '2px 6px', borderRadius: 4, background: 'var(--surface-3)', border: '1px solid var(--border)', fontSize: 10, color: 'var(--text-muted)' }}>↑↓</kbd>
              <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Navigate</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <kbd style={{ padding: '2px 6px', borderRadius: 4, background: 'var(--surface-3)', border: '1px solid var(--border)', fontSize: 10, color: 'var(--text-muted)' }}>↵</kbd>
              <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Select</span>
            </div>
          </div>
          <p style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600 }}>ExecutiveVAi Pro</p>
        </div>
      </div>
    </div>
  )
}
