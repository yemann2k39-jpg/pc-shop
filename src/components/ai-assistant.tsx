"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type Message = {
  role: "user" | "assistant";
  content: string;
};

const CHAT_STORAGE_KEY = "pc-shop-ai-chat";

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
      {/* Floating button */}
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open the PC Shop assistant"
          className="fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-blue-700 text-white shadow-lg transition-transform hover:scale-105"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            className="h-6 w-6"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z"
            />
          </svg>
        </button>
      ) : null}

      {/* Chat panel */}
      {open ? (
        <div className="fixed bottom-5 right-5 z-50 flex h-[32rem] w-[22rem] flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl">
          <div className="flex items-center justify-between border-b border-zinc-200 bg-zinc-900 px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-white">PC Shop assistant</p>
              <p className="text-[11px] text-zinc-400">
                Ask me anything about PC parts and builds
              </p>
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
              <div className="rounded-lg bg-zinc-50 p-3 text-sm text-zinc-600">
                Hi! I can help you pick parts, check compatibility, estimate
                performance, and find parts that fit your build. What are you
                looking for?
              </div>
            ) : null}
            {messages.map((message, index) => (
              <div
                key={index}
                className={
                  message.role === "user"
                    ? "ml-6 rounded-2xl rounded-br-sm bg-blue-700 px-3 py-2 text-sm text-white"
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
              className="w-full rounded-full border border-zinc-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              aria-label="Send message"
              className="rounded-full bg-blue-700 px-3 py-2 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-50"
            >
              ➤
            </button>
          </form>
        </div>
      ) : null}
    </>
  );
}
