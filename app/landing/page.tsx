'use client'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { useTheme } from '@/components/ThemeProvider'

const FEATURES = [
  { icon: '📅', title: 'Smart Scheduling', desc: 'Create events, find free slots, and manage your calendar using natural conversation.' },
  { icon: '📧', title: 'Email Intelligence', desc: 'Triage your inbox, summarize threads, and draft replies — all powered by AI.' },
  { icon: '💰', title: 'Budget Tracker', desc: 'Log expenses in plain English and get instant spending insights.' },
  { icon: '🤖', title: 'AI Chief of Staff', desc: 'One chat interface to manage your entire professional life.' },
  { icon: '🔒', title: 'Private & Secure', desc: 'Your data stays yours. We only access what you explicitly allow.' },
]

const STEPS = [
  { num: '01', title: 'Connect Your Calendar', desc: 'Link your Google Calendar with one click. Setup takes under 30 seconds.' },
  { num: '02', title: 'Chat Naturally', desc: '"Schedule lunch with Sarah tomorrow at 1 PM" — ExecutiveVAi understands you.' },
  { num: '03', title: 'AI Handles Everything', desc: 'Events created, emails sent, budgets tracked — all automatically.' },
]

const CHAT_DEMO = [
  { role: 'user', text: 'Move my budget meeting to tomorrow' },
  { role: 'ai', text: "Done! I've moved your Budget Planning to Thursday at 1 PM. Should I notify the attendees?" },
  { role: 'user', text: 'Yes, and block 2 hours for deep work after' },
  { role: 'ai', text: "✅ Notifications sent! I've also blocked 3:00–5:00 PM for Deep Work. Your afternoon is protected." },
]



