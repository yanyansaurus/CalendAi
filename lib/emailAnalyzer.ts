import { getGeminiModel, getFallbackGeminiModel } from './gemini'

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
Output only valid JSON.
`

export async function analyzeEmailWithGemini(email: { subject: string; body: string }) {
  const prompt = EMAIL_ANALYZER_PROMPT
    .replace('{{subject}}', email.subject)
    .replace('{{body}}', email.body.substring(0, 500))
    .replace('{{currentTime}}', new Date().toLocaleString())

  let model = getGeminiModel(prompt)
  
  try {
    const response = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: "Analyze this email and return only valid JSON." }] }],
      generationConfig: { temperature: 0, responseMimeType: "application/json" },
    })
    
    return JSON.parse(response.response.text())
  } catch (error: any) {
    console.warn('Primary model failed for email analysis, trying fallback:', error.message)
    
    try {
      model = getFallbackGeminiModel(prompt)
      const fallbackResponse = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: "Analyze this email and return only valid JSON." }] }],
        generationConfig: { temperature: 0, responseMimeType: "application/json" },
      })
      return JSON.parse(fallbackResponse.response.text())
    } catch (fallbackError) {
      console.error('Error analyzing email with fallback Gemini:', fallbackError)
      return { shouldSuggest: false }
    }
  }
}
