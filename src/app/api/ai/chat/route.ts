import { NextResponse } from "next/server";

import { isAiConfigured } from "@/lib/ai/config";
import { runAssistantTurn, type ChatMessage } from "@/lib/ai/chat";

const MAX_MESSAGES = 20;
const MAX_MESSAGE_CHARS = 4000;
const RATE_LIMIT = 12;
const RATE_WINDOW_MS = 60_000;

/** Cheap in-memory per-IP limiter for the unauthenticated paid-API endpoint. */
const rateBucket = new Map<string, { count: number; reset: number }>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateBucket.get(ip);
  if (!entry || now > entry.reset) {
    rateBucket.set(ip, { count: 1, reset: now + RATE_WINDOW_MS });
    return false;
  }
  entry.count += 1;
  return entry.count > RATE_LIMIT;
}

function safePathname(value: unknown): string {
  if (
    typeof value === "string" &&
    value.startsWith("/") &&
    !value.includes("\n") &&
    value.length <= 200
  ) {
    return value;
  }
  return "/";
}

export async function POST(request: Request) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: "RATE_LIMITED", message: "Too many requests — try again in a minute." },
      { status: 429 },
    );
  }

  if (!isAiConfigured()) {
    return NextResponse.json({ error: "AI_ASSISTANT_NOT_CONFIGURED" }, { status: 503 });
  }

  const body = (await request.json().catch(() => null)) as {
    messages?: unknown;
    context?: { pathname?: unknown; buildSlugs?: unknown };
  } | null;

  if (!body || !Array.isArray(body.messages)) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const recentMessages = body.messages.slice(-MAX_MESSAGES);

  const history: ChatMessage[] = [];
  for (const entry of recentMessages) {
    if (
      typeof entry !== "object" ||
      entry === null ||
      !("role" in entry) ||
      !("content" in entry) ||
      typeof entry.role !== "string" ||
      typeof entry.content !== "string"
    ) {
      return NextResponse.json({ error: "Invalid messages." }, { status: 400 });
    }
    if (entry.role !== "user" && entry.role !== "assistant") continue;
    history.push({ role: entry.role, content: entry.content.slice(0, MAX_MESSAGE_CHARS) });
  }

  const pathname = safePathname(body.context?.pathname);
  let buildSlugs: Record<string, string> | undefined;
  if (
    typeof body.context?.buildSlugs === "object" &&
    body.context.buildSlugs !== null &&
    !Array.isArray(body.context.buildSlugs)
  ) {
    buildSlugs = {};
    for (const [category, slug] of Object.entries(body.context.buildSlugs)) {
      if (typeof slug === "string" && slug.length <= 100) {
        buildSlugs[category] = slug;
      }
    }
  }

  try {
    const result = await runAssistantTurn(history, { pathname, buildSlugs });
    return NextResponse.json({ reply: result.reply, toolsUsed: result.toolsUsed });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message === "AI_NOT_CONFIGURED") {
      return NextResponse.json({ error: "AI_ASSISTANT_NOT_CONFIGURED" }, { status: 503 });
    }
    console.error("AI assistant error:", message);
    return NextResponse.json(
      { error: "The assistant had a problem. Please try again." },
      { status: 502 },
    );
  }
}
