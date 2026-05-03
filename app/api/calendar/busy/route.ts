import { auth } from '@/lib/auth'
import { getFreeBusy, computeFreeSlots } from '@/lib/googleCalendar'
import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  const session = await auth()
  if (!session?.googleAccessToken) {
    return NextResponse.json({ error: 'Google Calendar not connected' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const range = (searchParams.get('range') ?? 'today') as 'today' | 'this_week'
  const min   = parseInt(searchParams.get('min') ?? '30', 10)

  const busy = await getFreeBusy(session.googleAccessToken, range)

  const now      = new Date()
  const rangeEnd = range === 'today'
    ? new Date(now.getFullYear(), now.getMonth(), now.getDate(), 20, 0, 0)
    : (() => { const d = new Date(now); d.setDate(d.getDate() + 7); return d })()

  const free = computeFreeSlots(busy, now, rangeEnd, min)

  return NextResponse.json({ busy, free })
}
