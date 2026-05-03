'use client'

export default function SettingsPanel() {
  return (
  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }} className="container-padding">
      <header style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>Settings</h2>
        <p style={{ color: 'var(--text-muted)' }}>Manage your personal AI assistant and integrations.</p>
      </header>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
        {/* Assistant Section */}
        <section>
          <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>Assistant Preferences</h3>
          <div className="glass" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ fontWeight: 500 }}>Default Meeting Duration</p>
                <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Default time for meetings when not specified.</p>
              </div>
              <select className="glass" style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface-3)' }}>
                <option>15 minutes</option>
                <option selected>30 minutes</option>
                <option>45 minutes</option>
                <option>60 minutes</option>
              </select>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ fontWeight: 500 }}>Working Hours</p>
                <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>MeetMate won't schedule anything outside these hours.</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input type="time" defaultValue="09:00" className="glass" style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border)' }} />
                <span>to</span>
                <input type="time" defaultValue="18:00" className="glass" style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border)' }} />
              </div>
            </div>
          </div>
        </section>

        {/* Notifications Section */}
        <section>
          <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>Reminders</h3>
          <div className="glass" style={{ padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ fontWeight: 500 }}>Upcoming Meeting Alerts</p>
                <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Show a bubble reminder 10 minutes before events.</p>
              </div>
              <div style={{ width: 44, height: 24, background: 'var(--brand)', borderRadius: 12, position: 'relative', cursor: 'pointer' }}>
                <div style={{ width: 18, height: 18, background: 'white', borderRadius: '50%', position: 'absolute', top: 3, right: 3 }} />
              </div>
            </div>
          </div>
        </section>

        {/* Danger Zone */}
        <section>
          <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16, color: '#f87171' }}>Danger Zone</h3>
          <div className="glass" style={{ padding: 24, border: '1px solid rgba(248, 113, 113, 0.2)' }}>
             <button className="btn-ghost" style={{ color: '#f87171' }}>Clear All History and Redis State</button>
          </div>
        </section>
      </div>
    </div>
  )
}
