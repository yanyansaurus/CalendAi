import { createClient } from 'redis'

const REDIS_URL = process.env.REDIS_URL || process.env.calend_ai_kv_REDIS_URL

let redisClient: ReturnType<typeof createClient> | null = null

export function getRedisClient() {
  if (!redisClient) {
    redisClient = createClient({
      url: REDIS_URL,
      socket: {
        keepAlive: true, // Enable TCP keep-alive
        reconnectStrategy: (retries) => {
          // Exponential backoff with a cap
          const delay = Math.min(retries * 100, 3000)
          return delay
        },
        connectTimeout: 10000,
      }
    })

    redisClient.on('error', (err) => {
      // Suppress 'Socket closed unexpectedly' noise as it's handled by reconnection logic
      if (err.message.includes('Socket closed unexpectedly')) return
      console.error('[Redis] Client Error:', err.message)
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
