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
  const mobileNavItems = navItems.filter(i => !['settings'].includes(i.id))

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
        <div className="glass-premium" style={{ padding: '16px', borderRadius: 16, marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg, var(--brand), #c084fc)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800, color: 'white', boxShadow: '0 0 15px rgba(99,102,241,0.4)' }}>
              {session.user?.name?.[0] ?? 'C'}
            </div>
            <div style={{ overflow: 'hidden' }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{session.user?.name ?? 'CEO'}</p>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{session.user?.email}</p>
            </div>
          </div>
        </div>

        {/* Daily Progress Widget - WOW Factor */}
        <div className="glass-premium" style={{ padding: '14px', borderRadius: 16, marginBottom: 32, background: 'rgba(99, 102, 241, 0.05)', border: '1px solid rgba(99,102,241,0.2)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-subtle)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Daily Focus</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--brand-light)' }}>75%</span>
          </div>
          <div style={{ height: 6, width: '100%', background: 'rgba(255,255,255,0.05)', borderRadius: 10, overflow: 'hidden', marginBottom: 12 }}>
            <div style={{ height: '100%', width: '75%', background: 'linear-gradient(to right, var(--brand), #c084fc)', borderRadius: 10, boxShadow: '0 0 10px rgba(99,102,241,0.5)' }} />
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 2 }}>Meetings</p>
              <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>4/6</p>
            </div>
            <div style={{ width: 1, background: 'var(--border)', height: 20, marginTop: 4 }} />
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 2 }}>Tasks</p>
              <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>12/15</p>
            </div>
          </div>
        </div>

        {/* Nav links */}
        <nav style={{
          display: 'flex', flexDirection: 'column', gap: 6, flex: 1,
        }}>
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={activeTab === item.id ? 'btn-nav-active' : 'btn-nav'}
              style={{
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              <span style={{ fontSize: 18, transition: 'transform 0.3s' }}>{item.icon}</span>
              <span style={{ fontWeight: activeTab === item.id ? 700 : 500 }}>{item.label}</span>
              {activeTab === item.id && (
                <div style={{ 
                  position: 'absolute', 
                  right: 0, 
                  top: '15%', 
                  height: '70%', 
                  width: 3, 
                  background: 'var(--brand)', 
                  borderRadius: '4px 0 0 4px',
                  boxShadow: '0 0 10px var(--brand)' 
                }} />
              )}
            </button>
          ))}
        </nav>

        {/* Quick Actions / Integration Status */}
        <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 16, paddingTop: 20, borderTop: '1px solid var(--border)' }}>
          <div style={{ padding: '14px', borderRadius: 14, background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', boxShadow: 'inset 0 0 20px rgba(255,255,255,0.01)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Connected Units</span>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#34d399', boxShadow: '0 0 10px #34d399' }} />
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <div title="Google Workspace" style={{ 
                width: 32, height: 32, borderRadius: 8, background: hasGoogle ? 'rgba(52,211,153,0.1)' : 'var(--surface-2)', 
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
                border: hasGoogle ? '1px solid rgba(52,211,153,0.3)' : '1px solid var(--border)',
                filter: hasGoogle ? 'none' : 'grayscale(1)', opacity: hasGoogle ? 1 : 0.4
              }}>📁</div>
              <div title="Zoom Video" style={{ 
                width: 32, height: 32, borderRadius: 8, background: hasZoom ? 'rgba(59,130,246,0.1)' : 'var(--surface-2)', 
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
                border: hasZoom ? '1px solid rgba(59,130,246,0.3)' : '1px solid var(--border)',
                filter: hasZoom ? 'none' : 'grayscale(1)', opacity: hasZoom ? 1 : 0.4
              }}>📹</div>
              <div title="AI Engine" style={{ 
                width: 32, height: 32, borderRadius: 8, background: 'rgba(168,85,247,0.1)', 
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
                border: '1px solid rgba(168,85,247,0.3)',
                boxShadow: '0 0 10px rgba(168,85,247,0.2)'
              }}>🧠</div>
            </div>
          </div>
          
          <button 
            onClick={() => signOut()}
            className="btn-ghost" 
            style={{ 
              width: '100%', justifyContent: 'center', fontSize: 12, padding: '12px',
              borderRadius: 12, background: 'rgba(239, 68, 68, 0.05)',
              border: '1px solid rgba(239, 68, 68, 0.2)', color: '#ef4444',
              fontWeight: 700, transition: 'all 0.2s'
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(239, 68, 68, 0.05)')}
          >
            Terminate Session
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, position: 'relative', zIndex: 1 }}>
        <div style={{ flex: 1, overflowY: 'auto', padding: 'clamp(16px, 4vw, 40px)', paddingBottom: '100px' }}>
          {activeTab === 'home' && <HomePanel session={session} setActiveTab={setActiveTab} />}
          {activeTab === 'chat' && <ChatPanel reminders={reminders} setReminders={setReminders} suggestions={suggestions} setSuggestions={setSuggestions} />}
          {activeTab === 'briefing' && <BriefingPanel />}
          {activeTab === 'planner' && <TaskBoard />}
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
        background: 'rgba(10, 10, 15, 0.8)', backdropFilter: 'blur(20px)'
      }}>
        {mobileNavItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
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
