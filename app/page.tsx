import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import ChatPanel from '@/components/ChatPanel'

export default async function DashboardPage() {
  const session = await auth()
  if (!session) redirect('/login')

  const hasGoogle = !!session.googleAccessToken
  const hasZoom   = !!session.zoomAccessToken

  return (
    <div style={{
      display: 'flex', height: '100vh', overflow: 'hidden',
      background: 'var(--bg)',
    }}>

      {/* ── Sidebar ────────────────────────────────────────────────────────── */}
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
          }}>
            🤖
          </div>
          <span style={{ fontWeight: 700, fontSize: 16, letterSpacing: '-0.01em' }}>
            MeetMate
          </span>
        </div>

        {/* User info */}
        <div className="glass" style={{ padding: '12px 14px', marginBottom: 24 }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
            {session.user?.name ?? 'CEO'}
          </p>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
            {session.user?.email}
          </p>
        </div>

        {/* Integrations status */}
        <div style={{ marginBottom: 24 }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-subtle)',
                      letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10 }}>
            Integrations
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              { label: 'Google Calendar', connected: hasGoogle, icon: '📅' },
              { label: 'Zoom',           connected: hasZoom,   icon: '📹' },
            ].map((item) => (
              <div key={item.label} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '8px 10px', borderRadius: 8,
                background: 'var(--surface-2)',
              }}>
                <span style={{ fontSize: 14 }}>{item.icon}</span>
                <span style={{ fontSize: 12, flex: 1, color: 'var(--text-muted)' }}>
                  {item.label}
                </span>
                <span style={{
                  width: 7, height: 7, borderRadius: '50%',
                  background: item.connected ? 'var(--meeting-color)' : 'var(--text-subtle)',
                }} />
              </div>
            ))}
          </div>
        </div>

        {/* Nav links */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
          {[
            { icon: '💬', label: 'Chat',          active: true },
            { icon: '📊', label: 'Time Analysis', active: false },
            { icon: '⚙️', label: 'Settings',      active: false },
          ].map((item) => (
            <div key={item.label} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '9px 12px', borderRadius: 8, cursor: 'pointer',
              background: item.active ? 'rgba(99,102,241,0.15)' : 'transparent',
              color:      item.active ? 'var(--brand-light)' : 'var(--text-muted)',
              fontSize: 13, fontWeight: item.active ? 600 : 400,
              border: item.active ? '1px solid rgba(99,102,241,0.2)' : '1px solid transparent',
              transition: 'all 0.15s',
            }}>
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </div>
          ))}
        </nav>

        {/* Sign out */}
        <form action="/api/auth/signout" method="POST">
          <button type="submit" className="btn-ghost" style={{ width: '100%', justifyContent: 'center', fontSize: 13 }}>
            Sign Out
          </button>
        </form>
      </aside>

      {/* ── Main chat area ─────────────────────────────────────────────────── */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Header bar */}
        <header style={{
          height: 60, borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 24px', flexShrink: 0,
        }}>
          <div>
            <h1 style={{ fontSize: 16, fontWeight: 600, lineHeight: 1 }}>
              AI Chief of Staff
            </h1>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </p>
          </div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.25)',
            borderRadius: 20, padding: '5px 12px',
          }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--meeting-color)', display: 'block' }} />
            <span style={{ fontSize: 12, color: 'var(--meeting-color)', fontWeight: 500 }}>
              Online
            </span>
          </div>
        </header>

        {/* Chat panel fills remaining height */}
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <ChatPanel />
        </div>
      </main>
    </div>
  )
}
