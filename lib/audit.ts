import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || '',
  token: process.env.UPSTASH_REDIS_REST_TOKEN || '',
})

export type AuditAction = 
  | 'meeting_created' 
  | 'meeting_canceled' 
  | 'expense_logged' 
  | 'routine_updated' 
  | 'email_sent'

export interface AuditEntry {
  timestamp: string
  userId: string
  action: AuditAction
  status: 'success' | 'failure' | 'partial'
  details: any
  metadata: {
    ip?: string
    userAgent?: string
  }
}

/**
 * Logs an immutable entry into the executive audit trail.
 * This is separate from chat history and cannot be deleted by the user.
 */
export async function logAudit(entry: Omit<AuditEntry, 'timestamp'>) {
  const fullEntry: AuditEntry = {
    ...entry,
    timestamp: new Date().toISOString(),
  }

  try {
    // Store in a time-series list in Redis: audit:{userId}
    const key = `audit:${entry.userId}`
    await redis.lpush(key, JSON.stringify(fullEntry))
    
    // Also log to console for server logs
    console.log(`[AUDIT] ${fullEntry.timestamp} | ${entry.userId} | ${entry.action} | ${entry.status}`)
  } catch (e) {
    console.error('Failed to write to audit log:', e)
  }
}

/**
 * Retrieves the audit trail for a specific user.
 */
export async function getAuditTrail(userId: string, limit = 50): Promise<AuditEntry[]> {
  try {
    const key = `audit:${userId}`
    const entries = await redis.lrange(key, 0, limit - 1)
    return (entries as string[]).map(e => JSON.parse(e))
  } catch (e) {
    console.error('Failed to fetch audit trail:', e)
    return []
  }
}
