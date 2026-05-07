'use client'
import { signIn } from 'next-auth/react'
import { useState } from 'react'
import { useTheme } from '@/components/ThemeProvider'
import { IconSun, IconMoon } from '@/components/Icons'



export default function LoginPage() {
  const [loading, setLoading] = useState<'google' | 'zoom' | null>(null)
  const { theme, toggleTheme } = useTheme()

  const handleSignIn = async (provider: 'google' | 'zoom') => {
    setLoading(provider)
    await signIn(provider, { callbackUrl: '/' })
  }

  return (
    <main className="min-h-screen flex items-center justify-center relative overflow-hidden"
          style={{ background: 'var(--bg)' }}>

      {/* Theme toggle */}
      <button
        onClick={toggleTheme}
        style={{
          position: 'absolute', top: 20, right: 20, zIndex: 20,
          width: 40, height: 40, borderRadius: 12, border: '1px solid var(--border)',
          background: 'var(--surface-2)', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 18, transition: 'all 0.2s',
        }}
        title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      >
        {theme === 'dark' ? <IconSun size={16} /> : <IconMoon size={16} />}
      </button>

      {/* Background orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div style={{
          position: 'absolute', top: '-20%', left: '-10%',
          width: 600, height: 600, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)',
          filter: 'blur(40px)',
        }} />
        <div style={{
          position: 'absolute', bottom: '-20%', right: '-10%',
          width: 500, height: 500, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(96,165,250,0.12) 0%, transparent 70%)',
          filter: 'blur(40px)',
        }} />
      </div>

      <div className="relative z-10 flex flex-col items-center gap-8 px-6"
           style={{ maxWidth: 420, width: '100%' }}>

        {/* Logo */}
        <div className="flex flex-col items-center gap-4">
          <div style={{
            width: 88, height: 88, borderRadius: 24,
            boxShadow: '0 12px 40px var(--brand-glow)',
            overflow: 'hidden',
            background: '#0a0a0f',
            padding: 0
          }}>
            <img src="/logo.png" alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
          <div className="text-center">
            <h1 className="gradient-text" style={{ fontSize: 36, fontWeight: 900, letterSpacing: '-0.04em' }}>
              ExecutiveVAi
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: 16, marginTop: 10, fontWeight: 600 }}>
              Your AI Chief of Staff
            </p>
          </div>
        </div>

        {/* Card */}
        <div className="glass w-full" style={{ padding: 32 }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>
            Connect your calendars
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 24, lineHeight: 1.6 }}>
            Sign in with Google to manage your calendar and create Google Meet links.
            Zoom is configured automatically on the server.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* Google */}
            <button
              id="btn-login-google"
              className="btn-brand w-full justify-center"
              onClick={() => handleSignIn('google')}
              disabled={loading !== null}
              style={{ fontSize: 15, padding: '14px 24px' }}
            >
              {loading === 'google' ? (
                <span style={{ opacity: 0.7 }}>Connecting…</span>
              ) : (
                <>
                  <svg width="20" height="20" viewBox="0 0 24 24">
                    <path fill="white" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="rgba(255,255,255,0.8)" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="rgba(255,255,255,0.6)" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="rgba(255,255,255,0.9)" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Sign in with Google
                </>
              )}
            </button>


          </div>

          <p style={{ color: 'var(--text-subtle)', fontSize: 12, marginTop: 20, textAlign: 'center', lineHeight: 1.6 }}>
            Your data stays private. ExecutiveVAi only accesses what you explicitly allow.
          </p>
        </div>

        {/* Feature pills */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
          {['Smart Scheduling', 'AI Assistant', 'Email Intelligence', 'Budget Tracking'].map((f) => (
            <span key={f} style={{
              background: 'var(--surface-2)', border: '1px solid var(--border)',
              borderRadius: 20, padding: '6px 12px', fontSize: 12, color: 'var(--text-muted)',
            }}>
              {f}
            </span>
          ))}
        </div>
      </div>
    </main>
  )
}
