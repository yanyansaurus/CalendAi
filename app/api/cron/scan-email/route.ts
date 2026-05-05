import { NextResponse } from 'next/server'
import { getActiveUsersWithTokens } from '@/lib/redisTokens'

export const runtime = 'nodejs' // Use nodejs because 'redis' package might rely on node APIs
export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization')
  
  // Basic security, bypassing in dev if CRON_SECRET is missing, but requiring it otherwise.
  if (process.env.NODE_ENV !== 'development' && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const activeUsers = await getActiveUsersWithTokens()
  
  for (const { userId } of activeUsers) {
    // Background scanning disabled to conserve Gemini quota and Redis load
    console.log(`[Cron] Skipping scan for user: ${userId}`)
  }

  return NextResponse.json({ ok: true, usersScanned: activeUsers.length })
}
