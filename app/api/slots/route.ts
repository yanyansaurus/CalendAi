import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getFreeBusy, computeFreeSlots, getDetailedEvents } from '@/lib/googleCalendar'

export async function GET(req: Request) {
  const session = await auth()
  if (!session?.googleAccessToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const dateStr = searchParams.get('date') // YYYY-MM-DD
  const timezone = searchParams.get('tz') || 'Asia/Manila'
  const attendees = searchParams.get('attendees')?.split(',').filter(Boolean) || []

  if (!dateStr) {
    return NextResponse.json({ error: 'Date is required' }, { status: 400 })
  }

  try {
    const timeMin = new Date(`${dateStr}T00:00:00`).toLocaleString('en-US', { timeZone: timezone })
    const timeMax = new Date(`${dateStr}T23:59:59`).toLocaleString('en-US', { timeZone: timezone })
    
    const isoMin = new Date(timeMin).toISOString()
    const isoMax = new Date(timeMax).toISOString()

    // Fetch busy slots for primary AND all attendees
    const busySlotsPromises = [
      getDetailedEvents(session.googleAccessToken as string, timeMin, timeMax, timezone),
      ...attendees.map(email => getDetailedEvents(session.googleAccessToken as string, timeMin, timeMax, timezone, email))
    ]

    const allBusyResults = await Promise.all(busySlotsPromises)
    const busySlots = allBusyResults.flat().filter(slot => {
      const title = (slot as any).title?.toLowerCase() || ''
      return !title.includes('available slot') && !title.includes('free time')
    })

    // We want to pass the correct target date to computeFreeSlots.
    // However, computeFreeSlots is currently hardcoded for the whole week or specific days?
    // Let's just return busySlots for now, and the client can compute, OR we use the server to compute.
    // For simplicity and speed, let's just return the busySlots and let the wizard use them, 
    // OR we compute free slots on the server.
    const dayStart = new Date(`${dateStr}T00:00:00Z`)
    const dayEnd = new Date(`${dateStr}T23:59:59Z`)

    const freeSlots = computeFreeSlots(busySlots, dayStart, dayEnd)

    // Filter freeSlots to only include the requested date
    const targetDate = new Date(dateStr)
    const filteredFreeSlots = freeSlots.filter(s => {
      const slotDate = new Date(s.start)
      return slotDate.getDate() === targetDate.getDate() && slotDate.getMonth() === targetDate.getMonth()
    })

    return NextResponse.json({
      busySlots,
      freeSlots: filteredFreeSlots
    })
  } catch (error: any) {
    console.error('Error fetching slots:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
