import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'
import { getBudgetData, addExpense, setMonthlyLimit, setCurrency } from '@/lib/budgetEngine'

// GET — fetch budget data
export async function GET() {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const data = await getBudgetData(session.user.email)
  return NextResponse.json(data)
}

// POST — add a transaction (expense, income, or savings)
export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { amount, category, description, type } = body

  if (!amount || !category) {
    return NextResponse.json({ error: 'Amount and category required' }, { status: 400 })
  }

  const data = await addExpense(session.user.email, {
    amount: Math.abs(amount),
    category,
    description: description ?? '',
    type: type ?? 'expense', // expense | income | savings
  })

  return NextResponse.json(data)
}

// PUT — update monthly limit
export async function PUT(req: Request) {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { monthlyLimit } = await req.json()
  if (typeof monthlyLimit !== 'number') {
    return NextResponse.json({ error: 'Invalid monthly limit' }, { status: 400 })
  }

  const data = await setMonthlyLimit(session.user.email, monthlyLimit)
  return NextResponse.json(data)
}

// PATCH — update currency
export async function PATCH(req: Request) {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { currency } = await req.json()
  if (!currency || typeof currency !== 'string') {
    return NextResponse.json({ error: 'Invalid currency' }, { status: 400 })
  }

  const data = await setCurrency(session.user.email, currency)
  return NextResponse.json(data)
}
