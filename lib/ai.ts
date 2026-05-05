import { GoogleGenerativeAI } from "@google/generative-ai";
import Groq from "groq-sdk";

// Clients
const genAI = process.env.GEMINI_API_KEY ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY) : null;

// Helper to get Groq client dynamically
function getGroqClient() {
  if (!process.env.GROQ_API_KEY) return null;
  return new Groq({ apiKey: process.env.GROQ_API_KEY });
}

export type AIProvider = "groq" | "gemini";

export interface AIMessage {
  role: "system" | "user" | "assistant";
  content: string | AIContentPart[];
}

export interface AIContentPart {
  type: "text" | "image_url";
  text?: string;
  image_url?: {
    url: string; // base64 data URL
  };
}

export interface AIOptions {
  provider?: AIProvider;
  model?: string;
  temperature?: number;
  jsonMode?: boolean;
}

/**
 * The Universal AI Adapter
 */
export async function getAIResponse(messages: AIMessage[], options: AIOptions = {}) {
  // Default to groq if key is present, otherwise gemini
  const provider = options.provider || (process.env.GROQ_API_KEY ? "groq" : "gemini");
  
  if (provider === "groq") {
    return callGroq(messages, options);
  } else {
    return callGemini(messages, options);
  }
}

async function callGroq(messages: AIMessage[], options: AIOptions) {
  const client = getGroqClient();
  if (!client) {
    console.warn("[AI Bridge] Groq API key is missing. Falling back to Gemini.");
    return callGemini(messages, options);
  }

  // Updated model names for Groq
  const hasImages = messages.some(m => Array.isArray(m.content) && m.content.some(p => p.type === "image_url"));
  const model = options.model || (hasImages ? "llama-3.2-11b-vision-preview" : "llama-3.3-70b-versatile");
  
  try {
    const response = await client.chat.completions.create({
      messages: messages as any,
      model,
      temperature: options.temperature ?? 0.2,
      response_format: options.jsonMode ? { type: "json_object" } : undefined,
    });
    return response.choices[0]?.message?.content || "";
  } catch (error: any) {
    console.error("[Groq] Error:", error.message);
    return callGemini(messages, options);
  }
}

async function callGemini(messages: AIMessage[], options: AIOptions) {
  if (!genAI) {
    throw new Error("Gemini API key is missing.");
  }

  const hasImages = messages.some(m => Array.isArray(m.content) && m.content.some(p => p.type === "image_url"));
  let modelName = "gemini-2.5-flash"; 
  
  if (options.model && options.model.startsWith("gemini-")) {
    modelName = options.model;
  }

  const model = genAI.getGenerativeModel({ model: modelName });

  let systemMessage = messages.find(m => m.role === "system")?.content;
  
  // ── Gemini Prompt Optimization ──────────────────────────────────────────
  // If system message is too long, move context to the first user message
  let extraContext = "";
  if (typeof systemMessage === "string" && systemMessage.length > 8000) {
    extraContext = `\n\n### ADDITIONAL CONTEXT & RULES:\n${systemMessage}`;
    systemMessage = "You are ExecutiveVAi. You must follow the structured JSON output rules provided in the context. Respond ONLY as the assistant.";
  }

  const history = messages
    .filter(m => m.role !== "system")
    .map((m, idx) => {
      let content = m.content;
      // Inject extra context into the first user message if needed
      if (idx === 0 && extraContext && typeof content === "string") {
        content = content + extraContext;
      }

      if (typeof content === "string") {
        return {
          role: m.role === "user" ? "user" : "model",
          parts: [{ text: content }],
        };
      } else {
        return {
          role: m.role === "user" ? "user" : "model",
          parts: content.map(part => {
            if (part.type === "text") return { text: part.text };
            const dataUrl = part.image_url?.url || "";
            const [mimeType, base64] = dataUrl.replace("data:", "").split(";base64,");
            return {
              inlineData: { mimeType, data: base64 }
            };
          })
        };
      }
    });

  // Ensure history starts with 'user' role
  while (history.length > 0 && history[0].role !== 'user') {
    history.shift();
  }

  const userContent = history.pop()?.parts || [];

  const chat = model.startChat({
    history: history as any,
    systemInstruction: typeof systemMessage === "string" ? systemMessage : undefined,
  });

  const result = await chat.sendMessage(userContent as any);
  return result.response.text();
}
