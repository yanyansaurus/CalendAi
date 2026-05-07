'use client'
import { useEffect, useState, useCallback, useRef, ReactNode } from 'react'
import {
  IconTarget, IconArrowDownCircle, IconArrowUpCircle,
  IconPiggyBank, IconCheckCircle, IconAlertTriangle,
  IconDollarSign, IconBarChart
} from '@/components/Icons'

interface Transaction {
  id: string
  amount: number
  category: string
  description: string
  date: string
  type: 'expense' | 'income' | 'savings'
}

interface BudgetData {
  monthlyLimit: number
  currency: string
  expenses: Transaction[]
}

interface ScanItem {
  description: string
  amount: number
  category: string
}

const CURRENCIES = [
  { code: 'PHP', symbol: '₱', name: 'Philippine Peso' },
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
  { code: 'KRW', symbol: '₩', name: 'Korean Won' },
  { code: 'CNY', symbol: '¥', name: 'Chinese Yuan' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
  { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar' },
  { code: 'MYR', symbol: 'RM', name: 'Malaysian Ringgit' },
  { code: 'THB', symbol: '฿', name: 'Thai Baht' },
]

const CATEGORIES = ['Food', 'Transport', 'Utilities', 'Entertainment', 'Shopping', 'Health', 'Education', 'Subscriptions', 'Housing', 'Savings', 'Other']

const CATEGORY_COLORS: Record<string, string> = {
  Food: '#34d399', Transport: '#60a5fa', Utilities: '#fbbf24', Entertainment: '#c084fc',
  Shopping: '#f87171', Health: '#f472b6', Education: '#818cf8', Subscriptions: '#38bdf8',
  Housing: '#fb923c', Savings: '#22d3ee', Other: '#94a3b8',
}

// Category icons removed — using colored dots instead for a clean look

export default function FinanceDashboard() {
  const [data, setData] = useState<BudgetData | null>(null)
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [scanResult, setScanResult] = useState<string | null>(null)
  const [scanPreview, setScanPreview] = useState<ScanItem[] | null>(null)
  const [savingScan, setSavingScan] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  // Form state
  const [formType, setFormType] = useState<'expense' | 'income' | 'savings'>('expense')
  const [formAmount, setFormAmount] = useState('')
  const [formCategory, setFormCategory] = useState('Food')
  const [formDesc, setFormDesc] = useState('')

  const loadBudget = useCallback(async () => {
    try {
      const res = await fetch('/api/budget')
      if (res.ok) {
        const d = await res.json()
        setData(d)
      }
    } catch { /* silent */ }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { loadBudget() }, [loadBudget])

  const addTransaction = async () => {
    if (!formAmount) return
    await fetch('/api/budget', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: parseFloat(formAmount),
        category: formType === 'savings' ? 'Savings' : formCategory,
        description: formDesc || `${formType} - ${formCategory}`,
        type: formType,
      }),
    })
    setFormAmount('')
    setFormDesc('')
    setShowAddForm(false)
    loadBudget()
  }

  // Step 1: Scan receipt — AI extracts items, shows preview
  const handleScanReceipt = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setScanning(true)
    setScanResult(null)
    setScanPreview(null)

    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await fetch('/api/budget/scan', { method: 'POST', body: formData })
      const result = await res.json()

      if (result.success && result.items?.length) {
        setScanPreview(result.items)
        setScanResult(`[INFO] Found ${result.itemsExtracted} items — review below before saving`)
      } else {
        setScanResult(`[ERROR] ${result.error || 'No items found'}`)
      }
    } catch {
      setScanResult('[ERROR] Failed to scan receipt')
    } finally {
      setScanning(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  // Step 2: User edits preview items
  const updatePreviewItem = (index: number, field: keyof ScanItem, value: string | number) => {
    setScanPreview(prev => {
      if (!prev) return prev
      const updated = [...prev]
      updated[index] = { ...updated[index], [field]: value }
      return updated
    })
  }

  const removePreviewItem = (index: number) => {
    setScanPreview(prev => prev ? prev.filter((_, i) => i !== index) : prev)
  }

  // Step 3: Confirm and save
  const confirmScanItems = async () => {
    if (!scanPreview?.length) return
    setSavingScan(true)

    for (const item of scanPreview) {
      await fetch('/api/budget', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: item.amount,
          category: item.category,
          description: item.description,
          type: 'expense',
        }),
      })
    }

    setScanPreview(null)
    setScanResult(`[OK] Saved ${scanPreview.length} items to expenses`)
    setSavingScan(false)
    loadBudget()
  }

  if (loading) {
    return (
      <div style={{ padding: 40, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
        <div style={{ display: 'flex', gap: 6 }}>
          <div className="typing-dot" style={{ width: 10, height: 10 }} />
          <div className="typing-dot" style={{ width: 10, height: 10 }} />
          <div className="typing-dot" style={{ width: 10, height: 10 }} />
        </div>
        <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Loading finances…</p>
      </div>
    )
  }

  const transactions = (data?.expenses ?? []).map(t => ({
    ...t,
    type: t.type || 'expense' as const, // fallback for legacy entries without a type
  }))
  const thisMonth = transactions.filter(t => {
    const d = new Date(t.date)
    const now = new Date()
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  })

  const currencyCode = data?.currency || 'PHP'
  const sym = CURRENCIES.find(c => c.code === currencyCode)?.symbol ?? '₱'

  const changeCurrency = async (code: string) => {
    await fetch('/api/budget', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ currency: code }) })
    loadBudget()
  }

  const changeBudget = async (limit: number) => {
    await fetch('/api/budget', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ monthlyLimit: limit }) })
    loadBudget()
  }

  const totalExpenses = thisMonth.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
  const totalIncome = thisMonth.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const totalSavings = thisMonth.filter(t => t.type === 'savings').reduce((s, t) => s + t.amount, 0)
  const remaining = (data?.monthlyLimit ?? 0) - totalExpenses
  const budgetPercent = data?.monthlyLimit ? Math.min(100, (totalExpenses / data.monthlyLimit) * 100) : 0
  const fmt = (n: number) => `${sym}${n.toLocaleString(undefined, { minimumFractionDigits: 2 })}`

  // Category breakdown
  const categoryMap: Record<string, number> = {}
  thisMonth.filter(t => t.type === 'expense').forEach(t => {
    categoryMap[t.category] = (categoryMap[t.category] || 0) + t.amount
  })
  const sortedCategories = Object.entries(categoryMap).sort((a, b) => b[1] - a[1])

  // Filtered and sorted transaction lists
  const expenseItems = [...thisMonth.filter(t => t.type === 'expense')].reverse()
  const incomeItems  = [...thisMonth.filter(t => t.type === 'income')].reverse()
  const savingsItems = [...thisMonth.filter(t => t.type === 'savings')].reverse()

  return (
    <div style={{ padding: '24px 28px', height: '100%', overflowY: 'auto' }}>

      {/* ── Top Action Bar ─────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700 }}>Track Finances</h2>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Currency selector */}
          <select
            value={currencyCode}
            onChange={e => changeCurrency(e.target.value)}
            style={{
              padding: '7px 10px', borderRadius: 8, fontSize: 13,
              background: 'var(--surface)', border: '1px solid var(--border)',
              color: 'var(--text)', outline: 'none', cursor: 'pointer',
            }}
          >
            {CURRENCIES.map(c => (
              <option key={c.code} value={c.code}>{c.symbol} {c.code}</option>
            ))}
          </select>

          {/* Budget input */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ fontSize: 12, color: 'var(--text-subtle)' }}>Budget:</span>
            <input
              type="number"
              value={data?.monthlyLimit ?? 0}
              onChange={e => changeBudget(parseFloat(e.target.value) || 0)}
              style={{
                width: 100, padding: '7px 10px', borderRadius: 8, fontSize: 13,
                background: 'var(--surface)', border: '1px solid var(--border)',
                color: 'var(--text)', outline: 'none',
              }}
            />
          </div>

          <input
            ref={fileRef}
            type="file"
            accept="image/*,.pdf"
            style={{ display: 'none' }}
            onChange={handleScanReceipt}
          />
          <button
            className="btn-ghost"
            onClick={() => fileRef.current?.click()}
            disabled={scanning}
            style={{ fontSize: 13, padding: '8px 16px' }}
          >
            {scanning ? 'Scanning…' : 'Scan Receipt'}
          </button>
          <button
            className="btn-brand"
            onClick={() => setShowAddForm(!showAddForm)}
            style={{ fontSize: 13, padding: '8px 16px' }}
          >
            + Add Transaction
          </button>
        </div>
      </div>

      {scanResult && (
        <div className="glass" style={{
          padding: 12, marginBottom: 16, fontSize: 13,
          borderLeft: scanResult.startsWith('[OK]') ? '3px solid #34d399' : scanResult.startsWith('[INFO]') ? '3px solid #818cf8' : '3px solid #f87171',
        }}>
          {scanResult}
          <button onClick={() => { setScanResult(null); setScanPreview(null) }} style={{ marginLeft: 12, background: 'none', border: 'none', color: 'var(--text-subtle)', cursor: 'pointer' }}>✕</button>
        </div>
      )}

      {/* ── Scan Preview / Review Panel ────────────────────────────── */}
      {scanPreview && scanPreview.length > 0 && (
        <div className="glass" style={{ padding: 20, marginBottom: 24, borderRadius: 16, border: '1px solid rgba(129,140,248,0.25)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: '#818cf8' }}>Review Scanned Items</h3>
            <span style={{ fontSize: 12, color: 'var(--text-subtle)' }}>Edit amounts or categories before saving</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
            {scanPreview.map((item, i) => (
              <div key={i} style={{
                display: 'grid', gridTemplateColumns: '2fr 120px 1fr auto', gap: 8, alignItems: 'center',
                padding: '8px 12px', background: 'var(--surface)', borderRadius: 10, border: '1px solid var(--border)',
              }}>
                <input
                  type="text"
                  value={item.description}
                  onChange={e => updatePreviewItem(i, 'description', e.target.value)}
                  style={{
                    padding: '6px 10px', borderRadius: 6, fontSize: 13,
                    background: 'var(--surface-2)', border: '1px solid var(--border)',
                    color: 'var(--text)', outline: 'none',
                  }}
                />
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ color: 'var(--text-subtle)', fontSize: 13 }}>$</span>
                  <input
                    type="number"
                    step="0.01"
                    value={item.amount}
                    onChange={e => updatePreviewItem(i, 'amount', parseFloat(e.target.value) || 0)}
                    style={{
                      width: '100%', padding: '6px 10px', borderRadius: 6, fontSize: 13,
                      background: 'var(--surface-2)', border: '1px solid var(--border)',
                      color: '#f87171', fontWeight: 600, outline: 'none',
                    }}
                  />
                </div>
                <select
                  value={item.category}
                  onChange={e => updatePreviewItem(i, 'category', e.target.value)}
                  style={{
                    padding: '6px 10px', borderRadius: 6, fontSize: 12,
                    background: 'var(--surface-2)', border: '1px solid var(--border)',
                    color: 'var(--text)', outline: 'none',
                  }}
                >
                  {CATEGORIES.filter(c => c !== 'Savings').map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <button
                  onClick={() => removePreviewItem(i)}
                  style={{
                    width: 28, height: 28, borderRadius: 6, border: 'none', cursor: 'pointer',
                    background: 'rgba(248,113,113,0.1)', color: '#f87171', fontSize: 14,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button
              className="btn-ghost"
              onClick={() => { setScanPreview(null); setScanResult(null) }}
              style={{ fontSize: 13, padding: '8px 16px' }}
            >
              Cancel
            </button>
            <button
              className="btn-brand"
              onClick={confirmScanItems}
              disabled={savingScan}
              style={{ fontSize: 13, padding: '8px 20px' }}
            >
              {savingScan ? 'Saving…' : `Confirm & Save ${scanPreview.length} Items`}
            </button>
          </div>
        </div>
      )}

      {/* ── Add Transaction Form ───────────────────────────────────── */}
      {showAddForm && (
        <div className="glass" style={{ padding: 20, marginBottom: 24, borderRadius: 16 }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            {(['expense', 'income', 'savings'] as const).map(t => (
              <button
                key={t}
                onClick={() => setFormType(t)}
                style={{
                  padding: '6px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                  border: '1px solid', cursor: 'pointer', transition: 'all 0.15s',
                  background: formType === t ? (t === 'expense' ? 'rgba(248,113,113,0.15)' : t === 'income' ? 'rgba(52,211,153,0.15)' : 'rgba(34,211,238,0.15)') : 'transparent',
                  borderColor: formType === t ? (t === 'expense' ? '#f87171' : t === 'income' ? '#34d399' : '#22d3ee') : 'var(--border)',
                  color: formType === t ? (t === 'expense' ? '#f87171' : t === 'income' ? '#34d399' : '#22d3ee') : 'var(--text-muted)',
                }}
              >
                {t === 'expense' ? 'Expense' : t === 'income' ? 'Income' : 'Savings'}
              </button>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 2fr auto', gap: 12, alignItems: 'end' }}>
            <div>
              <label style={{ fontSize: 11, color: 'var(--text-subtle)', display: 'block', marginBottom: 4 }}>Amount</label>
              <input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={formAmount}
                onChange={e => setFormAmount(e.target.value)}
                style={{
                  width: '100%', padding: '8px 12px', borderRadius: 8, fontSize: 14,
                  background: 'var(--surface)', border: '1px solid var(--border)',
                  color: 'var(--text)', outline: 'none',
                }}
              />
            </div>
            {formType !== 'savings' && (
              <div>
                <label style={{ fontSize: 11, color: 'var(--text-subtle)', display: 'block', marginBottom: 4 }}>Category</label>
                <select
                  value={formCategory}
                  onChange={e => setFormCategory(e.target.value)}
                  style={{
                    width: '100%', padding: '8px 12px', borderRadius: 8, fontSize: 14,
                    background: 'var(--surface)', border: '1px solid var(--border)',
                    color: 'var(--text)', outline: 'none',
                  }}
                >
                  {CATEGORIES.filter(c => c !== 'Savings').map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            )}
            <div>
              <label style={{ fontSize: 11, color: 'var(--text-subtle)', display: 'block', marginBottom: 4 }}>Description</label>
              <input
                type="text"
                placeholder="Coffee, Uber, Netflix…"
                value={formDesc}
                onChange={e => setFormDesc(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addTransaction()}
                style={{
                  width: '100%', padding: '8px 12px', borderRadius: 8, fontSize: 14,
                  background: 'var(--surface)', border: '1px solid var(--border)',
                  color: 'var(--text)', outline: 'none',
                }}
              />
            </div>
            <button className="btn-brand" onClick={addTransaction} style={{ padding: '8px 20px', fontSize: 13 }}>
              Add
            </button>
          </div>
        </div>
      )}

      {/* ── Summary Cards ──────────────────────────────────────────── */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fill, minmax(calc(50% - 8px), 1fr))', 
        gap: 16, 
        marginBottom: 28 
      }}>
        {[
          { label: 'Budget', value: fmt(data?.monthlyLimit ?? 0), color: '#818cf8', icon: <IconTarget size={18} color="#818cf8" /> },
          { label: 'Expenses', value: fmt(totalExpenses), color: '#f87171', icon: <IconArrowDownCircle size={18} color="#f87171" /> },
          { label: 'Income', value: fmt(totalIncome), color: '#34d399', icon: <IconArrowUpCircle size={18} color="#34d399" /> },
          { label: 'Savings', value: fmt(totalSavings), color: '#22d3ee', icon: <IconPiggyBank size={18} color="#22d3ee" /> },
          { label: 'Left', value: fmt(remaining), color: remaining >= 0 ? '#34d399' : '#f87171', icon: remaining >= 0 ? <IconCheckCircle size={18} color="#34d399" /> : <IconAlertTriangle size={18} color="#f87171" /> },
        ].map((card, i) => (
          <div key={i} className="glass" style={{ padding: 16, borderRadius: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 10, color: 'var(--text-subtle)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{card.label}</span>
              <span style={{ display: 'flex', alignItems: 'center' }}>{card.icon}</span>
            </div>
            <p style={{ fontSize: 18, fontWeight: 700, color: card.color }}>{card.value}</p>
          </div>
        ))}
      </div>

      {/* ── Budget Progress ────────────────────────────────────────── */}
      <div className="glass" style={{ padding: 20, borderRadius: 14, marginBottom: 28 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 600 }}>Budget Usage</span>
          <span style={{ fontSize: 13, color: budgetPercent > 90 ? '#f87171' : budgetPercent > 70 ? '#fbbf24' : '#34d399', fontWeight: 600 }}>
            {budgetPercent.toFixed(0)}%
          </span>
        </div>
        <div style={{ width: '100%', height: 10, background: 'var(--surface-3)', borderRadius: 6, overflow: 'hidden' }}>
          <div style={{
            width: `${budgetPercent}%`, height: '100%',
            background: budgetPercent > 90 ? '#f87171' : budgetPercent > 70 ? 'linear-gradient(90deg, #fbbf24, #f97316)' : 'linear-gradient(90deg, #34d399, #22d3ee)',
            borderRadius: 6, transition: 'width 0.8s ease-out',
          }} />
        </div>
      </div>

      {/* ── EXPENSES SECTION ────────────────────────────────────── */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(248,113,113,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><IconArrowDownCircle size={16} color="#f87171" /></div>
          <h3 style={{ fontSize: 17, fontWeight: 700 }}>Expenses</h3>
          <span style={{ fontSize: 13, color: '#f87171', fontWeight: 600, marginLeft: 'auto' }}>
            {fmt(totalExpenses)} this month
          </span>
        </div>

        {/* Category Breakdown Row */}
        {sortedCategories.length > 0 && (
          <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 12, marginBottom: 12 }}>
            {sortedCategories.map(([cat, amount]) => {
              const pct = totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0
              return (
                <div key={cat} className="glass" style={{ minWidth: 160, padding: 14, borderRadius: 12, flexShrink: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: CATEGORY_COLORS[cat] ?? '#94a3b8', flexShrink: 0 }} />
                    <span style={{ fontSize: 12, fontWeight: 600 }}>{cat}</span>
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: CATEGORY_COLORS[cat] ?? '#94a3b8', marginBottom: 6 }}>{fmt(amount)}</div>
                  <div style={{ width: '100%', height: 4, background: 'var(--surface-3)', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: CATEGORY_COLORS[cat] ?? '#94a3b8', borderRadius: 3 }} />
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-subtle)', marginTop: 4 }}>{pct.toFixed(0)}% of total</div>
                </div>
              )
            })}
          </div>
        )}

        {/* Expense Transactions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {expenseItems.length === 0 ? (
            <div className="glass" style={{ padding: 24, textAlign: 'center', borderRadius: 12, color: 'var(--text-muted)', fontSize: 13 }}>
              No expenses recorded this month
            </div>
          ) : (
            expenseItems.map(t => (
              <div key={t.id} className="glass" style={{
                padding: '10px 16px', borderRadius: 10,
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                borderLeft: '3px solid #f87171',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: CATEGORY_COLORS[t.category] ?? '#94a3b8', flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{t.description}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-subtle)' }}>
                      {t.category} • {new Date(t.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#f87171' }}>-{fmt(t.amount)}</span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ── INCOME SECTION ──────────────────────────────────────── */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(52,211,153,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><IconArrowUpCircle size={16} color="#34d399" /></div>
          <h3 style={{ fontSize: 17, fontWeight: 700 }}>Income</h3>
          <span style={{ fontSize: 13, color: '#34d399', fontWeight: 600, marginLeft: 'auto' }}>
            {fmt(totalIncome)} this month
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {incomeItems.length === 0 ? (
            <div className="glass" style={{ padding: 24, textAlign: 'center', borderRadius: 12, color: 'var(--text-muted)', fontSize: 13 }}>
              No income recorded this month — add salary, freelance, etc.
            </div>
          ) : (
            incomeItems.map(t => (
              <div key={t.id} className="glass" style={{
                padding: '10px 16px', borderRadius: 10,
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                borderLeft: '3px solid #34d399',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#34d399', flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{t.description}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-subtle)' }}>
                      Income • {new Date(t.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#34d399' }}>+{fmt(t.amount)}</span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ── SAVINGS SECTION ─────────────────────────────────────── */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(34,211,238,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><IconPiggyBank size={16} color="#22d3ee" /></div>
          <h3 style={{ fontSize: 17, fontWeight: 700 }}>Savings</h3>
          <span style={{ fontSize: 13, color: '#22d3ee', fontWeight: 600, marginLeft: 'auto' }}>
            {fmt(totalSavings)} this month
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {savingsItems.length === 0 ? (
            <div className="glass" style={{ padding: 24, textAlign: 'center', borderRadius: 12, color: 'var(--text-muted)', fontSize: 13 }}>
              No savings yet — start by adding your emergency fund, investments, etc.
            </div>
          ) : (
            savingsItems.map(t => (
              <div key={t.id} className="glass" style={{
                padding: '10px 16px', borderRadius: 10,
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                borderLeft: '3px solid #22d3ee',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#22d3ee', flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{t.description}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-subtle)' }}>
                      Savings • {new Date(t.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#22d3ee' }}>+{fmt(t.amount)}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
