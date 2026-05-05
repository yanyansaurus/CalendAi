import { randomUUID } from 'crypto'
import { localKV } from '@/lib/localKV'

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

import { connectRedis } from './redis'

async function getKV() {
  try {
    const redis = await connectRedis()
    if (redis && redis.isOpen) return redis
  } catch (err) {
    console.warn('[Budget] Redis failed, falling back to localKV')
  }
  return localKV
}

function getBudgetStr(val: any): string | null {
  if (typeof val === 'string') return val
  if (Buffer.isBuffer(val)) return val.toString('utf-8')
  return null
}

const getBudgetPrefix = (email: string) => `budget:${email}`

// ─── Core functions ──────────────────────────────────────────────────────────

export async function getBudgetData(email: string): Promise<BudgetData> {
  const kv = await getKV()
  const key = getBudgetPrefix(email)
  const isRedis = typeof kv.get === 'function' && kv !== localKV

  try {
    const raw = isRedis ? await kv.get(key) : kv.get(key)
    const str = getBudgetStr(raw)
    if (str) return JSON.parse(str) as BudgetData
  } catch (err) {
    console.error('Error fetching budget data:', err)
  }

  return { monthlyLimit: 0, currency: 'PHP', expenses: [] }
}

export async function setMonthlyLimit(email: string, limit: number): Promise<BudgetData> {
  const data = await getBudgetData(email)
  data.monthlyLimit = limit
  
  const kv = await getKV()
  const key = getBudgetPrefix(email)
  const isRedis = typeof kv.get === 'function' && kv !== localKV

  if (isRedis) await kv.set(key, JSON.stringify(data))
  else kv.set(key, JSON.stringify(data))

  return data
}

export async function setCurrency(email: string, currency: string): Promise<BudgetData> {
  const data = await getBudgetData(email)
  data.currency = currency
  
  const kv = await getKV()
  const key = getBudgetPrefix(email)
  const isRedis = typeof kv.get === 'function' && kv !== localKV

  if (isRedis) await kv.set(key, JSON.stringify(data))
  else kv.set(key, JSON.stringify(data))

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
  
  const kv = await getKV()
  const key = getBudgetPrefix(email)
  const isRedis = typeof kv.get === 'function' && kv !== localKV

  if (isRedis) await kv.set(key, JSON.stringify(data))
  else kv.set(key, JSON.stringify(data))

  return data
}
