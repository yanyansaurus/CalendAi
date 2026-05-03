import { auth } from '@/lib/auth'
import { getGeminiModel, getFallbackGeminiModel } from '@/lib/gemini'
import { getUnreadEmails } from '@/lib/gmail'
import { getFreeBusy } from '@/lib/googleCalendar'
import { getTasks } from '@/lib/taskEngine'
import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = session.user.email
  const googleToken = session.googleAccessToken
  const timezone = req.headers.get('x-timezone') ?? 'UTC'

  // Gather context
  let emails: any[] = []
  let busySlots: any[] = []
  let tasks: any[] = []

  try { tasks = await getTasks(userId) } catch { /* ignore */ }

  if (googleToken) {
    try { emails = await getUnreadEmails(googleToken, 10) } catch { /* ignore */ }
    try { busySlots = await getFreeBusy(googleToken, 'today') } catch { /* ignore */ }
  }

  // Build AI prompt for briefing
  const briefingPrompt = `
You are ExecutiveVAi generating a daily briefing. Current time: ${new Date().toISOString()}, timezone: ${timezone}.

Here is the user's context:
- Today's busy calendar slots: ${JSON.stringify(busySlots)}
- Active tasks: ${JSON.stringify(tasks.map(t => ({ title: t.title, priority: t.priority, status: t.status, dueDate: t.dueDate })))}
- Recent unread emails (subjects & senders): ${JSON.stringify(emails.map(e => ({ from: e.from, subject: e.subject, snippet: e.body?.substring(0, 100) })))}

Generate a briefing in this EXACT JSON format (no markdown, no code fences):
{
  "greeting": "A warm, personalized good morning/afternoon greeting",
  "todayReminders": [
    { "time": "HH:MM AM/PM", "title": "Event/task name", "type": "calendar|task|deadline", "urgency": "high|medium|low" }
  ],
  "emailInsights": [
    { "from": "Sender name", "subject": "Email subject", "action": "What the user should do", "suggestedTime": "When to handle it", "priority": "high|medium|low" }
  ],
  "recommendedSchedule": [
    { "time": "HH:MM AM/PM", "activity": "What to do", "reason": "Why this is suggested", "duration": "X min" }
  ],
  "motivationalNote": "A brief motivational or productivity tip"
}

Rules:
- todayReminders: list ALL calendar events and pending tasks for today
- emailInsights: pick the top 3-5 most important emails and suggest actions
- recommendedSchedule: suggest an optimized schedule considering busy slots, tasks, and email actions
- Keep it concise and actionable
`

  let briefing: any = null

  try {
    const model = getGeminiModel()
    const result = await model.generateContent(briefingPrompt)
    let text = result.response.text().trim()
    // Strip code fences if present
    text = text.replace(/^```json?\s*/i, '').replace(/```\s*$/i, '').trim()
    briefing = JSON.parse(text)
  } catch (err) {
    console.error('[Briefing] Primary model failed:', err)
    try {
      const fallback = getFallbackGeminiModel()
      const result = await fallback.generateContent(briefingPrompt)
      let text = result.response.text().trim()
      text = text.replace(/^```json?\s*/i, '').replace(/```\s*$/i, '').trim()
      briefing = JSON.parse(text)
    } catch (fallbackErr) {
      console.error('[Briefing] Fallback failed:', fallbackErr)
      // Return a basic briefing without AI
      briefing = {
        greeting: `Good ${new Date().getHours() < 12 ? 'morning' : 'afternoon'}!`,
        todayReminders: busySlots.map(s => ({
          time: new Date(s.start).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
          title: 'Calendar event',
          type: 'calendar',
          urgency: 'medium'
        })),
        emailInsights: emails.slice(0, 3).map(e => ({
          from: e.from?.split('<')[0]?.trim() ?? 'Unknown',
          subject: e.subject,
          action: 'Review and respond',
          suggestedTime: 'When available',
          priority: 'medium'
        })),
        recommendedSchedule: [],
        motivationalNote: 'Stay focused and take it one task at a time! 💪'
      }
    }
  }

  return NextResponse.json({ briefing, tasksCount: tasks.length, emailsCount: emails.length })
}
