'use client'
import { useState, useEffect } from 'react'
import HomePanel from '@/components/HomePanel'
import ChatPanel from '@/components/ChatPanel'
import WeekSchedule from '@/components/WeekSchedule'
import FinanceDashboard from '@/components/FinanceDashboard'
import BriefingPanel from '@/components/BriefingPanel'
import EmailSummaryPanel from '@/components/EmailSummaryPanel'
import SettingsPanel from '@/components/SettingsPanel'
import TaskBoard from '@/components/TaskBoard'
import { useTheme } from '@/components/ThemeProvider'
import OnboardingModal from '@/components/OnboardingModal'
import { signOut } from 'next-auth/react'
import {
  IconHome, IconChat, IconBrain, IconClipboard,
  IconMail, IconWallet, IconSettings,
  IconSun, IconMoon, IconLogOut
} from '@/components/Icons'

interface DashboardProps {
  session: any
}

type TabId = 'home' | 'chat' | 'briefing' | 'planner' | 'emails' | 'finances' | 'settings'

const NAV_ICON_MAP: Record<TabId, React.FC<{ size?: number; color?: string }>> = {
  home: IconHome,
  chat: IconChat,
  briefing: IconBrain,
  planner: IconClipboard,
  emails: IconMail,
  finances: IconWallet,
  settings: IconSettings,
}

