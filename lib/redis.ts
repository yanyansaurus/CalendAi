import { createClient } from 'redis'

const REDIS_URL = process.env.REDIS_URL || process.env.calend_ai_kv_REDIS_URL

let redisClient: ReturnType<typeof createClient> | null = null
let lastConnectErrorAt = 0
const CIRCUIT_BREAKER_MS = 30000 // 30 seconds

export function getRedisClient() {
  if (!redisClient) {
    redisClient = createClient({
      url: REDIS_URL,
      socket: {
        keepAlive: true,
        reconnectStrategy: (retries) => {
          if (retries > 5) return new Error('Too many retries')
          return Math.min(retries * 50, 1000)
        },
        connectTimeout: 500, // Reduced from 10s to 500ms
      }
    })

    redisClient.on('error', (err) => {
      if (err.message.includes('Socket closed unexpectedly')) return
      console.error('[Redis] Client Error:', err.message)
      lastConnectErrorAt = Date.now()
    })
  }
  return redisClient
}

export async function connectRedis() {
  // Circuit breaker: skip if we failed very recently
  if (Date.now() - lastConnectErrorAt < CIRCUIT_BREAKER_MS) {
    return null
  }

  const client = getRedisClient()
  if (!client.isOpen) {
    try {
      await client.connect()
    } catch (err) {
      console.error('[Redis] Connection failed:', (err as Error).message)
      lastConnectErrorAt = Date.now()
      return null
    }
  }
  return client
}
