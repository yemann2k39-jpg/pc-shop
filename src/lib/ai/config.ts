/**
 * AI assistant configuration. Provider-agnostic: any OpenAI-compatible
 * endpoint works (Groq, OpenAI, OpenRouter, Gemini-compat, Ollama).
 * Unconfigured -> the assistant reports itself as unavailable.
 */

export type AiConfig = {
  baseUrl: string;
  apiKey: string;
  model: string;
};

export function getAiConfig(): AiConfig | null {
  const apiKey = process.env.AI_API_KEY;
  const baseUrl = process.env.AI_BASE_URL;
  const model = process.env.AI_MODEL;
  if (!apiKey || !baseUrl || !model) return null;
  return { apiKey, baseUrl: baseUrl.replace(/\/+$/, ""), model };
}

export function isAiConfigured(): boolean {
  return getAiConfig() !== null;
}
