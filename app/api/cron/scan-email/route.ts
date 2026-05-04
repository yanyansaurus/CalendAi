import { NextResponse } from 'next/server'
import { getActiveUsersWithTokens, pushEmailNotification } from '@/lib/redisTokens'
import { getUnreadEmails } from '@/lib/gmail'
import { analyzeEmailWithGemini } from '@/lib/emailAnalyzer'

export const runtime = 'nodejs' // Use nodejs because 'redis' package might rely on node APIs
export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization')
  
  // Basic security, bypassing in dev if CRON_SECRET is missing, but requiring it otherwise.
  if (process.env.NODE_ENV !== 'development' && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const activeUsers = await getActiveUsersWithTokens()
  
  for (const { userId, token } of activeUsers) {
    try {
      // Fetch top 5 unread emails to prevent exceeding quota
      const emails = await getUnreadEmails(token, 5)
      
      for (const email of emails) {
        const suggestion = await analyzeEmailWithGemini(email)
        
        if (suggestion.shouldSuggest) {
          // Add the original email details to the suggestion for UI context
          const enhancedSuggestion = {
            ...suggestion,
            emailSubject: email.subject,
            emailFrom: email.from,
            timestamp: new Date().toISOString()
          }
          await pushEmailNotification(userId, enhancedSuggestion)
        }
      }
    } catch (e) {
      console.error(`Error scanning emails for user ${userId}:`, e)
    }
  }

  return NextResponse.json({ ok: true, usersScanned: activeUsers.length })
}
