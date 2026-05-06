'use client'

import { useState, useEffect } from 'react'

export interface UserPreferences {
  proactiveBriefing: boolean
  autoDraftEmail: boolean
  aiConfidenceThreshold: number
  showAuditTrail: boolean
  timezone: string
}

interface Props {
  onClose: () => void
  onSave: (prefs: UserPreferences) => void
}

export default function SettingsModal({ onClose, onSave }: Props) {
  const [prefs, setPrefs] = useState<UserPreferences>({
    proactiveBriefing: true,
    autoDraftEmail: true,
    aiConfidenceThreshold: 85,
    showAuditTrail: false,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
  })

  useEffect(() => {
    const saved = localStorage.getItem('executive_prefs')
    if (saved) setPrefs(JSON.parse(saved))
  }, [])

  const handleSave = () => {
    localStorage.setItem('executive_prefs', JSON.stringify(prefs))
    onSave(prefs)
    onClose()
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 10000,
      background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(10px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20
    }}>
      <div className="glass animate-scale-in" style={{
        width: '100%', maxWidth: 500, background: 'var(--surface)',
        borderRadius: 28, border: '1px solid var(--border)',
        overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)'
      }}>
        <div style={{ padding: '24px 32px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: 20, fontWeight: 800 }}>Executive Preferences</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text)', cursor: 'pointer', fontSize: 20 }}>✕</button>
        </div>

        <div style={{ 
          padding: 32, 
          display: 'flex', 
          flexDirection: 'column', 
          gap: 24,
          maxHeight: '60vh',
          overflowY: 'auto'
        }}>
          {/* Proactive Intelligence */}
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, color: 'var(--brand-light)' }}>🧠 PROACTIVE INTELLIGENCE</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
                <span style={{ fontSize: 14 }}>Show Daily Briefing on Login</span>
                <input type="checkbox" checked={prefs.proactiveBriefing} onChange={e => setPrefs({...prefs, proactiveBriefing: e.target.checked})} style={{ width: 18, height: 18, accentColor: 'var(--brand)' }} />
              </label>
              <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
                <span style={{ fontSize: 14 }}>Auto-Draft Smart Replies</span>
                <input type="checkbox" checked={prefs.autoDraftEmail} onChange={e => setPrefs({...prefs, autoDraftEmail: e.target.checked})} style={{ width: 18, height: 18, accentColor: 'var(--brand)' }} />
              </label>
            </div>
          </div>

          {/* AI Safety */}
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, color: '#ef4444' }}>🛡️ AI SAFETY & TRUST</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: 13 }}>AI Confidence Threshold</span>
                  <span style={{ fontSize: 13, fontWeight: 800, color: '#ef4444' }}>{prefs.aiConfidenceThreshold}%</span>
                </div>
                <input type="range" min="50" max="99" value={prefs.aiConfidenceThreshold} onChange={e => setPrefs({...prefs, aiConfidenceThreshold: parseInt(e.target.value)})} style={{ width: '100%', accentColor: '#ef4444' }} />
                <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}>AI will ask for confirmation if confidence is below this level.</p>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
                <span style={{ fontSize: 14 }}>Enable Immutable Audit Trail</span>
                <input type="checkbox" checked={prefs.showAuditTrail} onChange={e => setPrefs({...prefs, showAuditTrail: e.target.checked})} style={{ width: 18, height: 18, accentColor: '#ef4444' }} />
              </label>
            </div>
          </div>
        </div>

        <div style={{ padding: '24px 32px', background: 'rgba(0,0,0,0.1)', display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
          <button onClick={onClose} style={{ padding: '10px 20px', borderRadius: 12, background: 'rgba(255,255,255,0.05)', border: 'none', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
          <button onClick={handleSave} style={{ padding: '10px 24px', borderRadius: 12, background: 'var(--brand)', border: 'none', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>Save Protocol</button>
        </div>
      </div>
    </div>
  )
}
