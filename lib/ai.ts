import { GoogleGenerativeAI } from "@google/generative-ai";
import Groq from "groq-sdk";

// Clients
const genAI = process.env.GEMINI_API_KEY ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY) : null;

// Helper to get Groq client dynamically
function getGroqClient() {
  if (!process.env.GROQ_API_KEY) {
    console.warn("[ExecutiveVAi] Groq Key MISSING from environment.");
    return null;
  }
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
 * Priority: Groq -> Gemini
 */
export async function getAIResponse(messages: AIMessage[], options: AIOptions = {}) {
  const provider = options.provider || (process.env.GROQ_API_KEY ? "groq" : "gemini");
  console.log(`[AI Adapter] Routing request to: ${provider} (model: ${options.model || 'default'})`);
  let text = "";

  try {
    if (provider === "groq") {
      text = await callGroq(messages, options);
    } else {
      text = await callGemini(messages, options);
    }
  } catch (err) {
    console.error(`[AI Adapter] Primary provider ${provider} failed, falling back...`);
    if (provider !== "groq" && process.env.GROQ_API_KEY) return callGroq(messages, options);
    if (provider !== "gemini" && process.env.GEMINI_API_KEY) return callGemini(messages, options);
    throw err;
  }

  if (options.jsonMode) {
    const cleaned = text.replace(/```json/g, "").replace(/```/g, "").trim();
    return cleaned;
  }

  return text;
}

// ACTIVE MODELS ONLY
const GROQ_MODELS = [
  "llama-3.3-70b-versatile",
  "llama-3.1-8b-instant",
  "qwen/qwen3-32b",
  "meta-llama/llama-4-scout-17b-16e-instruct"
];

const GEMINI_MODELS = [
  "gemini-3.1-pro",
  "gemini-3.1-flash-lite",
  "gemini-2.5-pro",
  "gemini-2.5-flash",
  "gemini-2.0-flash",
  "gemini-1.5-pro",
  "gemini-1.5-flash"
];

async function callGroq(messages: AIMessage[], options: AIOptions) {
  const client = getGroqClient();
  if (!client) return callGemini(messages, options);

  const hasImages = messages.some(m => Array.isArray(m.content) && m.content.some(p => p.type === "image_url"));
  if (hasImages) {
    console.log("[Groq] Vision request detected, but no Groq vision models found in active list. Pivoting to Gemini.");
    return callGemini(messages, options);
  }

  const modelsToTry = options.model ? [options.model, ...GROQ_MODELS] : GROQ_MODELS;
  const filteredModels = Array.from(new Set(modelsToTry));

  for (const modelName of filteredModels) {
    try {
      const response = await client.chat.completions.create({
        messages: messages as any,
        model: modelName,
        temperature: options.temperature ?? 0.2,
        response_format: (options.jsonMode && !hasImages) ? { type: "json_object" } : undefined,
      });
      return response.choices[0]?.message?.content || "";
    } catch (error: any) {
      const errorMsg = error.message || "";
      console.warn(`[Groq] Model ${modelName} failover triggered: ${errorMsg.substring(0, 50)}...`);
      const isRetryable = errorMsg.includes("429") || errorMsg.includes("rate_limit") || errorMsg.includes("quota") || errorMsg.includes("404") || errorMsg.includes("not found") || errorMsg.includes("400");

      if (isRetryable) continue;
      break;
    }
  }

  console.error("[Groq] All models failed. Failing over to Gemini.");
  return callGemini(messages, options);
}

async function callGemini(messages: AIMessage[], options: AIOptions) {
  if (!genAI) throw new Error("Gemini API key is missing.");

  const hasImages = messages.some(m => Array.isArray(m.content) && m.content.some(p => p.type === "image_url"));
  const filteredModels = hasImages ? GEMINI_MODELS.filter(m => m.includes("1.5") || m.includes("2.0") || m.includes("2.5") || m.includes("3.1")) : GEMINI_MODELS;

  for (const currentModelName of filteredModels) {
    try {
      if (hasImages && !currentModelName.includes("1.5") && !currentModelName.includes("2.0") && !currentModelName.includes("2.5") && !currentModelName.includes("3.1")) {
        continue; // double check
      }
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
            console.log("[Gemini] Image detected in message parts.");
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
      if (history.length === 0) history.push({ role: "user", parts: [{ text: "Context summary requested." }] });

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
      const errorMsg = error.message?.toLowerCase() || "";
      console.warn(`[Gemini] Model ${currentModelName} failover triggered: ${errorMsg.substring(0, 50)}...`);
      
      if (errorMsg.includes("403") || errorMsg.includes("forbidden")) {
        console.error("❌ GEMINI API KEY ERROR: The Generative Language API is likely not enabled for this key. Please visit https://aistudio.google.com/app/apikey");
      }

      const isRetryable = errorMsg.includes("429") || errorMsg.includes("rate_limit") || errorMsg.includes("quota") || errorMsg.includes("404") || errorMsg.includes("not found") || errorMsg.includes("400");

      if (isRetryable) continue;
      break;
    }
  }

  throw new Error("All AI failover options exhausted.");
}
