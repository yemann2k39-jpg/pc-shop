"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type Message = {
  role: "user" | "assistant";
  content: string;
};

const CHAT_STORAGE_KEY = "pc-shop-ai-chat";

/**
 * Support-agent bust (headset + mic + shoulders), drawn from the user's
 * reference image in strict black & white. `fg` is the icon color and
 * `face` should match the surface behind it so the face reads as a cutout.
 */
function AgentIcon({
  className,
  fg = "currentColor",
  face = "#18181b",
}: {
  className?: string;
  fg?: string;
  face?: string;
}) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className} aria-hidden="true">
      {/* shoulders */}
      <path
        d="M6.4 47.4c.6-8 7.4-12.2 17.6-12.2s17 4.2 17.6 12.2v.2H6.4v-.2Z"
        fill={fg}
      />
      {/* long hair framing the face */}
      <path
        d="M12 34c-1.8-3.2-2.8-9.4-2.8-15.4C9.2 8.6 15 4.6 24 4.6s14.8 4 14.8 14c0 6-1 12.2-2.8 15.4-2.1 1.2-4.4 1.6-6.6 1.2l.9-12.6h-12.6l.9 12.6c-2.2.4-4.5 0-6.6-1.2Z"
        fill={fg}
      />
      {/* face */}
      <ellipse cx="24" cy="20.2" rx="7.7" ry="8.7" fill={face} />
      {/* side-swept fringe */}
      <path
        d="M16.4 18.6c.9-5.4 3.9-8.4 7.6-8.4s6.7 3 7.6 8.4c-2.1-2.6-4.6-3.9-7.6-3.9s-5.5 1.3-7.6 3.9Z"
        fill={fg}
      />
      {/* headset band */}
      <path
        d="M13.2 12.4C14.8 6.8 18.8 4.2 24 4.2s9.2 2.6 10.8 8.2"
        stroke={fg}
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      {/* ear pads */}
      <rect x="11.6" y="14.2" width="4.2" height="7.8" rx="1.9" fill={fg} />
      <rect x="32.2" y="14.2" width="4.2" height="7.8" rx="1.9" fill={fg} />
      {/* mic boom + tip */}
      <path
        d="M34.4 22.6c.3 3-1.3 5.3-4.6 6.3"
        stroke={fg}
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <rect x="27" y="28" width="4.6" height="2.8" rx="1.4" fill={fg} />
    </svg>
  );
}

function loadStoredMessages(): Message[] {
  try {
    const raw = sessionStorage.getItem(CHAT_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Message[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (m) =>
          m &&
          (m.role === "user" || m.role === "assistant") &&
          typeof m.content === "string",
      )
      .slice(-30);
  } catch {
    return [];
  }
}

/** Renders assistant text with light formatting: bullets + product links. */
function AssistantText({ text }: { text: string }) {
  function renderInline(text: string, keyPrefix: string) {
    const parts = text.split(/(\[[^\]]+\]\(\/product\/[^)]+\))/g);
    return parts.map((part, index) => {
      const match = /^\[([^\]]+)\]\((\/product\/[^)]+)\)$/.exec(part);
      if (match) {
        return (
          <Link
            key={`${keyPrefix}-${index}`}
            href={match[2]}
            className="font-medium text-blue-700 underline hover:text-blue-800"
          >
            {match[1]}
          </Link>
        );
      }
      return <span key={`${keyPrefix}-${index}`}>{part}</span>;
    });
  }

  const lines = text.split("\n");
  const blocks: React.ReactNode[] = [];
  let bullets: string[] = [];
  let bulletKey = 0;

  const flushBullets = () => {
    if (bullets.length === 0) return;
    const items = bullets;
    bullets = [];
    blocks.push(
      <ul key={`ul-${bulletKey++}`} className="my-1 list-disc space-y-1 pl-4">
        {items.map((item, index) => (
          <li key={index}>{renderInline(item, `ul${bulletKey}-${index}`)}</li>
        ))}
      </ul>,
    );
  };

  lines.forEach((line, index) => {
    const trimmed = line.trim();
    if (trimmed.startsWith("- ")) {
      bullets.push(trimmed.slice(2));
      return;
    }
    flushBullets();
    if (trimmed.length > 0) {
      blocks.push(
        <p key={`p-${index}`} className="my-1">
          {renderInline(trimmed, `p-${index}`)}
        </p>,
      );
    }
  });
  flushBullets();

  return <div className="space-y-0.5">{blocks}</div>;
}

