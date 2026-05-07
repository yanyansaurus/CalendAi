import { GoogleGenerativeAI } from "@google/generative-ai";
import Groq from "groq-sdk";
import { VertexAI } from '@google-cloud/vertexai';

// Clients
const genAI = process.env.GEMINI_API_KEY ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY) : null;

// Vertex AI Client (Google Cloud Enterprise)
// Supports local ADC or Vercel Service Account Key via GCP_SERVICE_ACCOUNT_KEY env
if (process.env.GCP_SERVICE_ACCOUNT_KEY) {
  console.log("[Vertex AI] Using Service Account Key from environment.");
} else if (process.env.GOOGLE_CLOUD_PROJECT) {
  console.log("[Vertex AI] Using Application Default Credentials (ADC).");
}

import { GoogleAuth } from 'google-auth-library';

function getServiceAccountCredentials() {
  const rawKey = process.env.GCP_SERVICE_ACCOUNT_KEY;
  if (!rawKey) return undefined;
  try {
    const cleanedKey = rawKey.trim().replace(/^['"]|['"]$/g, '');
    const creds = JSON.parse(cleanedKey);
    if (creds.client_email) {
      console.log(`[Vertex AI] Credentials loaded for: ${creds.client_email}`);
    }
    return creds;
  } catch (err) {
    console.error("[Vertex AI] Failed to parse GCP_SERVICE_ACCOUNT_KEY.");
    return undefined;
  }
}

const credentials = getServiceAccountCredentials();

// Explicitly create an auth client to avoid library-level state issues
const auth = credentials ? new GoogleAuth({
  credentials,
  projectId: process.env.GOOGLE_CLOUD_PROJECT,
  scopes: 'https://www.googleapis.com/auth/cloud-platform'
}) : undefined;

const vertexAI = process.env.GOOGLE_CLOUD_PROJECT ? new VertexAI({
  project: process.env.GOOGLE_CLOUD_PROJECT,
  location: process.env.GOOGLE_CLOUD_LOCATION || 'us-central1',
  googleAuthOptions: auth as any // Use the explicit auth object
}) : null;

// Helper to get Groq client dynamically
function getGroqClient() {
  if (!process.env.GROQ_API_KEY) {
    console.warn("[ExecutiveVAi] Groq Key MISSING from environment.");
    return null;
  }
  return new Groq({ apiKey: process.env.GROQ_API_KEY });
}

export type AIProvider = "groq" | "gemini" | "vertex";

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
 * Priority: Vertex -> Groq -> Gemini (Legacy)
 */
export async function getAIResponse(messages: AIMessage[], options: AIOptions = {}) {
  const provider = options.provider || (vertexAI ? "vertex" : (process.env.GROQ_API_KEY ? "groq" : "gemini"));
  console.log(`[AI Adapter] Routing request to: ${provider} (model: ${options.model || 'default'})`);
  let text = "";

  try {
    if (provider === "vertex") {
      text = await callVertex(messages, options);
    } else if (provider === "groq") {
      text = await callGroq(messages, options);
    } else {
      text = await callGemini(messages, options);
    }
  } catch (err) {
    console.error(`[AI Adapter] Primary provider ${provider} failed, falling back...`);
    // Final desperate fallback if specific call failed
    if (provider !== "groq" && process.env.GROQ_API_KEY) return callGroq(messages, options);
    if (provider !== "gemini" && process.env.GEMINI_API_KEY) return callGemini(messages, options);
    throw err;
  }

  if (options.jsonMode) {
    // Robust JSON cleaning: Strip markdown backticks and whitespace
    const cleaned = text.replace(/```json/g, "").replace(/```/g, "").trim();
    return cleaned;
  }

  return text;
}

// ACTIVE MODELS ONLY
const GROQ_MODELS = [
  "llama-3.3-70b-versatile",
  "llama-3.1-8b-instant",
  "mixtral-8x7b-32768"
];

const GEMINI_MODELS = [
  "gemini-3-flash",
  "gemini-2.5-flash",
  "gemini-3.1-pro-preview",
  "gemini-1.5-flash" // Last resort legacy
];

async function callVertex(messages: AIMessage[], options: AIOptions) {
  console.log("[Vertex AI] INFO: callVertex triggered.");
  if (!vertexAI) {
    console.log("[Vertex AI] WARN: vertexAI client is null, falling back.");
    return callGroq(messages, options);
  }

  const modelName = options.model || "gemini-2.5-flash-001";
  try {
    const generativeModel = vertexAI.getGenerativeModel({
      model: modelName,
      generationConfig: {
        maxOutputTokens: 2048,
        temperature: options.temperature ?? 0.2,
        responseMimeType: options.jsonMode ? "application/json" : "text/plain",
      },
    });

    const systemMessage = messages.find(m => m.role === "system")?.content;
    const history = messages
      .filter(m => m.role !== "system")
      .map(m => ({
        role: m.role === "user" ? "user" : "model",
        parts: typeof m.content === "string" ? [{ text: m.content }] : m.content.map(p => ({ text: p.text }))
      }));

    const result = await generativeModel.generateContent({
      contents: history as any,
      systemInstruction: typeof systemMessage === "string" ? {
        role: 'system',
        parts: [{ text: systemMessage }]
      } : undefined,
    });

    console.log("[Vertex AI] Success: Response generated.");
    return result.response.candidates?.[0]?.content?.parts?.[0]?.text || "";
  } catch (error: any) {
    console.warn(`[Vertex AI] Failed: ${error.message}. Falling back to Groq.`);
    return callGroq(messages, options);
  }
}

async function callGroq(messages: AIMessage[], options: AIOptions) {
  const client = getGroqClient();
  if (!client) return callGemini(messages, options);

  const hasImages = messages.some(m => Array.isArray(m.content) && m.content.some(p => p.type === "image_url"));

  // Use the requested model first, then the rotation list
  const modelsToTry = options.model ? [options.model, ...GROQ_MODELS] : GROQ_MODELS;
  const filteredModels = hasImages ? ["llama-3.2-11b-vision-preview"] : Array.from(new Set(modelsToTry));

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

  for (const currentModelName of GEMINI_MODELS) {
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
      const isRetryable = errorMsg.includes("429") || errorMsg.includes("rate_limit") || errorMsg.includes("quota") || errorMsg.includes("404") || errorMsg.includes("not found") || errorMsg.includes("400");

      if (isRetryable) continue;
      break;
    }
  }

  throw new Error("All AI failover options exhausted.");
}
