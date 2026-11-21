/**
 * The grounded assistant turn: system rules + tool loop against any
 * OpenAI-compatible endpoint (Groq/OpenAI/OpenRouter/Gemini-compat/Ollama).
 *
 * Grounding rules enforced by the system prompt + tool design:
 * the model may only state facts that came from tool results, must link
 * products it mentions, and must say so when data is missing.
 */

import { getAiConfig } from "./config";
import { executeTool, TOOL_DEFINITIONS } from "./tools";

export type ChatMessage = {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  tool_call_id?: string;
  tool_calls?: Array<{
    id: string;
    type: "function";
    function: { name: string; arguments: string };
  }>;
};

const MAX_TOOL_ROUNDS = 6;
const MAX_TOOL_RESULT_CHARS = 2000;
/** Groq free tier is 8000 TPM — keep per-request token usage lean. */
const MAX_COMPLETION_TOKENS = 800;
const MAX_HISTORY_CHARS = 1200;
/** Trim persisted history so old turns don't eat the token budget. */
function trimHistory(history: ChatMessage[]): ChatMessage[] {
  const kept: ChatMessage[] = [];
  let chars = 0;
  for (let i = history.length - 1; i >= 0; i -= 1) {
    const length = history[i].content.length;
    if (chars + length > MAX_HISTORY_CHARS && kept.length >= 2) break;
    chars += length;
    kept.unshift(history[i]);
    if (kept.length >= 8) break;
  }
  return kept;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Parses Groq's "Please try again in X.XXs" hint out of a 429 body. */
function retryDelayMs(body: string): number {
  const match = /try again in ([\d.]+)s/.exec(body);
  return match ? Math.min(10_000, Math.ceil(parseFloat(match[1]) * 1000) + 250) : 2000;
}

export type AssistantContext = {
  pathname: string;
  /** Optional build context (category -> slug), only trusted from our own builder page. */
  buildSlugs?: Record<string, string>;
};

function systemPrompt(context: AssistantContext): string {
  const onBuild = context.pathname.startsWith("/build");
  const onProduct = context.pathname.startsWith("/product/");
  const productSlug = onProduct ? context.pathname.split("/")[2] : null;
  const onCart = context.pathname.startsWith("/cart");

  return [
    "You are the PC Shop shopping assistant — a knowledgeable, friendly PC-building expert helping customers on an online PC-parts store.",
    "",
    "STRICT GROUNDING RULES:",
    "1. Technical facts (specs, prices, stock, compatibility, performance) MUST come from tool results. Never state a spec, price, or compatibility claim from memory.",
    "2. When the user asks about products, prices, compatibility, or performance, CALL the relevant tool FIRST — do not ask clarifying questions that a tool lookup can answer (e.g. if they give a budget, search with it).",
    "3. If a tool returns no data or an error, say you don't have that information and suggest what the customer could check instead.",
    "4. Every product you mention must be linked as [Product Name](/product/slug) using the slug from tool results.",
    "5. Compatibility and performance claims must come from check_compatibility / estimate_build_performance tool outputs — quote their findings.",
    "6. Keep answers concise (a few sentences or a short list). You may give general PC-building advice, but never invent part names, prices, or specs.",
    "7. When listing products: one per line, formatted as '- [Product Name](/product/slug) — price — one-line reason'. ALWAYS include the product link and price so the customer can check.",
    "8. Formatting: plain text only. NEVER use markdown tables, headers, or code blocks.",
    "9. TOPIC SCOPE: You only answer questions about PC parts, PC building, and this shop's products. For anything unrelated (math, general knowledge, other products), politely decline in one short sentence and steer back to PC shopping.",
    "",
    `The customer is currently on: ${context.pathname}`,
    onBuild && context.buildSlugs && Object.keys(context.buildSlugs).length > 0
      ? "- This is the PC Builder page. The customer's currently selected build parts are provided below as 'current_build' — treat 'my build' as referring to these."
      : "",
    onProduct && productSlug
      ? `- This is a product page. The product being viewed is likely slug: ${productSlug}. 'this one' / 'this part' refers to it — fetch its details with get_product_details.`
      : "",
    onCart ? "- This is the cart page. The customer may ask about items they are buying." : "",
  ]
    .filter(Boolean)
    .join("\n");
}

type GroqToolCall = {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
};

type GroqResponse = {
  choices: Array<{
    message: {
      role: "assistant";
      content: string | null;
      tool_calls?: GroqToolCall[];
    };
    finish_reason: string;
  }>;
};

export type AssistantTurnResult = {
  reply: string;
  toolsUsed: string[];
};

export async function runAssistantTurn(
  history: ChatMessage[],
  context: AssistantContext,
): Promise<AssistantTurnResult> {
  const config = getAiConfig();
  if (!config) throw new Error("AI_NOT_CONFIGURED");

  const contextLines: string[] = [];
  if (context.buildSlugs && Object.keys(context.buildSlugs).length > 0) {
    contextLines.push(
      `current_build (category -> product slug): ${JSON.stringify(context.buildSlugs)}`,
    );
  }

  const messages: ChatMessage[] = [
    {
      role: "system",
      content: `${systemPrompt(context)}${
        contextLines.length > 0
          ? `\n\nContext data:\n${contextLines.join("\n")}`
          : ""
      }`,
    },
    ...trimHistory(history),
  ];

  const toolsUsed: string[] = [];

  const callLlm = async (): Promise<Response> => {
    // 429-aware retry: Groq TPM limits are per-minute; wait out the window
    // instead of failing the whole turn.
    let attempt = 0;
    for (;;) {
      const response = await fetch(`${config.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify({
          model: config.model,
          messages,
          tools: TOOL_DEFINITIONS,
          tool_choice: "auto",
          temperature: 0.2,
          max_tokens: MAX_COMPLETION_TOKENS,
        }),
        signal: AbortSignal.timeout(45_000),
      });
      if (response.status === 429 && attempt < 2) {
        const body = await response.text().catch(() => "");
        await sleep(retryDelayMs(body));
        attempt += 1;
        continue;
      }
      return response;
    }
  };

  for (let round = 0; round < MAX_TOOL_ROUNDS; round += 1) {
    const response = await callLlm();

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new Error(`LLM_ERROR_${response.status}: ${body.slice(0, 300)}`);
    }

    const data = (await response.json()) as GroqResponse;
    const message = data.choices[0]?.message;
    if (!message) throw new Error("LLM returned no message");

    if (!message.tool_calls || message.tool_calls.length === 0) {
      return { reply: message.content ?? "", toolsUsed };
    }

    // Don't execute tools on the final round — their results would be dropped.
    if (round === MAX_TOOL_ROUNDS - 1) {
      return {
        reply:
          "That question needed too many lookups for one answer — try breaking it into smaller questions.",
        toolsUsed,
      };
    }

    messages.push({
      role: "assistant",
      content: message.content ?? "",
      tool_calls: message.tool_calls,
    });

    for (const toolCall of message.tool_calls) {
      let args: Record<string, unknown> = {};
      try {
        args = JSON.parse(toolCall.function.arguments || "{}") as Record<
          string,
          unknown
        >;
      } catch {
        args = {};
      }
      toolsUsed.push(toolCall.function.name);
      const result = await executeTool(toolCall.function.name, args);
      messages.push({
        role: "tool",
        tool_call_id: toolCall.id,
        content: JSON.stringify(result).slice(0, MAX_TOOL_RESULT_CHARS),
      });
    }
  }

  return {
    reply:
      "That question needed too many lookups for one answer — try breaking it into smaller questions.",
    toolsUsed,
  };
}
