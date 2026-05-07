import { randomUUID } from 'crypto'
import { kv } from './kv'

export interface Expense {
  id: string
  amount: number
  category: string
  description: string
  date: string
  type: 'expense' | 'income' | 'savings'
}

export interface BudgetData {
  monthlyLimit: number
  currency: string
  expenses: Expense[]
}

const getBudgetPrefix = (email: string) => `budget:${email}`

// ─── Core functions ──────────────────────────────────────────────────────────

export async function getBudgetData(email: string): Promise<BudgetData> {
  const key = getBudgetPrefix(email)
  try {
    const data = await kv.get<BudgetData>(key)
    if (data) return data
  } catch (err) {
    console.error('Error fetching budget data:', err)
  }
  return { monthlyLimit: 0, currency: 'PHP', expenses: [] }
}

export async function setMonthlyLimit(email: string, limit: number): Promise<BudgetData> {
  const data = await getBudgetData(email)
  data.monthlyLimit = limit
  await kv.set(getBudgetPrefix(email), data)
  return data
}

export async function setCurrency(email: string, currency: string): Promise<BudgetData> {
  const data = await getBudgetData(email)
  data.currency = currency
  await kv.set(getBudgetPrefix(email), data)
  return data
}

export async function addExpense(
  email: string,
  expense: Omit<Expense, 'id' | 'date'>
): Promise<BudgetData> {
  const data = await getBudgetData(email)
  const newExpense: Expense = {
    id: randomUUID(),
    date: new Date().toISOString(),
    ...expense,
  }
  data.expenses.push(newExpense)
  await kv.set(getBudgetPrefix(email), data)
  return data
}
