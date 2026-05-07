import { kv } from './kv'

export async function saveGoogleToken(userId: string, accessToken: string) {
  try {
    // Store token. We set an expiration of 1 hour since Google access tokens expire then.
    await kv.set(`token:google:${userId}`, accessToken, { ex: 3600 })
    // Also add to a set of active users for the cron job to iterate over
    await kv.sAdd('users:active_google', userId)
  } catch (err) {
    console.error('[RedisTokens] saveGoogleToken failed:', err)
  }
}

export async function getActiveUsersWithTokens(): Promise<{ userId: string; token: string }[]> {
  try {
    const users = await kv.sMembers('users:active_google')
    const results: { userId: string; token: string }[] = []
    
    for (const userId of users) {
      const token = await kv.get<string>(`token:google:${userId}`)
      if (token) {
        results.push({ userId, token })
      } else {
        // Token expired, remove user from active set
        await kv.sRem('users:active_google', userId)
      }
    }
    return results
  } catch (err) {
    console.error('[RedisTokens] getActiveUsersWithTokens failed:', err)
    return []
  }
}
