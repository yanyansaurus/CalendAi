'use client'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'

const FEATURES = [
  { icon: '📅', title: 'Smart Scheduling', desc: 'Create events, find free slots, and manage your calendar using natural conversation.' },
  { icon: '📧', title: 'Email Intelligence', desc: 'Triage your inbox, summarize threads, and draft replies — all powered by AI.' },
  { icon: '💰', title: 'Budget Tracker', desc: 'Log expenses in plain English and get instant spending insights.' },
  { icon: '📊', title: 'Time Analysis', desc: 'Understand how you spend your week with AI-powered breakdowns.' },
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
        background: 'rgba(10,10,20,0.7)', borderBottom: '1px solid var(--border)',
      }}>
        <div style={{
          maxWidth: 1200, margin: '0 auto', padding: '0 16px',
          height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 16, boxShadow: '0 4px 12px rgba(99,102,241,0.35)',
            }}>🤖</div>
            <span style={{ fontWeight: 800, fontSize: 16, letterSpacing: '-0.02em' }}>
              Executive<span style={{ color: '#818cf8' }}>VAi</span>
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <a href="#features" className="hidden-mobile" style={{ color: 'var(--text-muted)', fontSize: 13, textDecoration: 'none' }}>Features</a>
            <button
              onClick={() => router.push('/login')}
              className="btn-brand"
              style={{ fontSize: 12, padding: '7px 16px' }}
            >
              Get Started
            </button>
          </div>
        </div>
      </nav>

      {/* ═══ Hero Section ═══ */}
      <section style={{
        paddingTop: 120, paddingBottom: 60,
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px', display: 'flex', alignItems: 'center', gap: 40, flexWrap: 'wrap' }}>
          {/* Left — Copy */}
          <div style={{ flex: '1 1 400px', textAlign: 'center', margin: '0 auto' }} className="hero-copy">
            <div style={{ display: 'inline-block', background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.25)', borderRadius: 20, padding: '4px 12px', fontSize: 11, color: '#a5b4fc', marginBottom: 16, fontWeight: 600 }}>
              ✨ Your AI Executive Assistant
            </div>
            <h1 style={{ fontSize: 'clamp(32px, 8vw, 52px)', fontWeight: 800, lineHeight: 1.1, letterSpacing: '-0.03em', marginBottom: 20 }}>
              Smart scheduling<br />
              <span className="gradient-text">reimagined with AI</span>
            </h1>
            <p style={{ fontSize: 16, color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: 32, maxWidth: 500, margin: '0 auto 32px' }}>
              Speak naturally to create events, manage emails, track budgets, and control your entire day.
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap' }}>
              <button
                onClick={() => router.push('/login')}
                className="btn-brand"
                style={{ fontSize: 15, padding: '12px 28px' }}
              >
                Get Started — It&apos;s Free
              </button>
            </div>
          </div>

          {/* Right — Chat Demo (smaller on mobile) */}
          <div style={{ flex: '1 1 300px', width: '100%' }}>
            <div className="glass" style={{
              padding: 20, borderRadius: 20, maxWidth: 420, margin: '0 auto',
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, paddingBottom: 12, borderBottom: '1px solid var(--border)' }}>
                <div style={{ width: 28, height: 28, borderRadius: 7, background: 'linear-gradient(135deg, #6366f1, #4f46e5)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>🤖</div>
                <div style={{ fontWeight: 700, fontSize: 13 }}>ExecutiveVAi</div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, minHeight: 180 }}>
                {CHAT_DEMO.slice(0, visibleMessages).map((msg, i) => (
                  <div key={i} className="animate-fade-up" style={{
                    alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                    maxWidth: '90%', padding: '8px 12px',
                    borderRadius: msg.role === 'user' ? '12px 12px 4px 12px' : '12px 12px 12px 4px',
                    background: msg.role === 'user' ? 'linear-gradient(135deg, #6366f1, #4f46e5)' : 'var(--surface-2)',
                    fontSize: 12, color: msg.role === 'user' ? '#fff' : 'var(--text)',
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
      <section id="features" style={{ padding: '60px 16px', maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <h2 style={{ fontSize: 'clamp(24px, 5vw, 36px)', fontWeight: 800, marginBottom: 12 }}>
            One conversation <span className="gradient-text">away</span>
          </h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
          {FEATURES.map((f, i) => (
            <div key={i} className="glass" style={{ padding: 24, borderRadius: 16 }}>
              <div style={{ fontSize: 24, marginBottom: 12 }}>{f.icon}</div>
              <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>{f.title}</h3>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ═══ CTA Section ═══ */}
      <section style={{ padding: '40px 16px', textAlign: 'center' }}>
        <div style={{
          maxWidth: 700, margin: '0 auto', padding: '40px 24px', borderRadius: 24,
          background: 'linear-gradient(135deg, rgba(99,102,241,0.12), rgba(79,70,229,0.05))',
          border: '1px solid rgba(99,102,241,0.15)',
        }}>
          <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 12 }}>Reclaim your time</h2>
          <button
            onClick={() => router.push('/login')}
            className="btn-brand"
            style={{ fontSize: 15, padding: '12px 32px' }}
          >
            Get Started Free
          </button>
        </div>
      </section>

      {/* ═══ Footer ═══ */}
      <footer style={{
        borderTop: '1px solid var(--border)', padding: '32px 16px',
        maxWidth: 1200, margin: '0 auto', textAlign: 'center',
      }}>
        <p style={{ color: 'var(--text-subtle)', fontSize: 11 }}>
          © {new Date().getFullYear()} ExecutiveVAi. All rights reserved.
        </p>
      </footer>
    </div>
  )
}
