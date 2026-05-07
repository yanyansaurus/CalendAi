'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'

export default function WelcomeGuide() {
  const [isOpen, setIsOpen] = useState(false)
  const [step, setStep] = useState(0)
  const { data: session } = useSession()

  useEffect(() => {
    if (session?.user?.email) {
      const guideKey = `executive_vai_guide_seen_${session.user.email}`
      const seen = localStorage.getItem(guideKey)
      if (!seen) {
        const timer = setTimeout(() => setIsOpen(true), 1500)
        return () => clearTimeout(timer)
      }
    }
  }, [session])

  const finishGuide = () => {
    if (session?.user?.email) {
      const guideKey = `executive_vai_guide_seen_${session.user.email}`
      localStorage.setItem(guideKey, 'true')
    }
    setIsOpen(false)
  }

  const steps = [
    {
      title: "Welcome to ExecutiveVAi",
      content: "Your all-in-one AI command center is ready. We've built this to handle the heavy lifting so you can focus on what matters most.",
      icon: "🚀"
    },
    {
      title: "The Lightning Chat",
      content: "Click the ⚡ lightning icon in the chat box to see quick actions. You can ask the AI to schedule meetings, draft emails, or even analyze your spending using natural language.",
      icon: "⚡"
    },
    {
      title: "Smart Calendar & Routine Architect",
      content: "Your schedule is now interactive. View your week in the Planner tab, and use 'Analyze Week' to get a productivity score. The AI will suggest focus blocks and identify time-wasters automatically.",
      icon: "📅"
    },
    {
      title: "Intelligent Email Gateway",
      content: "Stop scrolling through endless threads. Our AI triages your inbox into 'Needs Attention' and 'Can Wait'. You can even mark emails as read directly from the dashboard or clear everything with a single click.",
      icon: "📧"
    },
    {
      title: "Finance & Receipt Scanning",
      content: "Head to the Finance tab to track your budget. You can even upload receipts—our Gemini Vision AI will extract the data for you to verify and log instantly.",
      icon: "💰"
    },
    {
      title: "Ready to Start?",
      content: "We're excited to have you here. Explore the panels, talk to the AI, and let us handle the rest. Thanks for using the app, I hope you enjoy!",
      icon: "✨"
    }
  ]

  if (!isOpen) return null

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.8)', zIndex: 10000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      backdropFilter: 'blur(12px)', padding: 20
    }}>
      <div className="animate-fade-up glass" style={{
        maxWidth: 550, width: '100%', borderRadius: 32, padding: '48px 40px',
        textAlign: 'center', position: 'relative', overflow: 'hidden',
        border: '1px solid var(--glass-border)',
        boxShadow: '0 40px 100px rgba(0,0,0,0.5)'
      }}>
        {/* Progress Bar */}
        <div style={{
          position: 'absolute', top: 0, left: 0, height: 5,
          width: `${((step + 1) / steps.length) * 100}%`,
          background: 'var(--brand-gradient)', transition: 'width 0.4s ease'
        }} />

        <div style={{ fontSize: 72, marginBottom: 24, filter: 'drop-shadow(0 10px 20px rgba(99,102,241,0.3))' }}>{steps[step].icon}</div>
        
        <h2 style={{ fontSize: 26, fontWeight: 900, marginBottom: 20, letterSpacing: '-0.02em' }}>{steps[step].title}</h2>
        
        <div style={{ 
          maxHeight: 250, overflowY: 'auto', marginBottom: 40, 
          paddingRight: 8, textAlign: 'center', lineHeight: 1.7,
          color: 'var(--text-muted)', fontSize: 16
        }} className="custom-scroll">
          {steps[step].content}
        </div>

        <div style={{ display: 'flex', gap: 16 }}>
          {step > 0 && (
            <button 
              onClick={() => setStep(step - 1)}
              className="btn-ghost"
              style={{ 
                flex: 1, padding: '14px 24px', borderRadius: 16, 
                fontWeight: 600, fontSize: 15
              }}
            >
              Back
            </button>
          )}
          <button 
            onClick={() => step < steps.length - 1 ? setStep(step + 1) : finishGuide()}
            className="btn-brand"
            style={{ 
              flex: 2, padding: '14px 24px', borderRadius: 16, 
              fontWeight: 800, fontSize: 15, border: 'none',
              boxShadow: '0 10px 25px rgba(99,102,241,0.4)'
            }}
          >
            {step < steps.length - 1 ? 'Continue' : 'Get Started ✨'}
          </button>
        </div>

        <div style={{ marginTop: 32, display: 'flex', justifyContent: 'center', gap: 8 }}>
          {steps.map((_, i) => (
            <div key={i} style={{
              width: i === step ? 24 : 8, height: 8, borderRadius: 4,
              background: i === step ? 'var(--brand)' : 'var(--text-subtle)',
              transition: 'all 0.3s ease',
              opacity: i === step ? 1 : 0.4
            }} />
          ))}
        </div>
      </div>
    </div>
  )
}
