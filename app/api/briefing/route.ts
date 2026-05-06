import { auth } from '@/lib/auth'
import { getAIResponse } from '@/lib/ai'
import { getUnreadEmails } from '@/lib/gmail'
import { getFreeBusy, getTodayEvents } from '@/lib/googleCalendar'
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
  let tomorrowSlots: any[] = []
  let lastWeekSlots: any[] = []
  let tasks: any[] = []

  try {
    const allTasks = await getTasks(userId)

    // Filter tasks for today's context
    const now = new Date()
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric', month: '2-digit', day: '2-digit'
    }).formatToParts(now)
    const year = parts.find(p => p.type === 'year')?.value
    const month = parts.find(p => p.type === 'month')?.value
    const day = parts.find(p => p.type === 'day')?.value
    const dateStr = `${year}-${month}-${day}` // YYYY-MM-DD

    tasks = allTasks.filter(t => {
      if (t.status === 'done') return false
      if (!t.dueDate) return true // Anytime tasks
      return t.dueDate <= dateStr // Today or Overdue
    })
  } catch { /* ignore */ }

  if (googleToken) {
    try { emails = await getUnreadEmails(googleToken, 10) } catch { /* ignore */ }
    try { 
      const rawSlots = await getTodayEvents(googleToken, timezone) 
      // Deduplicate slots (same title and start time)
      busySlots = rawSlots.filter((slot, index, self) =>
        index === self.findIndex((t) => (
          t.title === slot.title && t.start === slot.start
        ))
      )
      
      // Ensure Wake/Sleep are always present as defaults if missing
      const hasWake = busySlots.some(s => s.title.toLowerCase().includes('wake'))
      const hasSleep = busySlots.some(s => s.title.toLowerCase().includes('sleep'))
      
      if (!hasWake || !hasSleep) {
        const { getPreferences } = await import('@/lib/reminderEngine')
        const prefs = await getPreferences(session.user.email!)
        const wakeTime = prefs?.wakeTime ?? '07:00'
        const sleepTime = prefs?.sleepTime ?? '22:30'
        
        const todayStr = new Date().toISOString().split('T')[0]
        if (!hasWake) busySlots.unshift({ title: '🌅 Wake Up', start: `${todayStr}T${wakeTime}:00Z`, end: `${todayStr}T${wakeTime}:15Z` })
        if (!hasSleep) busySlots.push({ title: '🌙 Sleep', start: `${todayStr}T${sleepTime}:00Z`, end: `${todayStr}T23:59:59Z` })
      }

      console.log('[Briefing Debug] Today Slots (Unique):', busySlots.map(s => s.title))
    } catch { /* ignore */ }
    
    try {
      // Fetch Tomorrow for better context
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      const tParts = new Intl.DateTimeFormat('en-CA', {
        timeZone: timezone,
        year: 'numeric', month: '2-digit', day: '2-digit'
      }).formatToParts(tomorrow)
      const tDateStr = `${tParts.find(p => p.type === 'year')?.value}-${tParts.find(p => p.type === 'month')?.value}-${tParts.find(p => p.type === 'day')?.value}`
      
      const rawTomorrow = await getFreeBusy(googleToken, { 
        start: `${tDateStr}T00:00:00Z`, 
        end: `${tDateStr}T23:59:59Z` 
      }, timezone)

      tomorrowSlots = rawTomorrow.filter((slot, index, self) =>
        index === self.findIndex((t) => (
          t.start === slot.start
        ))
      )
      console.log('[Briefing Debug] Tomorrow Slots (Unique):', tomorrowSlots.length)
    } catch { /* ignore */ }

    try {
      // Fetch last 7 days for the weekly summary
      const lastWeek = new Date()
      lastWeek.setDate(lastWeek.getDate() - 7)
      lastWeekSlots = await getFreeBusy(googleToken, {
        start: lastWeek.toISOString(),
        end: new Date().toISOString()
      }, timezone)
    } catch { /* ignore */ }
  }

  // Build AI prompt for briefing
  const isEndOfDay = new Date().getHours() >= 17

  const briefingPrompt = `
    You are ExecutiveVAi, generating a ${isEndOfDay ? 'reflective End-of-Day Digest' : 'Morning Daily Briefing'}.
    Current time: ${new Date().toISOString()}, timezone: ${timezone}.

    CONTEXT DATA:
    - Busy calendar slots (Today): ${JSON.stringify(busySlots)}
    - Busy calendar slots (Tomorrow): ${JSON.stringify(tomorrowSlots)}
    - Busy calendar slots (Last 7 Days): ${JSON.stringify(lastWeekSlots.length > 20 ? 'Too many to list, but summarize the volume' : lastWeekSlots)}
    - Active and pending tasks: ${JSON.stringify(tasks.map(t => ({ title: t.title, priority: t.priority, status: t.status, dueDate: t.dueDate })))}
    - Recent unread emails: ${JSON.stringify(emails.map(e => ({ from: e.from, subject: e.subject, snippet: e.body?.substring(0, 300) })))}

    GENERATE A BRIEFING IN THIS EXACT JSON FORMAT:
    {
      "greeting": "A warm, personalized greeting",
      "urgentAlerts": [
        { "title": "Critical item starting soon", "timeLeft": "X mins", "urgency": "high" }
      ],
      "todayReminders": [
        { "time": "HH:MM", "endTime": "HH:MM", "title": "Task/Meeting name", "description": "1 sentence context", "duration": "X mins/hrs", "type": "calendar|task|email", "urgency": "high|medium|low" }
      ],
      "emailInsights": [
        { "from": "Sender", "subject": "Subject", "action": "Recommendation", "priority": "high|medium|low" }
      ],
      "recommendedSchedule": [
        { "time": "Slot", "activity": "Name", "reason": "Why this slot?", "duration": "X min" }
      ],
      "weeklyAnalysis": {
        "summary": "1-2 sentence analysis of the last 7 days",
        "topCategory": "Meeting | Focus | Admin",
        "productivityScore": 1-100
      },
      "motivationalNote": "A brief tip or encouraging sign-off."
    }

    IMPORTANT INSTRUCTIONS:
    - You MUST include "Wake Up" and "Sleep" times in 'todayReminders' if they exist in the context. They are non-negotiable anchors.
    - Focus on 'todayReminders' for the current day only.
    - Acknowledge any recently added schedule or routine updates for today or tomorrow.
    - Ensure 'recommendedSchedule' suggests slots for focus or breaks based on the gaps in busy slots.
  `;

  let briefing: any = null

  try {
    const text = await getAIResponse([
      { role: "system", content: "You are a specialized JSON generator for executive briefings. Output ONLY valid JSON." },
      { role: "user", content: briefingPrompt }
    ], {
      jsonMode: true
    });

    briefing = JSON.parse(text)
  } catch (err) {
    console.error('[Briefing] AI failed:', err)
    briefing = {
      greeting: `Good ${new Date().getHours() < 12 ? 'morning' : 'afternoon'}!`,
      urgentAlerts: [],
      todayReminders: busySlots.map(s => {
        const durMs = new Date(s.end).getTime() - new Date(s.start).getTime();
        const durMins = Math.round(durMs / 60000);
        return {
          time: new Date(s.start).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
          endTime: new Date(s.end).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
          title: s.title || 'Calendar event',
          description: s.description || 'No description provided.',
          duration: durMins >= 60 ? `${Math.floor(durMins / 60)}h ${durMins % 60}m` : `${durMins}m`,
          type: 'calendar',
          urgency: 'medium'
        }
      }),
      emailInsights: emails.slice(0, 3).map(e => ({
        from: e.from?.split('<')[0]?.trim() ?? 'Unknown',
        subject: e.subject,
        action: 'Review and respond',
        priority: 'medium'
      })),
      recommendedSchedule: [],
      weeklyAnalysis: {
        summary: "Weekly data is being processed. Stay tuned!",
        topCategory: "Focus",
        productivityScore: 85
      },
      motivationalNote: 'Stay focused and take it one task at a time! 💪'
    }
  }

  return NextResponse.json({ briefing, tasksCount: tasks.length, emailsCount: emails.length })
}
