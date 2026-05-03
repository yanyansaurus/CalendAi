import { auth } from '@/lib/auth'
import { getWeekEvents } from '@/lib/googleCalendar'
import { getGeminiModel, SYSTEM_PROMPT } from '@/lib/gemini'
import { NextResponse } from 'next/server'

export async function GET() {
  const session = await auth()
  if (!session?.googleAccessToken) {
    return NextResponse.json({ error: 'Google Calendar not connected' }, { status: 401 })
  }

  const events = await getWeekEvents(session.googleAccessToken)

  // Ask Gemini to categorise the week's events
  const model  = getGeminiModel()
  const prompt = `
You are analysing a CEO's calendar events from this week.
Events: ${JSON.stringify(events)}

Return ONLY a valid JSON object (no markdown) with this shape:
{
  "totalMinutes": <int>,
  "categories": [
    { "name": "<category>", "minutes": <int>, "percentage": <int>, "events": ["<title>"] }
  ],
  "insight": "<one-sentence insight about how they spent their week>",
  "recommendation": "<one-sentence actionable recommendation>"
}
Categories to use: Meetings, Deep Work, Admin, Focus Time, Other.
`
  const result = await model.generateContent(prompt)
  const raw    = result.response.text().replace(/```json\s*/i,'').replace(/```\s*$/,'').trim()

  try {
    const analysis = JSON.parse(raw)
    return NextResponse.json({ analysis, events })
  } catch {
    return NextResponse.json({ error: 'Could not parse analysis', raw }, { status: 500 })
  }
}
