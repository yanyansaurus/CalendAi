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
          maxWidth: 1200, margin: '0 auto', padding: '0 24px',
          height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 18, boxShadow: '0 4px 12px rgba(99,102,241,0.35)',
            }}>🤖</div>
            <span style={{ fontWeight: 800, fontSize: 18, letterSpacing: '-0.02em' }}>
              Executive<span style={{ color: '#818cf8' }}>VAi</span>
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
            <a href="#features" style={{ color: 'var(--text-muted)', fontSize: 14, textDecoration: 'none', transition: 'color 0.2s' }}>Features</a>
            <a href="#how" style={{ color: 'var(--text-muted)', fontSize: 14, textDecoration: 'none' }}>How It Works</a>
            <button
              onClick={() => router.push('/login')}
              className="btn-brand"
              style={{ fontSize: 13, padding: '8px 20px' }}
            >
              Get Started Free
            </button>
          </div>
        </div>
      </nav>

      {/* ═══ Hero Section ═══ */}
      <section style={{
        paddingTop: 140, paddingBottom: 100,
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Glow orbs */}
        <div style={{ position: 'absolute', top: '-15%', left: '-5%', width: 700, height: 700, borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 65%)', filter: 'blur(60px)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '-20%', right: '-10%', width: 600, height: 600, borderRadius: '50%', background: 'radial-gradient(circle, rgba(96,165,250,0.08) 0%, transparent 65%)', filter: 'blur(60px)', pointerEvents: 'none' }} />

        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px', display: 'flex', alignItems: 'center', gap: 60, flexWrap: 'wrap' }}>
          {/* Left — Copy */}
          <div style={{ flex: '1 1 480px', minWidth: 320 }}>
            <div style={{ display: 'inline-block', background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.25)', borderRadius: 20, padding: '4px 14px', fontSize: 12, color: '#a5b4fc', marginBottom: 20, fontWeight: 600 }}>
              ✨ Your AI Executive Assistant
            </div>
            <h1 style={{ fontSize: 52, fontWeight: 800, lineHeight: 1.1, letterSpacing: '-0.03em', marginBottom: 20 }}>
              Smart scheduling<br />
              <span className="gradient-text">reimagined with AI</span>
            </h1>
            <p style={{ fontSize: 18, color: 'var(--text-muted)', lineHeight: 1.7, marginBottom: 36, maxWidth: 500 }}>
              Speak naturally to create events, manage emails, track budgets, and control your entire day — or let your AI Chief of Staff handle it for you.
            </p>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
              <button
                onClick={() => router.push('/login')}
                className="btn-brand"
                style={{ fontSize: 16, padding: '14px 32px', boxShadow: '0 8px 32px rgba(99,102,241,0.4)' }}
              >
                Get Started — It&apos;s Free
              </button>
              <span style={{ fontSize: 13, color: 'var(--text-subtle)' }}>No credit card required</span>
            </div>
          </div>

          {/* Right — Chat Demo */}
          <div style={{ flex: '1 1 420px', minWidth: 320 }}>
            <div className="glass" style={{
              padding: 24, borderRadius: 20, maxWidth: 460,
              boxShadow: '0 24px 80px rgba(0,0,0,0.4), 0 0 0 1px rgba(99,102,241,0.1)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, paddingBottom: 16, borderBottom: '1px solid var(--border)' }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg, #6366f1, #4f46e5)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>🤖</div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>ExecutiveVAi</div>
                  <div style={{ fontSize: 11, color: 'var(--text-subtle)' }}>Your AI Assistant</div>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, minHeight: 200 }}>
                {CHAT_DEMO.slice(0, visibleMessages).map((msg, i) => (
                  <div
                    key={i}
                    className="animate-fade-up"
                    style={{
                      alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                      maxWidth: '85%',
                      padding: '10px 14px',
                      borderRadius: msg.role === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                      background: msg.role === 'user' ? 'linear-gradient(135deg, #6366f1, #4f46e5)' : 'var(--surface-2)',
                      fontSize: 13, lineHeight: 1.5,
                      color: msg.role === 'user' ? '#fff' : 'var(--text)',
                    }}
                  >
                    {msg.text}
                  </div>
                ))}
                {visibleMessages < CHAT_DEMO.length && (
                  <div style={{ alignSelf: 'flex-start', display: 'flex', gap: 4, padding: '10px 14px' }}>
                    <div className="typing-dot" style={{ width: 6, height: 6 }} />
                    <div className="typing-dot" style={{ width: 6, height: 6 }} />
                    <div className="typing-dot" style={{ width: 6, height: 6 }} />
                  </div>
                )}
              </div>

              <div style={{
                marginTop: 16, padding: '10px 14px', borderRadius: 12,
                background: 'var(--surface)', border: '1px solid var(--border)',
                fontSize: 13, color: 'var(--text-subtle)',
              }}>
                Ask your calendar anything...
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ Features Grid ═══ */}
      <section id="features" style={{ padding: '80px 24px', maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 60 }}>
          <h2 style={{ fontSize: 36, fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 12 }}>
            Everything you need, <span className="gradient-text">one conversation away</span>
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 16, maxWidth: 520, margin: '0 auto' }}>
            ExecutiveVAi combines calendar automation, email intelligence, and budget tracking into a single AI-powered assistant.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
          {FEATURES.map((f, i) => (
            <div key={i} className="glass" style={{
              padding: 28, borderRadius: 16, transition: 'transform 0.2s, box-shadow 0.2s',
              cursor: 'default',
            }}
              onMouseEnter={e => { (e.currentTarget).style.transform = 'translateY(-4px)'; (e.currentTarget).style.boxShadow = '0 16px 48px rgba(99,102,241,0.12)' }}
              onMouseLeave={e => { (e.currentTarget).style.transform = 'translateY(0)'; (e.currentTarget).style.boxShadow = 'none' }}
            >
              <div style={{ fontSize: 28, marginBottom: 14 }}>{f.icon}</div>
              <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>{f.title}</h3>
              <p style={{ fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.6 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ═══ How It Works ═══ */}
      <section id="how" style={{ padding: '80px 24px', maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 60 }}>
          <h2 style={{ fontSize: 36, fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 12 }}>
            Three steps to <span className="gradient-text">automated productivity</span>
          </h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 32 }}>
          {STEPS.map((s, i) => (
            <div key={i} style={{ textAlign: 'center', padding: '0 16px' }}>
              <div style={{
                width: 56, height: 56, borderRadius: 16, margin: '0 auto 20px',
                background: 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(99,102,241,0.05))',
                border: '1px solid rgba(99,102,241,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 20, fontWeight: 800, color: '#818cf8',
              }}>
                {s.num}
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>{s.title}</h3>
              <p style={{ fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.6 }}>{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ═══ CTA Section ═══ */}
      <section style={{ padding: '80px 24px', textAlign: 'center' }}>
        <div style={{
          maxWidth: 700, margin: '0 auto', padding: '60px 40px', borderRadius: 24,
          background: 'linear-gradient(135deg, rgba(99,102,241,0.12), rgba(79,70,229,0.05))',
          border: '1px solid rgba(99,102,241,0.15)',
        }}>
          <h2 style={{ fontSize: 32, fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 12 }}>
            Ready to reclaim your time?
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 16, marginBottom: 32, maxWidth: 450, margin: '0 auto 32px' }}>
            Start using the most intelligent calendar assistant ever built. No waitlist, no delays.
          </p>
          <button
            onClick={() => router.push('/login')}
            className="btn-brand"
            style={{ fontSize: 16, padding: '14px 36px', boxShadow: '0 8px 32px rgba(99,102,241,0.4)' }}
          >
            Get Started — Free Forever
          </button>
          <p style={{ fontSize: 12, color: 'var(--text-subtle)', marginTop: 16 }}>
            Free forever plan available • No credit card required
          </p>
        </div>
      </section>

      {/* ═══ Footer ═══ */}
      <footer style={{
        borderTop: '1px solid var(--border)', padding: '40px 24px',
        maxWidth: 1200, margin: '0 auto',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        flexWrap: 'wrap', gap: 16,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontWeight: 700 }}>Executive<span style={{ color: '#818cf8' }}>VAi</span></span>
          <span style={{ color: 'var(--text-subtle)', fontSize: 12 }}>— Your AI Executive Assistant</span>
        </div>
        <p style={{ color: 'var(--text-subtle)', fontSize: 12 }}>
          © {new Date().getFullYear()} ExecutiveVAi. All rights reserved.
        </p>
      </footer>
    </div>
  )
}
