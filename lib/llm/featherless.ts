// Path: lib/llm/featherless.ts
import { ChatOpenAI } from "@langchain/openai"

export function createFeatherlessModel(model: string, temperature = 0.4) {
  return new ChatOpenAI({
    model,
    temperature,
    maxRetries: 3,
    apiKey: process.env.FEATHERLESS_AI_API_KEY,
    configuration: { baseURL: "https://api.featherless.ai/v1", timeout: 25_000 },
  })
}

// Featherless model IDs are Hugging Face "org/model-name" slugs and the
// catalog changes — before relying on these, hit GET /v1/models with your
// key (or check featherless.ai/models) and confirm the exact id, and prefer
// a model documented for native tool/function calling (the Qwen3 family is
// one confirmed example) since these agents use structured output.
export const PERSONA_MODELS = {
  premiumSeller: "Qwen/Qwen3.5-4B",
  volatilityHunter: "deepseek-ai/DeepSeek-V4-Flash",
  contrarian: "moonshotai/Kimi-K2.5",
} as const
