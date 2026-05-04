'use client'
import { useState, useEffect } from 'react'
import ChatPanel from '@/components/ChatPanel'
import AnalysisDashboard from '@/components/AnalysisDashboard'
import WeekSchedule from '@/components/WeekSchedule'
import FinanceDashboard from '@/components/FinanceDashboard'
import BriefingPanel from '@/components/BriefingPanel'
import TaskBoard from '@/components/TaskBoard'
import EmailSummaryPanel from '@/components/EmailSummaryPanel'
import SettingsPanel from '@/components/SettingsPanel'
import { signOut } from 'next-auth/react'

interface DashboardProps {
  session: any
}

type TabId = 'chat' | 'briefing' | 'planner' | 'emails' | 'finances' | 'analysis' | 'settings'

export default function Dashboard({ session }: DashboardProps) {
  const [activeTab, setActiveTab] = useState<TabId>('chat')
  const [plannerView, setPlannerView] = useState<'tasks' | 'calendar'>('tasks')
  
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
    { id: 'chat',     icon: '💬', label: 'Chat' },
    { id: 'briefing', icon: '🧠', label: 'AI Briefing' },
    { id: 'planner',  icon: '📋', label: 'Planner' },
    { id: 'emails',   icon: '📧', label: 'Emails' },
    { id: 'finances', icon: '💰', label: 'Finances' },
    { id: 'analysis', icon: '📊', label: 'Analysis' },
    { id: 'settings', icon: '⚙️', label: 'Settings' },
  ]

  // Show 5 most important tabs in mobile bottom nav
  const mobileNavItems = navItems.filter(i => !['analysis', 'settings'].includes(i.id))

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'var(--bg)' }}>
      {/* Sidebar - Hidden on mobile */}
      <aside className="hidden-mobile" style={{
        width: 240, flexShrink: 0, borderRight: '1px solid var(--border)',
        background: 'var(--surface)', display: 'flex', flexDirection: 'column',
        padding: '20px 16px',
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 32 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18, boxShadow: '0 4px 12px rgba(99,102,241,0.35)',
          }}>🤖</div>
          <span style={{ fontWeight: 700, fontSize: 16, letterSpacing: '-0.01em' }}>ExecutiveVAi</span>
        </div>

        {/* User Info */}
        <div className="glass" style={{ padding: '12px 14px', marginBottom: 24 }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{session.user?.name ?? 'CEO'}</p>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{session.user?.email}</p>
        </div>

        {/* Nav links */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
          {navItems.map((item) => (
            <div 
              key={item.id} 
              onClick={() => setActiveTab(item.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '9px 12px', borderRadius: 8, cursor: 'pointer',
                background: activeTab === item.id ? 'rgba(99,102,241,0.15)' : 'transparent',
                color:      activeTab === item.id ? 'var(--brand-light)' : 'var(--text-muted)',
                fontSize: 13, fontWeight: activeTab === item.id ? 600 : 400,
                border: activeTab === item.id ? '1px solid rgba(99,102,241,0.2)' : '1px solid transparent',
                transition: 'all 0.15s',
              }}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </div>
          ))}
        </nav>

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
            <div className="show-mobile" style={{ display: 'none', fontSize: 18 }}>🤖</div>
            <h1 style={{ fontSize: 15, fontWeight: 700, lineHeight: 1 }}>
              {navItems.find(i => i.id === activeTab)?.label}
            </h1>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {/* Planner view toggle */}
            {activeTab === 'planner' && (
              <div style={{ display: 'flex', gap: 2, background: 'var(--surface-2)', borderRadius: 8, padding: 2 }}>
                <button
                  onClick={() => setPlannerView('tasks')}
                  style={{
                    padding: '5px 12px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                    border: 'none', cursor: 'pointer',
                    background: plannerView === 'tasks' ? 'var(--brand)' : 'transparent',
                    color: plannerView === 'tasks' ? '#fff' : 'var(--text-muted)',
                    transition: 'all 0.15s',
                  }}
                >
                  ✅ Tasks
                </button>
                <button
                  onClick={() => setPlannerView('calendar')}
                  style={{
                    padding: '5px 12px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                    border: 'none', cursor: 'pointer',
                    background: plannerView === 'calendar' ? 'var(--brand)' : 'transparent',
                    color: plannerView === 'calendar' ? '#fff' : 'var(--text-muted)',
                    transition: 'all 0.15s',
                  }}
                >
                  📅 Calendar
                </button>
              </div>
            )}
             {/* Connection Indicators */}
             {[
               { label: 'G', active: hasGoogle },
               { label: 'Z', active: hasZoom }
             ].map(ind => (
               <div key={ind.label} style={{ display: 'flex', alignItems: 'center', gap: 4, opacity: ind.active ? 1 : 0.4 }}>
                 <span style={{ width: 5, height: 5, borderRadius: '50%', background: ind.active ? 'var(--meeting-color)' : '#94a3b8' }} />
                 <span style={{ fontSize: 10, fontWeight: 600, color: ind.active ? 'var(--text)' : 'var(--text-muted)' }}>{ind.label}</span>
               </div>
             ))}
          </div>
        </header>

        <div style={{ flex: 1, overflow: 'hidden', marginBottom: 64 /* space for mobile nav */ }} className="content-area">
          <div style={{ display: activeTab === 'chat' ? 'block' : 'none', height: '100%' }}>
            <ChatPanel />
          </div>
          {activeTab === 'briefing' && <BriefingPanel />}
          {activeTab === 'planner' && plannerView === 'tasks' && <TaskBoard />}
          {activeTab === 'planner' && plannerView === 'calendar' && <WeekSchedule />}
          {activeTab === 'emails' && <EmailSummaryPanel />}
          {activeTab === 'finances' && <FinanceDashboard />}
          {activeTab === 'analysis' && <AnalysisDashboard />}
          {activeTab === 'settings' && <SettingsPanel />}
        </div>
      </main>
    </div>
  )
}