export default function LandingPage() {
  const router = useRouter()
  const [visibleMessages, setVisibleMessages] = useState(0)
  const { theme, toggleTheme } = useTheme()

  useEffect(() => {
    if (visibleMessages < CHAT_DEMO.length) {
      const timer = setTimeout(() => setVisibleMessages(v => v + 1), 1200)
      return () => clearTimeout(timer)
    }
  }, [visibleMessages])

  return (
    <div style={{ background: 'var(--bg)', color: 'var(--text)', minHeight: '100vh' }}>

      {/* ═══ Navigation ═══ */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
        backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
        background: theme === 'dark' ? 'rgba(10,10,20,0.7)' : 'rgba(248,249,252,0.85)', borderBottom: '1px solid var(--border)',
      }}>
        <div style={{
          maxWidth: 1200, margin: '0 auto', padding: '0 16px',
          height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 38, height: 38, borderRadius: 10,
              boxShadow: '0 4px 12px var(--brand-glow)',
              overflow: 'hidden',
              background: '#0a0a0f'
            }}>
              <img src="/logo.png" alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
            <span style={{ fontWeight: 900, fontSize: 20, letterSpacing: '-0.04em' }}>
              Executive<span style={{ color: 'var(--brand)' }}>VAi</span>
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <a href="#features" className="hidden-mobile" style={{ color: 'var(--text-muted)', fontSize: 14, textDecoration: 'none', fontWeight: 600 }}>Features</a>
            <button
              onClick={toggleTheme}
              style={{
                width: 38, height: 38, borderRadius: 12, border: '1px solid var(--border)',
                background: 'var(--surface-2)', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 16, transition: 'all 0.2s',
              }}
              title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            >
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>
            <button
              onClick={() => router.push('/login')}
              className="btn-brand"
              style={{ fontSize: 14, padding: '10px 20px', fontWeight: 700, borderRadius: 12 }}
            >
              Get Started
            </button>
          </div>
        </div>
      </nav>

      {/* ═══ Hero Section ═══ */}
      <section style={{
        paddingTop: 160, paddingBottom: 100,
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Background Gradients */}
        <div style={{ position: 'absolute', top: -200, right: -200, width: 600, height: 600, background: 'radial-gradient(circle, var(--brand-glow) 0%, transparent 70%)', zIndex: -1 }} />
        <div style={{ position: 'absolute', bottom: -200, left: -200, width: 600, height: 600, background: 'radial-gradient(circle, rgba(96,165,250,0.05) 0%, transparent 70%)', zIndex: -1 }} />

        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px', display: 'flex', alignItems: 'center', gap: 60, flexWrap: 'wrap' }}>
          {/* Left — Copy */}
          <div style={{ flex: '1 1 500px', textAlign: 'left' }} className="hero-copy">
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'var(--brand-glow)', border: '1px solid var(--brand)', borderRadius: 100, padding: '8px 20px', fontSize: 13, color: 'var(--brand)', marginBottom: 32, fontWeight: 700 }}>
              <span style={{ fontSize: 14 }}>✨</span> AI Chief of Staff
            </div>
            <h1 style={{ fontSize: 'clamp(44px, 8vw, 72px)', fontWeight: 1000, lineHeight: 0.95, letterSpacing: '-0.05em', marginBottom: 28 }}>
              Precision scheduling<br />
              <span className="gradient-text">for leaders.</span>
            </h1>
            <p style={{ fontSize: 20, color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: 44, maxWidth: 540, fontWeight: 500 }}>
              Reclaim 10+ hours a week. ExecutiveVAi handles your calendar, emails, and deep work blocks with autonomous intelligence.
            </p>
            <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
              <button
                onClick={() => router.push('/login')}
                className="btn-brand"
                style={{ fontSize: 16, padding: '14px 32px', borderRadius: 14, fontWeight: 700 }}
              >
                Get Started Free →
              </button>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} style={{ 
                      width: 36, height: 36, borderRadius: '50%', 
                      border: '3px solid var(--bg)', 
                      background: `linear-gradient(135deg, hsl(${210 + i * 15}, 80%, 60%), hsl(${240 + i * 15}, 80%, 40%))`, 
                      marginLeft: i > 1 ? -14 : 0,
                      boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 14
                    }}>
                      {['👤', '👨‍💼', '👩‍💼', '🚀'][i - 1]}
                    </div>
                  ))}
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-subtle)', fontWeight: 600, lineHeight: 1.4 }}>
                  Built for the <span style={{ color: 'var(--brand)', fontWeight: 800 }}>AI Hackathon</span> to<br/>
                  automate the modern executive's daily grind.
                </div>
              </div>
            </div>
          </div>

          {/* Right — Chat Demo */}
          <div style={{ flex: '1 1 400px', width: '100%' }}>
            <div className="glass" style={{
              padding: 24, borderRadius: 28, maxWidth: 460, margin: '0 auto',
              boxShadow: '0 30px 80px rgba(0,0,0,0.3)',
              border: '1px solid rgba(255,255,255,0.1)',
              background: theme === 'dark' ? 'rgba(20,20,30,0.6)' : 'rgba(255,255,255,0.8)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, paddingBottom: 16, borderBottom: '1px solid var(--border)' }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg, #6366f1, #4f46e5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <img src="/logo.png" alt="Logo" style={{ width: 24, height: 24, objectFit: 'contain' }} />
                </div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 15, letterSpacing: '-0.02em' }}>ExecutiveVAi</div>
                  <div style={{ fontSize: 11, color: '#10b981', display: 'flex', alignItems: 'center', gap: 4, fontWeight: 600 }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981' }} /> AI Online
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, minHeight: 220 }}>
                {CHAT_DEMO.slice(0, visibleMessages).map((msg, i) => (
                  <div key={i} className="animate-fade-up" style={{
                    alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                    maxWidth: '85%', padding: '10px 16px',
                    borderRadius: msg.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                    background: msg.role === 'user' ? 'linear-gradient(135deg, #6366f1, #4f46e5)' : 'var(--surface-2)',
                    fontSize: 14, color: msg.role === 'user' ? '#fff' : 'var(--text)',
                    boxShadow: msg.role === 'user' ? '0 4px 12px rgba(99,102,241,0.2)' : 'none',
                    lineHeight: 1.5, fontWeight: 500
                  }}>
                    {msg.text}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ Features Grid ═══ */}
      <section id="features" style={{ padding: '80px 16px', maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 50 }}>
          <h2 style={{ fontSize: 'clamp(32px, 5vw, 48px)', fontWeight: 900, marginBottom: 16, letterSpacing: '-0.03em' }}>
            One conversation <span className="gradient-text">away.</span>
          </h2>
          <p style={{ fontSize: 16, color: 'var(--text-muted)', maxWidth: 600, margin: '0 auto' }}>
            Powerful features designed to simplify your workflow and maximize your output.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24 }}>
          {FEATURES.map((f, i) => (
            <div key={i} className="glass" style={{
              padding: 32, borderRadius: 24, transition: 'transform 0.3s ease',
              border: '1px solid var(--border)',
              cursor: 'default'
            }}>
              <div style={{
                width: 56, height: 56, borderRadius: 16,
                background: 'rgba(99,102,241,0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 28, marginBottom: 20
              }}>
                {f.icon}
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 10 }}>{f.title}</h3>
              <p style={{ fontSize: 15, color: 'var(--text-muted)', lineHeight: 1.6 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ═══ CTA Section ═══ */}
      <section style={{ padding: '80px 16px', textAlign: 'center' }}>
        <div style={{
          maxWidth: 800, margin: '0 auto', padding: '60px 40px', borderRadius: 32,
          background: 'linear-gradient(135deg, var(--brand-glow) 0%, rgba(79,70,229,0.05) 100%)',
          border: '1px solid var(--brand)',
          position: 'relative', overflow: 'hidden'
        }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
            <div style={{
              width: 48, height: 48, borderRadius: 12,
              boxShadow: '0 8px 24px var(--brand-glow)',
              overflow: 'hidden',
              background: '#0a0a0f'
            }}>
              <img src="/logo.png" alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
          </div>
          <h2 style={{ fontSize: 'clamp(28px, 5vw, 40px)', fontWeight: 900, marginBottom: 16, letterSpacing: '-0.04em' }}>
            Ready to reclaim your time?
          </h2>
          <p style={{ fontSize: 18, color: 'var(--text-muted)', marginBottom: 32, maxWidth: 500, margin: '0 auto 32px', fontWeight: 500 }}>
            Join 2,000+ high-performers who use ExecutiveVAi to automate their daily grind.
          </p>
          <button
            onClick={() => router.push('/login')}
            className="btn-brand"
            style={{ fontSize: 16, padding: '14px 40px', borderRadius: 14, fontWeight: 700 }}
          >
            Start Your Free Trial →
          </button>
        </div>
      </section>

      {/* ═══ Footer ═══ */}
      <footer style={{
        borderTop: '1px solid var(--border)', padding: '48px 16px',
        maxWidth: 1200, margin: '0 auto',
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              boxShadow: '0 4px 12px var(--brand-glow)',
              overflow: 'hidden',
              background: '#0a0a0f'
            }}>
              <img src="/logo.png" alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
            <span style={{ fontWeight: 900, fontSize: 18, letterSpacing: '-0.03em' }}>
              Executive<span style={{ color: 'var(--brand)' }}>VAi</span>
            </span>
          </div>
          <p style={{ color: 'var(--text-subtle)', fontSize: 13, fontWeight: 500 }}>
            © {new Date().getFullYear()} ExecutiveVAi. Built for leaders.
          </p>
        </div>
      </footer>
    </div>
  )
}
