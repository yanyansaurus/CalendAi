import { connectRedis } from './redis'

// Audit log now uses the primary Redis client to avoid configuration errors.
const getRedis = connectRedis;

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
    const redis = await connectRedis()
    if (redis) {
      const key = `audit:${entry.userId}`
      await redis.lPush(key, JSON.stringify(fullEntry))
    }
    
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
    const redis = await connectRedis()
    if (!redis) return []
    const key = `audit:${userId}`
    const entries = await redis.lRange(key, 0, limit - 1)
    return (entries as string[]).map(e => JSON.parse(e))
  } catch (e) {
    console.error('Failed to fetch audit trail:', e)
    return []
  }
}
