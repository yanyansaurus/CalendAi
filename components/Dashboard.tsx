'use client'
import { useState } from 'react'
import ChatPanel from '@/components/ChatPanel'
import AnalysisDashboard from '@/components/AnalysisDashboard'
import WeekSchedule from '@/components/WeekSchedule'
import FinanceDashboard from '@/components/FinanceDashboard'
import SettingsPanel from '@/components/SettingsPanel'
import { signOut } from 'next-auth/react'

interface DashboardProps {
  session: any
}

export default function Dashboard({ session }: DashboardProps) {
  const [activeTab, setActiveTab] = useState<'chat' | 'schedule' | 'finances' | 'analysis' | 'settings'>('chat')
  
  const hasGoogle = !!session?.googleAccessToken
  const hasZoom   = !!session?.zoomAccessToken

  const navItems = [
    { id: 'chat',     icon: '💬', label: 'Chat' },
    { id: 'schedule', icon: '📅', label: 'Schedule' },
    { id: 'finances', icon: '💰', label: 'Track Finances' },
    { id: 'analysis', icon: '📊', label: 'Time Analysis' },
    { id: 'settings', icon: '⚙️', label: 'Settings' },
  ] as const

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'var(--bg)' }}>
      {/* Sidebar */}
      <aside style={{
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

      {/* Main content */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <header style={{
          height: 60, borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 24px', flexShrink: 0,
        }}>
          <div>
            <h1 style={{ fontSize: 16, fontWeight: 600, lineHeight: 1 }}>
              {navItems.find(i => i.id === activeTab)?.label}
            </h1>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
             {/* Indicators */}
             {[
               { label: 'Google', active: hasGoogle },
               { label: 'Zoom', active: hasZoom }
             ].map(ind => (
               <div key={ind.label} style={{ display: 'flex', alignItems: 'center', gap: 6, opacity: ind.active ? 1 : 0.4 }}>
                 <span style={{ width: 6, height: 6, borderRadius: '50%', background: ind.active ? 'var(--meeting-color)' : '#94a3b8' }} />
                 <span style={{ fontSize: 11, color: ind.active ? 'var(--text)' : 'var(--text-muted)' }}>{ind.label}</span>
               </div>
             ))}
          </div>
        </header>

        <div style={{ flex: 1, overflow: 'hidden' }}>
          {activeTab === 'chat' && <ChatPanel />}
          {activeTab === 'schedule' && <WeekSchedule />}
          {activeTab === 'finances' && <FinanceDashboard />}
          {activeTab === 'analysis' && <AnalysisDashboard />}
          {activeTab === 'settings' && <SettingsPanel />}
        </div>
      </main>
    </div>
  )
}
