import { getAIResponse } from './ai'

export const EMAIL_ANALYZER_PROMPT = `
You are an executive assistant analyzing a new email. Return a JSON object with:
- "shouldSuggest": boolean (true if the email requires an action like scheduling, replying, or reminding)
- "suggestedAction": one of: "schedule", "reply", "remind", "none"
- "proposedTask": string (short description, e.g., "Schedule board prep meeting")
- "proposedTime": string (if scheduling, suggest a time relative to now, e.g., "tomorrow at 10am")
- "userQuestion": string (a short yes/no question you would ask the CEO, e.g., "Schedule a 30‑minute prep session tomorrow at 10am?")

Email subject: {{subject}}
Email body preview: {{body}}
Current time: {{currentTime}}
`

export async function analyzeEmailWithGroq(email: { subject: string; body: string }) {
  const prompt = EMAIL_ANALYZER_PROMPT
    .replace('{{subject}}', email.subject)
    .replace('{{body}}', email.body.substring(0, 500))
    .replace('{{currentTime}}', new Date().toLocaleString())

  try {
    const text = await getAIResponse([
      { role: "system", content: "You are a specialized JSON generator for email triage. Output ONLY valid JSON." },
      { role: "user", content: prompt }
    ], { 
      jsonMode: true, 
      provider: "groq", 
      model: "llama-3.1-8b-instant" // Use 8b for fast, simple analysis
    });
    
    return JSON.parse(text)
  } catch (error: any) {
    console.error('Email analysis failed:', error.message)
    return { shouldSuggest: false }
  }
}
