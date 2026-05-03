import type { AgentAction } from '@/types'

/**
 * Parses the raw text output from Gemini.
 *
 * Gemini returns either:
 *  - A JSON object  → structured AgentAction
 *  - "CHAT: <text>" → plain conversational reply
 */
export function parseIntent(rawText: string): {
  isChat: boolean
  chatText?: string
  action?: AgentAction
} {
  const trimmed = rawText.trim()

  // Plain chat response
  if (trimmed.startsWith('CHAT:')) {
    return {
      isChat:   true,
      chatText: trimmed.slice(5).trim(),
    }
  }

  // Strip accidental markdown fences (model sometimes adds them)
  const cleaned = trimmed
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/,    '')
    .trim()

  try {
    const action = JSON.parse(cleaned) as AgentAction
    return { isChat: false, action }
  } catch {
    // Fallback: treat as chat if JSON parse fails
    return {
      isChat:   true,
      chatText: trimmed,
    }
  }
}

/**
 * Returns a colour ID (Google Calendar colorId) for a task type.
 * 1=lavender 2=sage 3=grape 4=flamingo 5=banana 6=tangerine
 * 7=peacock 8=blueberry 9=basil 10=tomato 11=avocado
 */
export function colorIdForType(type: string): string {
  const map: Record<string, string> = {
    focus:     '1',   // lavender
    deep_work: '7',   // peacock (blue)
    meeting:   '2',   // sage (green)
    admin:     '5',   // banana (yellow)
  }
  return map[type] ?? '1'
}
