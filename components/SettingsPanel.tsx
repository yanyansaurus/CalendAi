'use client'
import { useEffect, useState, useCallback } from 'react'

interface Contact {
  id: string
  name: string
  email: string
  createdAt: string
}

function ContactsSection() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [newName, setNewName] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/contacts')
      if (res.ok) {
        const data = await res.json()
        setContacts(data.contacts ?? [])
      }
    } catch { /* silent */ }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const handleAdd = async () => {
    if (!newName.trim() || !newEmail.trim()) {
      setError('Both name and email are required.')
      return
    }
    // Basic email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail.trim())) {
      setError('Please enter a valid email address.')
      return
    }
    setError(null)
    setSaving(true)
    try {
      const res = await fetch('/api/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim(), email: newEmail.trim() }),
      })
      if (res.ok) {
        const data = await res.json()
        setContacts(data.contacts)
        setNewName('')
        setNewEmail('')
        setShowAdd(false)
      }
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    setDeletingId(id)
    try {
      const res = await fetch('/api/contacts', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contactId: id }),
      })
      if (res.ok) {
        const data = await res.json()
        setContacts(data.contacts)
      }
    } finally {
      setDeletingId(null)
    }
  }

  const handleCopy = (contact: Contact) => {
    navigator.clipboard.writeText(contact.email)
    setCopiedId(contact.id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const initials = (name: string) =>
    name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()

  const avatarColor = (name: string) => {
    const colors = ['#6366f1', '#8b5cf6', '#ec4899', '#06b6d4', '#10b981', '#f59e0b', '#ef4444']
    const idx = name.charCodeAt(0) % colors.length
    return colors[idx]
  }

  return (
    <section>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <h3 style={{ fontSize: 18, fontWeight: 600 }}>Saved Contacts</h3>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>
            Save frequently used emails so the AI can find them by name.
          </p>
        </div>
        <button
          className="btn-brand"
          onClick={() => { setShowAdd(!showAdd); setError(null) }}
          style={{ fontSize: 13, padding: '8px 16px', flexShrink: 0 }}
        >
          {showAdd ? '✕ Cancel' : '+ Add Contact'}
        </button>
      </div>

      {/* Add Form */}
      {showAdd && (
        <div className="glass animate-fade-up" style={{
          padding: 20, borderRadius: 14, marginBottom: 16,
          border: '1px solid rgba(99,102,241,0.25)',
        }}>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: error ? 10 : 0 }}>
            <div style={{ flex: '1 1 180px' }}>
              <label style={{ fontSize: 11, color: 'var(--text-subtle)', display: 'block', marginBottom: 4 }}>
                Full Name
              </label>
              <input
                placeholder="e.g. Sarah Reyes"
                value={newName}
                onChange={e => { setNewName(e.target.value); setError(null) }}
                onKeyDown={e => e.key === 'Enter' && handleAdd()}
                style={{
                  width: '100%', padding: '9px 12px', borderRadius: 8, fontSize: 14,
                  background: 'var(--surface)', border: '1px solid var(--border)',
                  color: 'var(--text)', outline: 'none',
                }}
              />
            </div>
            <div style={{ flex: '2 1 240px' }}>
              <label style={{ fontSize: 11, color: 'var(--text-subtle)', display: 'block', marginBottom: 4 }}>
                Email Address
              </label>
              <input
                type="email"
                placeholder="e.g. sarah@company.com"
                value={newEmail}
                onChange={e => { setNewEmail(e.target.value); setError(null) }}
                onKeyDown={e => e.key === 'Enter' && handleAdd()}
                style={{
                  width: '100%', padding: '9px 12px', borderRadius: 8, fontSize: 14,
                  background: 'var(--surface)', border: '1px solid var(--border)',
                  color: 'var(--text)', outline: 'none',
                }}
              />
            </div>
            <button
              className="btn-brand"
              onClick={handleAdd}
              disabled={saving}
              style={{ fontSize: 13, padding: '9px 20px', alignSelf: 'flex-end', flexShrink: 0 }}
            >
              {saving ? '⏳ Saving…' : 'Save'}
            </button>
          </div>
          {error && (
            <p style={{ fontSize: 12, color: '#f87171', marginTop: 8 }}>⚠️ {error}</p>
          )}
        </div>
      )}

      {/* Contacts List */}
      <div className="glass" style={{ borderRadius: 14, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 32, textAlign: 'center' }}>
            <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginBottom: 10 }}>
              <div className="typing-dot" style={{ width: 8, height: 8 }} />
              <div className="typing-dot" style={{ width: 8, height: 8 }} />
              <div className="typing-dot" style={{ width: 8, height: 8 }} />
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Loading contacts…</p>
          </div>
        ) : contacts.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center' }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>👤</div>
            <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 4 }}>No contacts saved yet</p>
            <p style={{ color: 'var(--text-subtle)', fontSize: 12 }}>
              Add contacts to email them by name — e.g. &ldquo;Email Sarah about the report&rdquo;
            </p>
          </div>
        ) : (
          <div>
            {/* Table Header */}
            <div style={{
              display: 'grid', gridTemplateColumns: '40px 1fr 1fr auto',
              padding: '10px 16px', gap: 12,
              borderBottom: '1px solid var(--border)',
              fontSize: 11, fontWeight: 700, color: 'var(--text-subtle)',
              textTransform: 'uppercase', letterSpacing: '0.05em',
            }}>
              <span />
              <span>Name</span>
              <span>Email</span>
              <span>Actions</span>
            </div>

            {contacts.map((contact, i) => (
              <div
                key={contact.id}
                className="animate-fade-up"
                style={{
                  display: 'grid', gridTemplateColumns: '40px 1fr 1fr auto',
                  padding: '12px 16px', gap: 12, alignItems: 'center',
                  borderBottom: i < contacts.length - 1 ? '1px solid var(--border)' : 'none',
                  transition: 'background 0.15s',
                  animationDelay: `${i * 0.04}s`,
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(99,102,241,0.05)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                {/* Avatar */}
                <div style={{
                  width: 36, height: 36, borderRadius: 10,
                  background: avatarColor(contact.name),
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 13, fontWeight: 700, color: '#fff', flexShrink: 0,
                }}>
                  {initials(contact.name)}
                </div>

                {/* Name */}
                <div>
                  <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{contact.name}</p>
                  <p style={{ fontSize: 11, color: 'var(--text-subtle)', marginTop: 1 }}>
                    Added {new Date(contact.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                </div>

                {/* Email */}
                <p style={{
                  fontSize: 13, color: 'var(--text-muted)',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {contact.email}
                </p>

                {/* Actions */}
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  {/* Copy email */}
                  <button
                    onClick={() => handleCopy(contact)}
                    title="Copy email address"
                    style={{
                      width: 32, height: 32, borderRadius: 8, border: 'none', cursor: 'pointer',
                      background: copiedId === contact.id ? 'rgba(52,211,153,0.15)' : 'var(--surface-3)',
                      color: copiedId === contact.id ? '#34d399' : 'var(--text-muted)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 14, transition: 'all 0.15s',
                    }}
                  >
                    {copiedId === contact.id ? '✓' : '📋'}
                  </button>

                  {/* Quick email via chat */}
                  <button
                    onClick={() => {
                      window.dispatchEvent(new CustomEvent('switch-tab', { detail: { tab: 'chat' } }))
                      setTimeout(() => {
                        window.dispatchEvent(new CustomEvent('set-chat-input', {
                          detail: { text: `Send an email to ${contact.name} (${contact.email}) about ` }
                        }))
                      }, 150)
                    }}
                    title="Email this contact"
                    style={{
                      width: 32, height: 32, borderRadius: 8, border: 'none', cursor: 'pointer',
                      background: 'var(--surface-3)', color: 'var(--text-muted)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 14, transition: 'all 0.15s',
                    }}
                    onMouseEnter={e => { (e.currentTarget.style.background = 'rgba(99,102,241,0.15)'); (e.currentTarget.style.color = 'var(--brand-light)') }}
                    onMouseLeave={e => { (e.currentTarget.style.background = 'var(--surface-3)'); (e.currentTarget.style.color = 'var(--text-muted)') }}
                  >
                    ✉️
                  </button>

                  {/* Delete */}
                  <button
                    onClick={() => handleDelete(contact.id)}
                    disabled={deletingId === contact.id}
                    title="Remove contact"
                    style={{
                      width: 32, height: 32, borderRadius: 8, border: 'none', cursor: 'pointer',
                      background: 'var(--surface-3)', color: 'var(--text-subtle)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 14, transition: 'all 0.15s',
                      opacity: deletingId === contact.id ? 0.5 : 1,
                    }}
                    onMouseEnter={e => { (e.currentTarget.style.background = 'rgba(248,113,113,0.12)'); (e.currentTarget.style.color = '#f87171') }}
                    onMouseLeave={e => { (e.currentTarget.style.background = 'var(--surface-3)'); (e.currentTarget.style.color = 'var(--text-subtle)') }}
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}

            {/* Footer count */}
            <div style={{
              padding: '10px 16px', borderTop: '1px solid var(--border)',
              fontSize: 11, color: 'var(--text-subtle)', textAlign: 'right',
            }}>
              {contacts.length} contact{contacts.length !== 1 ? 's' : ''} saved
            </div>
          </div>
        )}
      </div>
    </section>
  )
}

export default function SettingsPanel() {
  const [meetingPref, setMeetingPref] = useState('Google Meet')
  const [timezone, setTimezone] = useState('Asia/Manila')

  useEffect(() => {
    const pref = localStorage.getItem('executive_vai_meeting_pref')
    if (pref) setMeetingPref(pref)
    
    const tz = localStorage.getItem('executive_vai_timezone')
    if (tz) setTimezone(tz)
    else {
      try {
        const detected = Intl.DateTimeFormat().resolvedOptions().timeZone
        if (detected) setTimezone(detected)
      } catch {}
    }
  }, [])

  const handlePrefChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setMeetingPref(e.target.value)
    localStorage.setItem('executive_vai_meeting_pref', e.target.value)
  }

  const handleTzChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setTimezone(e.target.value)
    localStorage.setItem('executive_vai_timezone', e.target.value)
  }

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }} className="container-padding">
      <header style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>Settings</h2>
        <p style={{ color: 'var(--text-muted)' }}>Manage your personal AI assistant and integrations.</p>
      </header>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>

        {/* Contacts Section */}
        <ContactsSection />

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
                <option defaultValue="30">30 minutes</option>
                <option>45 minutes</option>
                <option>60 minutes</option>
              </select>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ fontWeight: 500 }}>Default Meeting Platform</p>
                <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>What the AI will use to schedule if you don't specify.</p>
              </div>
              <select 
                value={meetingPref}
                onChange={handlePrefChange}
                className="glass" 
                style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface-3)', outline: 'none' }}
              >
                <option value="Google Meet">Google Meet</option>
                <option value="Zoom">Zoom</option>
                <option value="Ask me every time">Ask me every time</option>
              </select>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ fontWeight: 500 }}>Timezone</p>
                <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Local time context for scheduling.</p>
              </div>
              <select 
                value={timezone}
                onChange={handleTzChange}
                className="glass" 
                style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface-3)', outline: 'none' }}
              >
                <optgroup label="Popular">
                  <option value="Asia/Manila">Asia/Manila (Philippines)</option>
                  <option value="America/New_York">America/New_York (EST)</option>
                  <option value="America/Chicago">America/Chicago (CST)</option>
                  <option value="America/Denver">America/Denver (MST)</option>
                  <option value="America/Los_Angeles">America/Los_Angeles (PST)</option>
                  <option value="Europe/London">Europe/London (GMT)</option>
                </optgroup>
                <optgroup label="Other Regions">
                  <option value="Europe/Paris">Europe/Paris (CET)</option>
                  <option value="Asia/Tokyo">Asia/Tokyo (JST)</option>
                  <option value="Asia/Singapore">Asia/Singapore (SGT)</option>
                  <option value="Australia/Sydney">Australia/Sydney (AEST)</option>
                  <option value="Pacific/Auckland">Pacific/Auckland (NZDT)</option>
                </optgroup>
              </select>
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
