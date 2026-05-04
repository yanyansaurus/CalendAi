'use client'
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  Cell, PieChart, Pie, Legend
} from 'recharts'
import type { BudgetData } from '@/lib/budgetEngine'

interface Props {
  data: BudgetData
}

const COLORS = ['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6']

export default function BudgetChart({ data }: Props) {
  // 1. Group by category for Pie Chart
  const categoryMap = data.expenses.reduce((acc, curr) => {
    acc[curr.category] = (acc[curr.category] || 0) + curr.amount
    return acc
  }, {} as Record<string, number>)

  const pieData = Object.entries(categoryMap).map(([name, value]) => ({ name, value }))

  // 2. Group by date for Bar Chart (last 7 entries)
  const sortedExpenses = [...data.expenses].sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  )
  
  const barData = sortedExpenses.slice(-7).map(e => ({
    name: new Date(e.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    amount: e.amount,
    category: e.category
  }))

  const totalSpent = data.expenses.reduce((acc, curr) => acc + curr.amount, 0)
  const remaining = Math.max(0, data.monthlyLimit - totalSpent)
  const percentUsed = data.monthlyLimit > 0 ? (totalSpent / data.monthlyLimit) * 100 : 0

  return (
    <div className="glass animate-fade-up" style={{ 
      width: '100%', maxWidth: 400, padding: 20, borderRadius: 16, 
      display: 'flex', flexDirection: 'column', gap: 20,
      background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--border)'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Budget Status</p>
          <h3 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text)', marginTop: 4 }}>
            {data.currency} {totalSpent.toLocaleString()}
          </h3>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Limit: {data.monthlyLimit.toLocaleString()}</p>
          <p style={{ fontSize: 13, color: percentUsed > 90 ? '#ef4444' : 'var(--brand-light)', fontWeight: 600 }}>
            {percentUsed.toFixed(1)}% Used
          </p>
        </div>
      </div>

      {/* Progress Bar */}
      <div style={{ width: '100%', height: 8, background: 'var(--surface-3)', borderRadius: 4, overflow: 'hidden' }}>
        <div style={{ 
          width: `${Math.min(100, percentUsed)}%`, 
          height: '100%', 
          background: percentUsed > 90 ? '#ef4444' : 'var(--brand)',
          transition: 'width 1s ease-out'
        }} />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>Spending by Category</p>
        <div style={{ width: '100%', height: 200 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="none" />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ background: 'var(--surface-1)', border: '1px solid var(--border)', borderRadius: 8 }}
                itemStyle={{ color: 'var(--text)', fontSize: 12 }}
              />
              <Legend verticalAlign="bottom" height={36}/>
            </PieChart>
          </ResponsiveContainer>
        </div>

        <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginTop: 10 }}>Recent Transactions</p>
        <div style={{ width: '100%', height: 150 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={barData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={10} tickLine={false} axisLine={false} />
              <YAxis hide />
              <Tooltip 
                cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                contentStyle={{ background: 'var(--surface-1)', border: '1px solid var(--border)', borderRadius: 8 }}
                itemStyle={{ color: 'var(--text)', fontSize: 12 }}
              />
              <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
                {barData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} opacity={0.8} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
