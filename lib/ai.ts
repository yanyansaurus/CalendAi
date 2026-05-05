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
// Prioritized list of models (Highest quality to lowest)
const GROQ_MODELS = [
  "meta-llama/llama-4-scout-17b-16e-instruct",
  "openai/gpt-oss-120b",
  "meta-llama/llama-3.3-70b-versatile",
  "openai/gpt-oss-20b",
  "qwen/qwen3-32b",
  "meta-llama/llama-3.1-8b-instant"
];

/**
 * The Universal AI Adapter
 */
export async function getAIResponse(messages: AIMessage[], options: AIOptions = {}) {
  const provider = options.provider || (process.env.GROQ_API_KEY ? "groq" : "gemini");
  let text = "";
  if (provider === "groq") {
    text = await callGroq(messages, options);
  } else {
    text = await callGemini(messages, options);
  }

  if (options.jsonMode) {
    // Robust JSON cleaning: Strip markdown backticks and whitespace
    const cleaned = text.replace(/```json/g, "").replace(/```/g, "").trim();
    return cleaned;
  }

  return text;
}

async function callGroq(messages: AIMessage[], options: AIOptions) {
  const client = getGroqClient();
  if (!client) return callGemini(messages, options);

  const hasImages = messages.some(m => Array.isArray(m.content) && m.content.some(p => p.type === "image_url"));

  // Use the requested model first, then the rotation list
  const modelsToTry = options.model ? [options.model, ...GROQ_MODELS] : GROQ_MODELS;
  const filteredModels = hasImages ? ["llama-3.2-11b-vision-preview"] : Array.from(new Set(modelsToTry));

  let lastError: any = null;

  for (const modelName of filteredModels) {
    try {
      const response = await client.chat.completions.create({
        messages: messages as any,
        model: modelName,
        temperature: options.temperature ?? 0.2,
        response_format: options.jsonMode ? { type: "json_object" } : undefined,
      });
      return response.choices[0]?.message?.content || "";
    } catch (error: any) {
      lastError = error;
      const isRateLimit = error.message?.includes("429") || error.message?.includes("rate_limit") || error.message?.includes("quota");
      if (isRateLimit) {
        console.warn(`[Groq] Model ${modelName} hit limit. Rotating to next model...`);
        continue; // Try the next model
      }
      // If it's a different error, stop and failover to Gemini
      break;
    }
  }

  console.error("[Groq] All models failed or exhausted. Failing over to Gemini.");
  return callGemini(messages, options);
}

async function callGemini(messages: AIMessage[], options: AIOptions) {
  if (!genAI) throw new Error("Gemini API key is missing.");

  const geminiModels = [
    "gemini-3.1-pro",
    "gemini-3-flash",
    "gemini-3.1-flash-lite",
    "gemini-2.5-pro",
    "gemini-2.5-flash"
  ];
  let lastError: any = null;

  for (const currentModelName of geminiModels) {
    try {
      const model = genAI.getGenerativeModel({ model: currentModelName });
      let systemMessage = messages.find(m => m.role === "system")?.content;

      let extraContext = "";
      if (typeof systemMessage === "string" && systemMessage.length > 8000) {
        extraContext = `\n\n### ADDITIONAL CONTEXT & RULES:\n${systemMessage}`;
        systemMessage = "You are ExecutiveVAi. Follow the JSON rules provided. Respond ONLY as the assistant.";
      }

      const history = messages
        .filter(m => m.role !== "system")
        .map((m, idx) => {
          let content = m.content;
          if (idx === 0 && extraContext && typeof content === "string") content = content + extraContext;

          if (typeof content === "string") {
            return { role: m.role === "user" ? "user" : "model", parts: [{ text: content }] };
          } else {
            return {
              role: m.role === "user" ? "user" : "model",
              parts: content.map(part => {
                if (part.type === "text") return { text: part.text };
                const dataUrl = part.image_url?.url || "";
                const [mimeType, base64] = dataUrl.replace("data:", "").split(";base64,");
                return { inlineData: { mimeType, data: base64 } };
              })
            };
          }
        });

      while (history.length > 0 && history[0].role !== 'user') history.shift();
      const userContent = history.pop()?.parts || [];

      const chat = model.startChat({
        history: history as any,
        systemInstruction: typeof systemMessage === "string" ? {
          role: 'system',
          parts: [{ text: systemMessage }]
        } : undefined,
      });

      const result = await chat.sendMessage(userContent as any);
      return result.response.text();
    } catch (error: any) {
      lastError = error;
      const errorMsg = error.message?.toLowerCase() || "";
      const isRetryable = errorMsg.includes("429") || errorMsg.includes("rate_limit") || errorMsg.includes("quota") || errorMsg.includes("404") || errorMsg.includes("not found") || errorMsg.includes("400");
      
      if (isRetryable) {
        console.warn(`[Gemini] Model ${currentModelName} failed or throttled. Rotating...`);
        continue;
      }
      break;
    }
  }

  throw lastError || new Error("All Gemini models failed.");
}
