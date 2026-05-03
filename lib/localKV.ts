/**
 * Local in-memory KV store — used when Vercel KV env vars are missing.
 * Resets on server restart. For local dev only.
 */

const store = new Map<string, { value: string; expiresAt?: number }>()

function isExpired(entry: { expiresAt?: number }) {
  return entry.expiresAt !== undefined && Date.now() > entry.expiresAt
}

export const localKV = {
  async get<T = string>(key: string): Promise<T | null> {
    const entry = store.get(key)
    if (!entry || isExpired(entry)) { store.delete(key); return null }
    try { return JSON.parse(entry.value) as T } catch { return entry.value as unknown as T }
  },
  async set(key: string, value: unknown, opts?: { ex?: number }) {
    const serialized = typeof value === 'string' ? value : JSON.stringify(value)
    store.set(key, {
      value: serialized,
      expiresAt: opts?.ex ? Date.now() + opts.ex * 1000 : undefined,
    })
  },
  async keys(pattern: string): Promise<string[]> {
    const prefix = pattern.replace('*', '')
    return Array.from(store.keys()).filter((k) => k.startsWith(prefix) && !isExpired(store.get(k)!))
  },
}
