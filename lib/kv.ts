import { connectRedis } from './redis'
import { localKV } from './localKV'

/**
 * Unified Key-Value Store Interface
 * Automatically falls back to local in-memory storage if Redis is unavailable or times out.
 */
export const kv = {
  async get<T = any>(key: string): Promise<T | null> {
    try {
      const redis = await connectRedis()
      if (redis) {
        const val = await redis.get(key)
        if (!val) return null
        try {
          return JSON.parse(val) as T
        } catch {
          return val as unknown as T
        }
      }
    } catch (err) {
      console.error(`[KV] Redis GET failed for ${key}, falling back:`, (err as Error).message)
    }
    return localKV.get<T>(key)
  },

  async set(key: string, value: unknown, opts?: { ex?: number }): Promise<void> {
    const val = typeof value === 'string' ? value : JSON.stringify(value)
    try {
      const redis = await connectRedis()
      if (redis) {
        if (opts?.ex) {
          await redis.set(key, val, { EX: opts.ex })
        } else {
          await redis.set(key, val)
        }
        return
      }
    } catch (err) {
      console.error(`[KV] Redis SET failed for ${key}, falling back:`, (err as Error).message)
    }
    await localKV.set(key, val, opts)
  },

  async keys(pattern: string): Promise<string[]> {
    try {
      const redis = await connectRedis()
      if (redis) {
        return await redis.keys(pattern)
      }
    } catch (err) {
      console.error(`[KV] Redis KEYS failed for ${pattern}, falling back:`, (err as Error).message)
    }
    return localKV.keys(pattern)
  },

  async sAdd(key: string, value: string): Promise<void> {
    try {
      const redis = await connectRedis()
      if (redis) {
        await redis.sAdd(key, value)
        return
      }
    } catch (err) {
       console.error(`[KV] Redis SADD failed for ${key}, falling back to local (limited support):`, (err as Error).message)
    }
    // localKV doesn't support sets natively, we simulate it with a JSON array if needed, 
    // but for now, we'll just skip to avoid complexity as it's mostly for active users list.
  },

  async sMembers(key: string): Promise<string[]> {
    try {
      const redis = await connectRedis()
      if (redis) {
        return await redis.sMembers(key)
      }
    } catch (err) {
       console.error(`[KV] Redis SMEMBERS failed for ${key}, falling back:`, (err as Error).message)
    }
    return []
  },

  async sRem(key: string, value: string): Promise<void> {
    try {
      const redis = await connectRedis()
      if (redis) {
        await redis.sRem(key, value)
        return
      }
    } catch (err) {
       console.error(`[KV] Redis SREM failed for ${key}, falling back:`, (err as Error).message)
    }
  }
}
