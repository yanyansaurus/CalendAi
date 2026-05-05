import { auth } from '@/lib/auth'
import { getWeekEvents } from '@/lib/googleCalendar'
import { getAIResponse } from '@/lib/ai'
import { NextResponse } from 'next/server'

export async function GET() {
  const session = await auth()
  if (!session?.googleAccessToken) {
    return NextResponse.json({ error: 'Google Calendar not connected' }, { status: 401 })
  }

  try {
    const events = await getWeekEvents(session.googleAccessToken)

    const text = await getAIResponse([
      { role: "system", content: "You are an executive time-management analyst. Respond ONLY with valid JSON." },
      { role: "user", content: `Analysing calendar events: ${JSON.stringify(events)}\n\nCategories: Meetings, Deep Work, Admin, Focus Time, Other.` }
    ], { 
      jsonMode: true, 
      provider: "groq", 
      model: "llama-3.3-70b-versatile" 
    });

    try {
      const analysis = JSON.parse(text)
      return NextResponse.json({ analysis, events })
    } catch {
      return NextResponse.json({ error: 'Could not parse analysis', raw: text }, { status: 500 })
    }
  } catch (err: any) {
    console.error('Analysis route error:', err)
    return NextResponse.json(
      { error: err.message ?? 'Failed to generate analysis' },
      { status: 500 }
    )
  }
}
