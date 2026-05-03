import { auth } from '@/lib/auth'
import { getGeminiModel, getFallbackGeminiModel } from '@/lib/gemini'
import { getUnreadEmails } from '@/lib/gmail'
import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const googleToken = session.googleAccessToken
  if (!googleToken) {
    return NextResponse.json({ error: 'Google not connected' }, { status: 400 })
  }

  const timezone = req.headers.get('x-timezone') ?? 'UTC'

  let emails: any[] = []
  try {
    emails = await getUnreadEmails(googleToken, 15)
  } catch (err: any) {
    console.error('[EmailSummary] Failed to fetch emails:', err.message)
    return NextResponse.json({ error: 'Failed to fetch emails' }, { status: 500 })
  }

  if (emails.length === 0) {
    return NextResponse.json({
      summary: {
        overview: 'Your inbox is clean! No unread emails right now.',
        totalEmails: 0,
        categories: [],
        actionItems: [],
        lowPriority: [],
      },
      emails: []
    })
  }

  const summaryPrompt = `
You are ExecutiveVAi analyzing emails for a busy professional. Current time: ${new Date().toISOString()}, timezone: ${timezone}.

Here are the user's unread emails:
${JSON.stringify(emails.map((e, i) => ({
  index: i,
  from: e.from,
  subject: e.subject,
  snippet: e.body?.substring(0, 200),
  date: e.date,
})))}

Generate a summary in this EXACT JSON format (no markdown, no code fences):
{
  "overview": "A 1-2 sentence summary of the inbox state",
  "totalEmails": ${emails.length},
  "categories": [
    {
      "name": "Category name (e.g. Work, School, Promotions, Social, Updates)",
      "count": 0,
      "icon": "emoji icon"
    }
  ],
  "actionItems": [
    {
      "from": "Sender name",
      "emailAddress": "sender@domain.com",
      "subject": "Email subject",
      "summary": "1-2 sentence summary of what this email is about",
      "suggestedAction": "What the user should do (e.g. Reply, Review, Schedule meeting)",
      "priority": "high|medium|low",
      "timeEstimate": "X min to handle"
    }
  ],
  "lowPriority": [
    {
      "from": "Sender name",
      "subject": "Subject",
      "reason": "Why this is low priority (e.g. Newsletter, Promotion, Auto-notification)"
    }
  ]
}

Rules:
- actionItems: top 5 most important emails that need attention
- lowPriority: remaining emails that can wait
- Be concise and actionable
- Categorize emails logically
`

  let summary: any = null
  try {
    const model = getGeminiModel()
    const result = await model.generateContent(summaryPrompt)
    let text = result.response.text().trim()
    text = text.replace(/^```json?\s*/i, '').replace(/```\s*$/i, '').trim()
    summary = JSON.parse(text)
  } catch {
    try {
      const fallback = getFallbackGeminiModel()
      const result = await fallback.generateContent(summaryPrompt)
      let text = result.response.text().trim()
      text = text.replace(/^```json?\s*/i, '').replace(/```\s*$/i, '').trim()
      summary = JSON.parse(text)
    } catch {
      summary = {
        overview: `You have ${emails.length} unread emails.`,
        totalEmails: emails.length,
        categories: [],
        actionItems: emails.slice(0, 5).map(e => ({
          from: e.from?.split('<')[0]?.trim() ?? 'Unknown',
          emailAddress: e.from?.match(/<([^>]+)>/)?.[1] ?? e.from,
          subject: e.subject,
          summary: 'Review this email',
          suggestedAction: 'Read and respond',
          priority: 'medium',
          timeEstimate: '2 min',
        })),
        lowPriority: emails.slice(5).map(e => ({
          from: e.from?.split('<')[0]?.trim() ?? 'Unknown',
          subject: e.subject,
          reason: 'Lower priority',
        })),
      }
    }
  }

  return NextResponse.json({ summary, emails })
}
