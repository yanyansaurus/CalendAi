import { connectRedis } from './redis'

export async function saveGoogleToken(userId: string, accessToken: string) {
  const redis = await connectRedis()
  try {
    // Store token. We set an expiration of 1 hour since Google access tokens expire then.
    await redis.set(`token:google:${userId}`, accessToken, { EX: 3600 })
    // Also add to a set of active users for the cron job to iterate over
    await redis.sAdd('users:active_google', userId)
  } catch (err) {
    console.error('[Redis] saveGoogleToken failed:', err)
  }
}

export async function getActiveUsersWithTokens(): Promise<{ userId: string; token: string }[]> {
  try {
    const redis = await connectRedis()
    const users = await redis.sMembers('users:active_google')
    const results: { userId: string; token: string }[] = []
    
    for (const userId of users) {
      const token = await redis.get(`token:google:${userId}`)
      if (token) {
        results.push({ userId, token })
      } else {
        // Token expired, remove user from active set
        await redis.sRem('users:active_google', userId)
      }
    }
    return results
  } catch (err) {
    console.error('[Redis] getActiveUsersWithTokens failed:', err)
    return []
  }
}

// Notification logic removed to reduce Redis load and Gemini quota usage.
