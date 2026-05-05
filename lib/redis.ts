import { createClient } from 'redis'

const REDIS_URL = process.env.REDIS_URL || process.env.calend_ai_kv_REDIS_URL

let redisClient: ReturnType<typeof createClient> | null = null

export function getRedisClient() {
  if (!redisClient) {
    redisClient = createClient({
      url: REDIS_URL,
      socket: {
        reconnectStrategy: (retries) => {
          if (retries > 10) return new Error('Redis reconnection failed after 10 attempts')
          return Math.min(retries * 50, 2000)
        },
        connectTimeout: 5000,
      }
    })

    redisClient.on('error', (err) => {
      console.error('[Redis] Client Error:', err.message)
    })

    redisClient.on('connect', () => {
      console.log('[Redis] Connected successfully')
    })
  }
  return redisClient
}

export async function connectRedis() {
  const client = getRedisClient()
  if (!client.isOpen) {
    try {
      await client.connect()
    } catch (err) {
      console.error('[Redis] Connection failed:', err)
    }
  }
  return client
}
