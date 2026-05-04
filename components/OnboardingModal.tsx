'use client'

import { useState, useEffect } from 'react'
import { useTheme } from '@/components/ThemeProvider'


export default function OnboardingModal() {
  const [isOpen, setIsOpen] = useState(false)
  const { theme, setTheme } = useTheme()
  const [meetingPref, setMeetingPref] = useState('Google Meet')
  const [timezone, setTimezone] = useState('Asia/Manila')

  useEffect(() => {
    const onboarded = localStorage.getItem('executive_vai_onboarded')
    if (!onboarded) {
      setIsOpen(true)
    }
    const pref = localStorage.getItem('executive_vai_meeting_pref')
    if (pref) setMeetingPref(pref)
    
    const savedTz = localStorage.getItem('executive_vai_timezone')
    if (savedTz) {
      setTimezone(savedTz)
    } else {
      // Auto-detect if available, but default to Asia/Manila if not set
      try {
        const detected = Intl.DateTimeFormat().resolvedOptions().timeZone
        if (detected) setTimezone(detected)
      } catch {}
    }
  }, [])

  if (!isOpen) return null

  const handleFinish = () => {
    localStorage.setItem('executive_vai_onboarded', 'true')
    localStorage.setItem('executive_vai_meeting_pref', meetingPref)
    localStorage.setItem('executive_vai_timezone', timezone)
    setIsOpen(false)
  }

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: theme === 'dark' ? 'rgba(0,0,0,0.85)' : 'rgba(0,0,0,0.6)', zIndex: 9999,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      backdropFilter: 'blur(16px)', padding: 16
    }}>
      <div className="animate-fade-up" style={{
        background: theme === 'dark' ? 'rgba(15, 15, 25, 0.98)' : 'rgba(255, 255, 255, 1)',
        border: '1px solid var(--border)',
        borderRadius: 32, padding: '48px 40px', width: '100%', maxWidth: 460,
        boxShadow: theme === 'dark' ? '0 40px 100px rgba(0,0,0,0.6)' : '0 40px 100px rgba(0,0,0,0.1)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Abstract Background Decoration */}
        <div style={{
          position: 'absolute', top: -80, right: -80, width: 240, height: 240,
          background: 'radial-gradient(circle, rgba(79,70,229,0.1) 0%, transparent 70%)',
          zIndex: 0
        }} />

        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
            <div style={{ 
              width: 88, height: 88, borderRadius: 24, 
              boxShadow: '0 12px 40px var(--brand-glow)',
              overflow: 'hidden',
              background: '#0a0a0f' // Matches logo background
            }}>
              <img src="/logo.png" alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
          </div>
          
          <h2 style={{ fontSize: 28, fontWeight: 900, textAlign: 'center', marginBottom: 12, letterSpacing: '-0.04em' }}>
            Welcome to <span className="gradient-text">ExecutiveVAi</span>
          </h2>
          <p style={{ color: 'var(--text-muted)', textAlign: 'center', marginBottom: 40, fontSize: 16, lineHeight: 1.5, fontWeight: 500 }}>
            Your personal AI Chief of Staff. <br/>Let&apos;s personalize your workspace.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
            {/* Theme Preference */}
            <div>
              <h3 style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-subtle)', marginBottom: 16 }}>Appearance</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {[
                  { id: 'dark', icon: '🌙', label: 'Dark' },
                  { id: 'light', icon: '☀️', label: 'Light' }
                ].map((opt) => (
                  <button 
                    key={opt.id}
                    onClick={() => setTheme(opt.id as any)}
                    style={{
                      padding: '16px', borderRadius: 16, cursor: 'pointer',
                      background: theme === opt.id ? 'var(--brand-glow)' : 'var(--surface-2)',
                      border: theme === opt.id ? '2px solid var(--brand)' : '2px solid transparent',
                      color: theme === opt.id ? 'var(--brand)' : 'var(--text)', 
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      fontWeight: 700, fontSize: 14,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                      boxShadow: theme === opt.id ? '0 4px 12px var(--brand-glow)' : 'none'
                    }}
                  >
                    <span style={{ fontSize: 18 }}>{opt.icon}</span> {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Meeting Preference */}
            <div>
              <h3 style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-subtle)', marginBottom: 16 }}>Meeting Platform</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {['Google Meet', 'Zoom', 'Ask me every time'].map((platform) => (
                  <label key={platform} style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '14px 20px',
                    background: meetingPref === platform ? 'var(--brand-glow)' : 'var(--surface-2)',
                    borderRadius: 16, cursor: 'pointer',
                    border: meetingPref === platform ? '1px solid var(--brand)' : '1px solid transparent',
                    transition: 'all 0.2s ease',
                  }}>
                    <div style={{
                      width: 20, height: 20, borderRadius: '50%', 
                      border: meetingPref === platform ? '6px solid var(--brand)' : '2px solid var(--border)',
                      background: '#fff',
                      transition: 'all 0.2s ease'
                    }} />
                    <input 
                      type="radio" 
                      name="meetingPref" 
                      value={platform}
                      checked={meetingPref === platform}
                      onChange={(e) => setMeetingPref(e.target.value)}
                      style={{ display: 'none' }}
                    />
                    <span style={{ fontSize: 15, fontWeight: 600, color: meetingPref === platform ? 'var(--brand)' : 'var(--text)' }}>{platform}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Timezone Preference */}
            <div>
              <h3 style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-subtle)', marginBottom: 16 }}>Regional Timezone</h3>
              <div style={{ position: 'relative' }}>
                <select 
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  style={{
                    width: '100%', padding: '16px 20px', borderRadius: 16, fontSize: 15,
                    background: 'var(--surface-2)', border: '1px solid var(--border)',
                    color: 'var(--text)', outline: 'none', cursor: 'pointer',
                    appearance: 'none', fontWeight: 600
                  }}
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
                <div style={{ position: 'absolute', right: 20, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', opacity: 0.5, fontSize: 12 }}>
                  ▼
                </div>
              </div>
            </div>
          </div>

          <div style={{ marginTop: 48 }}>
            <button 
              onClick={handleFinish} 
              className="btn-brand" 
              style={{ 
                width: '100%', padding: '18px', fontSize: 16, fontWeight: 800, 
                borderRadius: 20, boxShadow: '0 12px 32px var(--brand-glow)',
                letterSpacing: '-0.01em'
              }}
            >
              Start Your Day →
            </button>
            <p style={{ fontSize: 12, color: 'var(--text-subtle)', textAlign: 'center', marginTop: 24, fontWeight: 600 }}>
              Settings can be adjusted later.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
