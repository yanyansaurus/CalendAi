'use client'
import { useState, useEffect } from 'react'
import HomePanel from '@/components/HomePanel'
import ChatPanel from '@/components/ChatPanel'
import WeekSchedule from '@/components/WeekSchedule'
import FinanceDashboard from '@/components/FinanceDashboard'
import BriefingPanel from '@/components/BriefingPanel'
import EmailSummaryPanel from '@/components/EmailSummaryPanel'
import SettingsPanel from '@/components/SettingsPanel'
import { useTheme } from '@/components/ThemeProvider'
import OnboardingModal from '@/components/OnboardingModal'
import { signOut } from 'next-auth/react'

interface DashboardProps {
  session: any
}

type TabId = 'home' | 'chat' | 'briefing' | 'planner' | 'emails' | 'finances' | 'settings'

export default function Dashboard({ session }: DashboardProps) {
  const [activeTab, setActiveTab] = useState<TabId>('home')
  const [reminders, setReminders] = useState<any[]>([])
  const [suggestions, setSuggestions] = useState<any[]>([])
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
  const hasZoom   = true  // Zoom uses Server-to-Server OAuth — always available if configured

  const navItems: { id: TabId; icon: string; label: string }[] = [
    { id: 'home',     icon: '🏠', label: 'Home' },
    { id: 'chat',     icon: '💬', label: 'Chat' },
    { id: 'briefing', icon: '🧠', label: 'AI Briefing' },
    { id: 'planner',  icon: '📋', label: 'Planner' },
    { id: 'emails',   icon: '📧', label: 'Emails' },
    { id: 'finances', icon: '💰', label: 'Finances' },
    { id: 'settings', icon: '⚙️', label: 'Settings' },
  ]

  // Show 5 most important tabs in mobile bottom nav
  const mobileNavItems = navItems.filter(i => !['settings'].includes(i.id))

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'var(--bg)' }}>
      <OnboardingModal />
      {/* Sidebar - Hidden on mobile */}
      <aside className="hidden-mobile" style={{
        width: 240, flexShrink: 0, borderRight: '1px solid var(--border)',
        background: 'var(--surface)', display: 'flex', flexDirection: 'column',
        padding: '20px 16px',
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 32 }}>
          <img src="/logo.png" alt="ExecutiveVAi Logo" style={{
            width: 36, height: 36, borderRadius: 8,
            objectFit: 'contain'
          }} />
          <span style={{ fontWeight: 700, fontSize: 16, letterSpacing: '-0.01em' }}>ExecutiveVAi</span>
        </div>

        {/* User Info */}
        <div className="glass" style={{ padding: '12px 14px', marginBottom: 24 }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{session.user?.name ?? 'CEO'}</p>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{session.user?.email}</p>
        </div>

        {/* Nav links */}
        <nav style={{ 
          display: 'flex', flexDirection: 'column', gap: 6, flex: 1, 
          overflowY: 'auto', minHeight: 0, paddingRight: 4, marginBottom: 16 
        }}>
          {navItems.map((item) => (
            <div 
              key={item.id} 
              onClick={() => setActiveTab(item.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 14px', borderRadius: 10, cursor: 'pointer',
                background: activeTab === item.id ? 'var(--brand-glow)' : 'transparent',
                color:      activeTab === item.id ? 'var(--brand-light)' : 'var(--text-muted)',
                fontSize: 14, fontWeight: activeTab === item.id ? 600 : 500,
                border: activeTab === item.id ? '1px solid rgba(99,102,241,0.3)' : '1px solid transparent',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                flexShrink: 0,
              }}
              onMouseEnter={e => {
                if (activeTab !== item.id) {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.03)'
                }
              }}
              onMouseLeave={e => {
                if (activeTab !== item.id) {
                  e.currentTarget.style.background = 'transparent'
                }
              }}
            >
              <span style={{ fontSize: 18 }}>{item.icon}</span>
              <span>{item.label}</span>
            </div>
          ))}
        </nav>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            width: '100%', padding: '8px 12px', borderRadius: 10,
            background: 'var(--surface-2)', border: '1px solid var(--border)',
            cursor: 'pointer', marginBottom: 8, transition: 'all 0.2s',
          }}
        >
          <span style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 500 }}>
            {theme === 'dark' ? '🌙 Dark' : '☀️ Light'}
          </span>
          <div style={{
            width: 40, height: 22, borderRadius: 11, position: 'relative',
            background: theme === 'dark' ? 'var(--surface-3)' : 'var(--brand)',
            transition: 'background 0.3s',
          }}>
            <div style={{
              width: 16, height: 16, borderRadius: '50%',
              background: '#fff', position: 'absolute', top: 3,
              left: theme === 'dark' ? 3 : 21,
              transition: 'left 0.3s ease',
              boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
            }} />
          </div>
        </button>

        {/* Sign Out */}
        <button 
          onClick={() => signOut({ callbackUrl: '/landing' })}
          className="btn-ghost" 
          style={{ width: '100%', justifyContent: 'center', fontSize: 13, marginBottom: 12 }}
        >
          Sign Out
        </button>
      </aside>

      {/* Mobile Bottom Nav */}
      <nav className="show-mobile" style={{
        display: 'none', position: 'fixed', bottom: 0, left: 0, right: 0,
        height: 64, background: 'var(--surface)', borderTop: '1px solid var(--border)',
        zIndex: 100, padding: '0 8px',
      }}>
        <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'space-around' }}>
          {mobileNavItems.map((item) => (
            <div 
              key={item.id} 
              onClick={() => setActiveTab(item.id)}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                padding: '6px 4px', cursor: 'pointer', flex: 1,
                color: activeTab === item.id ? 'var(--brand-light)' : 'var(--text-muted)',
                transition: 'all 0.15s',
              }}
            >
              <span style={{ fontSize: 18 }}>{item.icon}</span>
              <span style={{ fontSize: 9, fontWeight: activeTab === item.id ? 600 : 400 }}>{item.label}</span>
            </div>
          ))}
        </div>
      </nav>

      {/* Main content */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <header style={{
          height: 60, borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 16px', flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <img src="/logo.png" alt="Logo" className="show-mobile" style={{ display: 'none', width: 24, height: 24, objectFit: 'contain' }} />
            <h1 style={{ fontSize: 15, fontWeight: 700, lineHeight: 1 }}>
              {navItems.find(i => i.id === activeTab)?.label}
            </h1>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
             {/* Connection Indicators */}
             {[
               { label: 'G', active: hasGoogle },
               { label: 'Z', active: hasZoom }
             ].map(ind => (
               <div key={ind.label} style={{ display: 'flex', alignItems: 'center', gap: 4, opacity: ind.active ? 1 : 0.4 }}>
                 <span style={{ width: 5, height: 5, borderRadius: '50%', background: ind.active ? '#10b981' : '#94a3b8' }} />
                 <span style={{ fontSize: 10, fontWeight: 600, color: ind.active ? 'var(--text)' : 'var(--text-muted)' }}>{ind.label}</span>
               </div>
             ))}
          </div>
        </header>

        <div style={{ flex: 1, overflow: 'hidden', marginBottom: 64 /* space for mobile nav */ }} className="content-area">
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
          {activeTab === 'planner' && <WeekSchedule />}
          {activeTab === 'emails' && <EmailSummaryPanel />}
          {activeTab === 'finances' && <FinanceDashboard />}

          {activeTab === 'settings' && <SettingsPanel />}
        </div>
      </main>
    </div>
  )
}