export default function Dashboard({ session }: DashboardProps) {
  const [activeTab, setActiveTab] = useState<TabId>('home')
  const [reminders, setReminders] = useState<any[]>([])
  const [suggestions, setSuggestions] = useState<any[]>([])
  const [plannerMode, setPlannerMode] = useState<'normal' | 'maximized'>('normal')
  const { theme, toggleTheme } = useTheme()

  // Global Poller for Reminders and Insights
  useEffect(() => {
    const poll = async () => {
      try {
        const res = await fetch('/api/schedule/reminder')
        if (!res.ok) return
        const data = await res.json()

        if (data.reminders?.length) {
          setReminders(prev => {
            const existingIds = new Set(prev.map(r => r.id))
            const newOnes = data.reminders.filter((r: any) => !existingIds.has(r.id))

            // Trigger Browser Notifications for truly new items
            if (newOnes.length && 'Notification' in window && Notification.permission === 'granted') {
              newOnes.forEach((r: any) => {
                new Notification('ExecutiveVAi Reminder', {
                  body: r.message || r.taskName || 'Upcoming Task',
                  icon: 'https://cdn-icons-png.flaticon.com/512/825/825590.png'
                })
              })
            }
            return [...prev, ...newOnes]
          })
        }

        if (data.emailSuggestions?.length) {
          setSuggestions(prev => {
            const existingIds = new Set(prev.map(s => s.id || s.threadId))
            const newOnes = data.emailSuggestions.filter((s: any) => !existingIds.has(s.id || s.threadId))

            if (newOnes.length && 'Notification' in window && Notification.permission === 'granted') {
              newOnes.forEach((s: any) => {
                new Notification('ExecutiveVAi Insight', {
                  body: s.actionText || s.subject || 'New Action Item',
                  icon: 'https://cdn-icons-png.flaticon.com/512/732/732200.png'
                })
              })
            }
            return [...prev, ...newOnes]
          })
        }
      } catch { /* ignore */ }
    }

    poll()
  }, [])

  // Listen for tab switch events from child components
  useEffect(() => {
    const handleSwitch = (e: any) => {
      if (e.detail?.tab) setActiveTab(e.detail.tab)
    }
    window.addEventListener('switch-tab', handleSwitch)
    return () => window.removeEventListener('switch-tab', handleSwitch)
  }, [])

  const hasGoogle = !!session?.googleAccessToken
  const hasZoom = true  // Zoom uses Server-to-Server OAuth — always available if configured

  const navItems: { id: TabId; label: string }[] = [
    { id: 'home', label: 'Home' },
    { id: 'chat', label: 'Chat' },
    { id: 'briefing', label: 'AI Briefing' },
    { id: 'planner', label: 'Planner' },
    { id: 'emails', label: 'Emails' },
    { id: 'finances', label: 'Finances' },
    { id: 'settings', label: 'Settings' },
  ]

  // Show 5 most important tabs in mobile bottom nav
  const mobileNavItems = navItems.filter(i => !['settings'].includes(i.id))

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'var(--bg)' }}>
      <OnboardingModal />
      
      {/* Sidebar - Visible on Desktop */}
      <aside className="hidden-mobile" style={{
        width: 240, flexShrink: 0, borderRight: '1px solid var(--border)',
        background: 'var(--surface)', display: 'flex', flexDirection: 'column',
        padding: '20px 12px',
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 32, padding: '0 8px' }}>
          <img src="/logo.png" alt="ExecutiveVAi Logo" style={{
            width: 32, height: 32, borderRadius: 8,
            objectFit: 'contain'
          }} />
          <span style={{ fontWeight: 700, fontSize: 15, letterSpacing: '-0.02em' }}>ExecutiveVAi</span>
        </div>

        {/* User Info */}
        <div style={{
          padding: '10px 12px', marginBottom: 24, borderRadius: 10,
          background: 'var(--surface-2)', border: '1px solid var(--border)',
        }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', lineHeight: 1.3 }}>{session.user?.name ?? 'CEO'}</p>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{session.user?.email}</p>
        </div>

        {/* Nav links */}
        <nav style={{
          display: 'flex', flexDirection: 'column', gap: 2, flex: 1,
          overflowY: 'auto', minHeight: 0, paddingRight: 4, marginBottom: 16
        }}>
          {navItems.map((item) => {
            const Icon = NAV_ICON_MAP[item.id]
            const isActive = activeTab === item.id
            return (
              <div
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '9px 12px', borderRadius: 8, cursor: 'pointer',
                  background: isActive ? 'var(--brand-glow)' : 'transparent',
                  color: isActive ? 'var(--brand-light)' : 'var(--text-muted)',
                  fontSize: 13, fontWeight: isActive ? 600 : 500,
                  border: isActive ? '1px solid rgba(99,102,241,0.2)' : '1px solid transparent',
                  transition: 'all 0.15s ease',
                  flexShrink: 0,
                }}
                onMouseEnter={e => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.03)'
                    e.currentTarget.style.color = 'var(--text)'
                  }
                }}
                onMouseLeave={e => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'transparent'
                    e.currentTarget.style.color = 'var(--text-muted)'
                  }
                }}
              >
                <Icon size={17} color={isActive ? 'var(--brand-light)' : 'var(--text-muted)'} />
                <span>{item.label}</span>
              </div>
            )
          })}
        </nav>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            width: '100%', padding: '8px 12px', borderRadius: 8,
            background: 'var(--surface-2)', border: '1px solid var(--border)',
            cursor: 'pointer', marginBottom: 8, transition: 'all 0.2s',
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>
            {theme === 'dark' ? <IconMoon size={14} /> : <IconSun size={14} />}
            {theme === 'dark' ? 'Dark' : 'Light'}
          </span>
          <div style={{
            width: 36, height: 20, borderRadius: 10, position: 'relative',
            background: theme === 'dark' ? 'var(--surface-3)' : 'var(--brand)',
            transition: 'background 0.3s',
          }}>
            <div style={{
              width: 14, height: 14, borderRadius: '50%',
              background: '#fff', position: 'absolute', top: 3,
              left: theme === 'dark' ? 3 : 19,
              transition: 'left 0.3s ease',
              boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
            }} />
          </div>
        </button>

        {/* Sign Out */}
        <button
          onClick={() => signOut({ callbackUrl: '/landing' })}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            width: '100%', padding: '8px 12px', borderRadius: 8,
            background: 'transparent', border: '1px solid var(--border)',
            cursor: 'pointer', color: 'var(--text-muted)', fontSize: 12,
            fontWeight: 500, transition: 'all 0.15s', marginBottom: 8,
          }}
          onMouseEnter={e => {
            e.currentTarget.style.borderColor = 'var(--danger)'
            e.currentTarget.style.color = 'var(--danger)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.borderColor = 'var(--border)'
            e.currentTarget.style.color = 'var(--text-muted)'
          }}
        >
          <IconLogOut size={14} />
          Sign Out
        </button>
      </aside>

      {/* Bottom Nav - Visible on Mobile */}
      <nav className="show-mobile" style={{
        display: 'none', position: 'fixed', bottom: 0, left: 0, right: 0,
        height: 50, background: 'var(--surface)', borderTop: '1px solid var(--border)',
        zIndex: 100, padding: '0 8px',
      }}>
        <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'space-around' }}>
          {mobileNavItems.map((item) => {
            const Icon = NAV_ICON_MAP[item.id]
            const isActive = activeTab === item.id
            return (
              <div
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1,
                  padding: '4px 0', cursor: 'pointer', flex: 1,
                  color: isActive ? 'var(--brand-light)' : 'var(--text-muted)',
                }}
              >
                <Icon size={18} color={isActive ? 'var(--brand-light)' : 'var(--text-muted)'} />
                <span style={{ fontSize: 9, fontWeight: isActive ? 600 : 400 }}>{item.label}</span>
              </div>
            )
          })}
        </div>
      </nav>

      {/* Main content */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <header style={{
          height: 56, borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 20px', flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <h1 style={{ fontSize: 14, fontWeight: 600, lineHeight: 1, letterSpacing: '-0.01em' }}>
              {navItems.find(i => i.id === activeTab)?.label}
            </h1>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            {/* Connection Indicators */}
            {[
              { label: 'Google', short: 'G', active: hasGoogle },
              { label: 'Zoom', short: 'Z', active: hasZoom }
            ].map(ind => (
              <div key={ind.short} style={{
                display: 'flex', alignItems: 'center', gap: 5,
                opacity: ind.active ? 1 : 0.4,
                padding: '4px 10px', borderRadius: 6,
                background: ind.active ? 'rgba(16,185,129,0.08)' : 'transparent',
                border: `1px solid ${ind.active ? 'rgba(16,185,129,0.2)' : 'var(--border)'}`,
              }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: ind.active ? '#10b981' : '#94a3b8' }} />
                <span style={{ fontSize: 11, fontWeight: 500, color: ind.active ? 'var(--text)' : 'var(--text-muted)' }}>{ind.short}</span>
              </div>
            ))}
          </div>
        </header>

        <div style={{ flex: 1, overflow: 'hidden', marginBottom: 50 }} className="content-area">
          {activeTab === 'home' && <HomePanel />}
          <div style={{ display: activeTab === 'chat' ? 'block' : 'none', height: '100%' }}>
            <ChatPanel
              reminders={reminders}
              setReminders={setReminders}
              suggestions={suggestions}
              setSuggestions={setSuggestions}
            />
          </div>
          {activeTab === 'briefing' && <BriefingPanel />}
          {activeTab === 'planner' && (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
              <div 
                onScroll={(e) => {
                  if (e.currentTarget.scrollTop > 50 && plannerMode === 'normal') {
                    setPlannerMode('maximized')
                  } else if (e.currentTarget.scrollTop <= 0 && plannerMode === 'maximized') {
                    setPlannerMode('normal')
                  }
                }}
                style={{ 
                  flex: plannerMode === 'maximized' ? 1 : 2.5, 
                  overflowY: 'auto', 
                  borderBottom: '1px solid var(--border)',
                  transition: 'flex 0.4s cubic-bezier(0.4, 0, 0.2, 1)' 
                }}
              >
                <WeekSchedule />
              </div>
              <div style={{ 
                flex: plannerMode === 'maximized' ? 0 : 1, 
                minHeight: plannerMode === 'maximized' ? 36 : 0,
                maxHeight: plannerMode === 'maximized' ? 36 : '100%',
                overflow: 'hidden', 
                background: 'var(--surface-2)',
                transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                borderTop: plannerMode === 'maximized' ? '1px solid var(--border)' : 'none',
                position: 'relative'
              }}>
                {plannerMode === 'maximized' ? (
                  <div 
                    onClick={() => setPlannerMode('normal')}
                    style={{ 
                      height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', 
                      cursor: 'pointer', gap: 8, color: 'var(--text-muted)', fontSize: 10, fontWeight: 700,
                      textTransform: 'uppercase', letterSpacing: '0.05em'
                    }}
                  >
                    <IconClipboard size={12} /> Show Task Board
                  </div>
                ) : (
                  <div style={{ height: '100%', overflowY: 'auto', padding: 20 }}>
                    <TaskBoard />
                  </div>
                )}
              </div>
            </div>
          )}
          {activeTab === 'emails' && <EmailSummaryPanel />}
          {activeTab === 'finances' && <FinanceDashboard />}

          {activeTab === 'settings' && <SettingsPanel />}
        </div>
      </main>
    </div>
  )
}
