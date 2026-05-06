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

  // 1. Try to find JSON block if model wrapped it in markdown or added text around it
  const jsonMatch = trimmed.match(/\{[\s\S]*\}/)
  const candidate = jsonMatch ? jsonMatch[0] : trimmed

  try {
    const action = JSON.parse(candidate) as AgentAction
    // If it has an intent, we treat it as an action
    if (action.intent) {
      return { isChat: action.intent === 'chat', action }
    }
  } catch (e) {
    // Not valid JSON or didn't contain JSON
  }

  // 2. Fallback to legacy CHAT: prefix
  if (trimmed.startsWith('CHAT:')) {
    return {
      isChat:   true,
      chatText: trimmed.slice(5).trim(),
    }
  }

  // 3. Final Fallback: treat as plain text chat
  return {
    isChat:   true,
    chatText: trimmed,
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
