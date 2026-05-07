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
import WelcomeGuide from '@/components/WelcomeGuide'

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
    // Persist timezone if not set
    if (!localStorage.getItem('executive_vai_timezone')) {
      const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (detected) localStorage.setItem('executive_vai_timezone', detected);
    }

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

  const navItems: { id: TabId; icon: string; label: string }[] = [
    { id: 'home', icon: '🏠', label: 'Home' },
    { id: 'chat', icon: '💬', label: 'Chat' },
    { id: 'briefing', icon: '🧠', label: 'AI Briefing' },
    { id: 'planner', icon: '📋', label: 'Planner' },
    { id: 'emails', icon: '📧', label: 'Emails' },
    { id: 'finances', icon: '💰', label: 'Finances' },
    { id: 'settings', icon: '⚙️', label: 'Settings' },
  ]

  // Show 5 most important tabs in mobile bottom nav
  const mobileNavItems = navItems.filter(i => !['settings', 'emails'].includes(i.id))

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', position: 'relative' }}>
      <OnboardingModal />
      <WelcomeGuide />
      
      {/* Aurora Background Blobs */}
      <div className="aurora">
        <div className="aurora-blob blob-1" />
        <div className="aurora-blob blob-2" />
        <div className="aurora-blob blob-3" />
      </div>

      {/* Sidebar - Premium Glassmorphism */}
      <aside className="hidden-mobile glass" style={{
        width: 260, flexShrink: 0, borderRight: '1px solid var(--border)',
        background: 'rgba(10, 10, 15, 0.4)', display: 'flex', flexDirection: 'column',
        padding: '24px 16px', zIndex: 10,
      }}>
        {/* Logo with Glow */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 40, paddingLeft: 8 }}>
          <div className="glow" style={{ background: 'var(--brand)', padding: 6, borderRadius: 10 }}>
            <img src="/logo.png" alt="Logo" style={{ width: 24, height: 24, objectFit: 'contain' }} />
          </div>
          <span style={{ fontWeight: 800, fontSize: 18, letterSpacing: '-0.02em', background: 'linear-gradient(to right, #fff, #94a3b8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            ExecutiveVAi
          </span>
        </div>

        {/* User Card - Ultra Glass */}
        <div className="glass-premium" style={{ padding: '16px', borderRadius: 16, marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, #6366f1, #c084fc)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700 }}>
              {session.user?.name?.[0] ?? 'C'}
            </div>
            <div style={{ overflow: 'hidden' }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{session.user?.name ?? 'CEO'}</p>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{session.user?.email}</p>
            </div>
          </div>
        </div>

        {/* Nav links */}
        <nav style={{
          display: 'flex', flexDirection: 'column', gap: 4, flex: 1,
          overflowY: 'auto', minHeight: 0, paddingRight: 4, marginBottom: 16
        }}>
          {navItems.map((item) => (
            <div
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`sidebar-item ${activeTab === item.id ? 'active' : ''}`}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '12px 14px', cursor: 'pointer',
                fontSize: 14, fontWeight: activeTab === item.id ? 700 : 500,
              }}
            >
              <span style={{ fontSize: 20, opacity: activeTab === item.id ? 1 : 0.6 }}>{item.icon}</span>
              <span>{item.label}</span>
            </div>
          ))}
        </nav>

        {/* Footer Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button
            onClick={toggleTheme}
            className="glass"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              width: '100%', padding: '10px 14px', borderRadius: 12,
              cursor: 'pointer', transition: 'all 0.2s',
            }}
          >
            <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>
              {theme === 'dark' ? '🌙 Dark' : '☀️ Light'}
            </span>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: theme === 'dark' ? '#6366f1' : '#f59e0b', boxShadow: '0 0 10px currentColor' }} />
          </button>

          <button
            onClick={() => signOut({ callbackUrl: '/landing' })}
            className="btn-ghost"
            style={{ width: '100%', justifyContent: 'center', fontSize: 12, borderRadius: 12, padding: '10px' }}
          >
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main content - Dynamic Shadow */}
      <main style={{ 
        flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', 
        position: 'relative', zIndex: 5, background: 'rgba(5, 5, 8, 0.2)' 
      }}>
        <header style={{
          height: 70, borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 32px', flexShrink: 0, background: 'rgba(5, 5, 8, 0.4)',
          backdropFilter: 'blur(10px)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <h1 className="gradient-text" style={{ fontSize: 20, letterSpacing: '-0.02em' }}>
              {navItems.find(i => i.id === activeTab)?.label}
            </h1>
          </div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            {/* Connection Badges */}
            {[
              { label: 'Google', active: hasGoogle, color: '#4285F4' },
              { label: 'Zoom', active: hasZoom, color: '#2D8CFF' }
            ].map(ind => (
              <div key={ind.label} className="glass" style={{ 
                padding: '4px 10px', borderRadius: 20, display: 'flex', alignItems: 'center', gap: 6,
                opacity: ind.active ? 1 : 0.3, border: ind.active ? `1px solid ${ind.color}44` : '1px solid transparent'
              }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: ind.color }} />
                <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text)' }}>{ind.label}</span>
              </div>
            ))}
          </div>
        </header>

        <div style={{ flex: 1, overflow: 'hidden' }} className="content-area animate-in">
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
            <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
              <div style={{ flex: 1, overflowY: 'auto' }}>
                <WeekSchedule />
              </div>
              <div className="hidden-mobile" style={{ width: 360, flexShrink: 0, overflowY: 'auto', borderLeft: '1px solid var(--border)' }}>
                <TaskBoard />
              </div>
            </div>
          )}
          {activeTab === 'emails' && <EmailSummaryPanel />}
          {activeTab === 'finances' && <FinanceDashboard />}
          {activeTab === 'settings' && <SettingsPanel />}
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="mobile-nav glass" style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, height: 70,
        justifyContent: 'space-around', alignItems: 'center',
        padding: '0 10px', zIndex: 100, borderTop: '1px solid var(--border)',
        background: 'rgba(5, 5, 8, 0.8)', backdropFilter: 'blur(20px)'
      }}>
        {mobileNavItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id as TabId)}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
              background: 'none', border: 'none', color: activeTab === item.id ? 'var(--brand-light)' : 'var(--text-muted)',
              padding: '8px 12px', borderRadius: 12, transition: 'all 0.2s',
              transform: activeTab === item.id ? 'scale(1.1)' : 'scale(1)'
            }}
          >
            <span style={{ fontSize: 20 }}>{item.icon}</span>
            <span style={{ fontSize: 10, fontWeight: 700 }}>{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}