export function AiAssistant() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>(loadStoredMessages);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const inFlight = useRef(false);

  // Persist chat history so searches, navigation, and reloads keep it.
  useEffect(() => {
    try {
      sessionStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages));
    } catch {
      // storage unavailable — chat stays in memory only
    }
  }, [messages]);

  // Hide on admin-ish routes? None exist — show everywhere.
  useEffect(() => {
    const list = listRef.current;
    if (list) list.scrollTop = list.scrollHeight;
  }, [messages, loading, error, open]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading || inFlight.current) return;
    inFlight.current = true;
    setInput("");
    setError(null);
    const nextMessages: Message[] = [...messages, { role: "user", content: text }];
    setMessages(nextMessages);
    setLoading(true);
    try {
      // Build context travels with the request on the builder page.
      let buildSlugs: Record<string, string> | undefined;
      if (pathname.startsWith("/build")) {
        try {
          const raw = sessionStorage.getItem("pc-shop-build-slugs");
          if (raw) buildSlugs = JSON.parse(raw) as Record<string, string>;
        } catch {
          buildSlugs = undefined;
        }
      }
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: nextMessages.map((m) => ({ role: m.role, content: m.content })),
          context: { pathname, buildSlugs },
        }),
      });
      const data = (await response.json()) as {
        reply?: string;
        message?: string;
        error?: string;
      };
      if (data.error === "AI_ASSISTANT_NOT_CONFIGURED") {
        setError(
          "The AI assistant is not configured on this server. See .env.example (AI_API_KEY etc.).",
        );
      } else if (!response.ok || !data.reply) {
        setError(data.message ?? data.error ?? "The assistant had a problem.");
      } else {
        setMessages([...nextMessages, { role: "assistant", content: data.reply }]);
      }
    } catch {
      setError("Network error. Please try again.");
    }
    inFlight.current = false;
    setLoading(false);
  };

  return (
    <>
      {/* Floating assistant button */}
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open the PC Shop assistant"
          className="fixed bottom-5 right-5 z-50 flex items-center justify-center rounded-full bg-zinc-900 p-3.5 text-white shadow-lg transition-transform hover:scale-105"
        >
          <AgentIcon className="h-8 w-8" />
        </button>
      ) : null}

      {/* Chat panel */}
      {open ? (
        <div className="fixed bottom-5 right-5 z-50 flex h-[32rem] w-[22rem] flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl">
          <div className="flex items-center justify-between border-b border-zinc-200 bg-zinc-900 px-4 py-3">
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white">
                <AgentIcon className="h-7 w-7" face="#f4f4f5" fg="#18181b" />
              </span>
              <div>
                <p className="text-sm font-semibold text-white">PC Shop assistant</p>
                <p className="text-[11px] text-zinc-400">
                  Ask me anything about PC parts and builds
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setMessages([])}
                aria-label="Clear chat history"
                title="Clear chat history"
                className="rounded-md px-2 py-1 text-xs text-zinc-400 hover:bg-zinc-700 hover:text-white"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close assistant"
                className="rounded-md px-2 py-1 text-zinc-400 hover:bg-zinc-700 hover:text-white"
              >
                ✕
              </button>
            </div>
          </div>

          <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto p-3">
            {messages.length === 0 ? (
              <div className="rounded-lg bg-zinc-50 p-3 text-center text-sm text-zinc-600">
                <AgentIcon className="mx-auto h-14 w-14" fg="#a1a1aa" face="#f4f4f5" />
                <p className="mt-2">
                  Hi! I can help you pick parts, check compatibility, estimate
                  performance, and find parts that fit your build. What are you
                  looking for?
                </p>
              </div>
            ) : null}
            {messages.map((message, index) => (
              <div
                key={index}
                className={
                  message.role === "user"
                    ? "ml-6 rounded-2xl rounded-br-sm bg-zinc-900 px-3 py-2 text-sm text-white"
                    : "mr-2 rounded-2xl rounded-bl-sm bg-zinc-100 px-3 py-2 text-sm text-zinc-800"
                }
              >
                {message.role === "assistant" ? (
                  <AssistantText text={message.content} />
                ) : (
                  message.content
                )}
              </div>
            ))}
            {loading ? (
              <div className="mr-2 rounded-2xl rounded-bl-sm bg-zinc-100 px-3 py-2 text-sm text-zinc-400">
                Thinking…
              </div>
            ) : null}
            {error ? (
              <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
                {error}
              </p>
            ) : null}
          </div>

          <form
            onSubmit={(event) => {
              event.preventDefault();
              send();
            }}
            className="flex gap-2 border-t border-zinc-200 p-3"
          >
            <input
              type="text"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Ask about parts or your build…"
              aria-label="Message the assistant"
              className="w-full rounded-full border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              aria-label="Send message"
              className="rounded-full bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50"
            >
              <svg
                viewBox="0 0 20 20"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-4 w-4"
                aria-hidden="true"
              >
                <path d="M3 10h13M11 5l5 5-5 5" />
              </svg>
            </button>
          </form>
        </div>
      ) : null}
    </>
  );
}
