import { ChatOpenAI } from "@langchain/openai"
import { contrarian } from "../agents/personas/contrarian"

export function createAIMLModel(model: string, temperature = 0.4) {
  return new ChatOpenAI({
    model,
    temperature,
    maxRetries: 3,
    apiKey: process.env.AIML_API_KEY,
    configuration: { baseURL: "https://api.aimlapi.com/v1", timeout: 60_000 },
  })
}
export const AIML_PERSONA_MODELS = {
  premiumSeller: "alibaba/qwen3.6-27b",
  volatilityHunter: "deepseek/deepseek-v4-flash",
  //   contrarian: "moonshot/kimi-k2-5",
  contrarian: "deepseek/deepseek-v4-flash",
} as const
