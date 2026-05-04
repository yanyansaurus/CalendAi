import { createClient } from 'redis'

function getRedis() {
  return createClient({ url: process.env.REDIS_URL ?? process.env.calend_ai_kv_REDIS_URL })
}

export async function saveGoogleToken(userId: string, accessToken: string) {
  const redis = getRedis()
  await redis.connect()
  try {
    // Store token. We set an expiration of 1 hour since Google access tokens expire then.
    await redis.set(`token:google:${userId}`, accessToken, { EX: 3600 })
    // Also add to a set of active users for the cron job to iterate over
    await redis.sAdd('users:active_google', userId)
  } finally {
    await redis.disconnect()
  }
}

export async function getActiveUsersWithTokens(): Promise<{ userId: string; token: string }[]> {
  const redis = getRedis()
  await redis.connect()
  try {
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
  } finally {
    await redis.disconnect()
  }
}

export async function pushEmailNotification(userId: string, suggestion: any) {
  const redis = getRedis()
  await redis.connect()
  try {
    await redis.lPush(`notifications:${userId}`, JSON.stringify(suggestion))
  } finally {
    await redis.disconnect()
  }
}

export async function popEmailNotifications(userId: string): Promise<any[]> {
  const redis = getRedis()
  await redis.connect()
  try {
    const notifications: any[] = []
    while (true) {
      const item = await redis.rPop(`notifications:${userId}`)
      if (!item) break
      try {
        notifications.push(JSON.parse(item))
      } catch { /* ignore bad json */ }
    }
    return notifications
  } finally {
    await redis.disconnect()
  }
}
