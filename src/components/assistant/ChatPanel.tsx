"use client";

import Link from "next/link";
import { Fragment, useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/components/ui/ToastProvider";
import { FormAlert } from "@/components/forms";
import { errorMessage } from "@/lib/api/client";
import { cn } from "@/lib/utils";
import { assistantApi, ChatMessage } from "@/lib/api/assistant";

/** **bold** inside a line (no HTML is ever rendered from an answer). */
function Inline({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <>
      {parts.map((p, i) =>
        p.startsWith("**") && p.endsWith("**") ? (
          <b key={i}>{p.slice(2, -2)}</b>
        ) : (
          <Fragment key={i}>{p}</Fragment>
        )
      )}
    </>
  );
}

/** An answer: paragraphs and "- " bullets. */
function Answer({ text }: { text: string }) {
  const blocks: { kind: "p" | "ul"; lines: string[] }[] = [];
  for (const line of text.split("\n")) {
    const t = line.trim();
    if (!t) {
      blocks.push({ kind: "p", lines: [] });
      continue;
    }
    const bullet = /^[-*•]\s+/.test(t);
    const last = blocks[blocks.length - 1];
    if (bullet) {
      if (last?.kind === "ul") last.lines.push(t.replace(/^[-*•]\s+/, ""));
      else blocks.push({ kind: "ul", lines: [t.replace(/^[-*•]\s+/, "")] });
    } else if (last?.kind === "p" && last.lines.length) last.lines.push(t);
    else blocks.push({ kind: "p", lines: [t] });
  }
  return (
    <div className="space-y-2">
      {blocks
        .filter((b) => b.lines.length)
        .map((b, i) =>
          b.kind === "ul" ? (
            <ul key={i} className="list-disc space-y-0.5 pl-5">
              {b.lines.map((l, j) => (
                <li key={j}>
                  <Inline text={l} />
                </li>
              ))}
            </ul>
          ) : (
            <p key={i}>
              {b.lines.map((l, j) => (
                <Fragment key={j}>
                  {j > 0 && <br />}
                  <Inline text={l} />
                </Fragment>
              ))}
            </p>
          )
        )}
    </div>
  );
}

const TOOL_LABEL: Record<string, string> = { data: "looked up records", widget: "read a dashboard widget", waiting: "checked what is waiting for you" };

function Message({ m, onFeedback }: { m: ChatMessage; onFeedback: (f: "up" | "down" | null) => void }) {
  if (m.role === "user") return <div className="ml-auto max-w-[85%] rounded-2xl rounded-br-md bg-primary px-4 py-2 text-sm text-white whitespace-pre-wrap">{m.text}</div>;
  return (
    <div className="max-w-[92%] space-y-2">
      <div className="rounded-2xl rounded-bl-md bg-surface-container px-4 py-3 text-sm text-on-surface">
        <Answer text={m.text} />
      </div>
      {m.links.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {m.links.map((l) => (
            <Link key={l.href} href={l.href} className="inline-flex items-center gap-1 rounded-full border border-primary/30 px-3 py-1 text-xs font-semibold text-primary hover:bg-primary/5">
              {l.label}
              <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </Link>
          ))}
        </div>
      )}
      <div className="flex items-center gap-2 text-[11px] text-on-surface-variant/70">
        {m.steps.length > 0 && <span title={m.steps.map((s) => `${TOOL_LABEL[s.tool] ?? s.tool}${s.ok ? "" : ` (failed: ${s.error})`}`).join("\n")}>{m.steps.length} look-up{m.steps.length > 1 ? "s" : ""}</span>}
        <button type="button" onClick={() => onFeedback(m.feedback === "up" ? null : "up")} className={cn("material-symbols-outlined text-base", m.feedback === "up" ? "text-emerald-600" : "hover:text-on-surface")} title="Helpful" aria-label="Helpful">
          thumb_up
        </button>
        <button type="button" onClick={() => onFeedback(m.feedback === "down" ? null : "down")} className={cn("material-symbols-outlined text-base", m.feedback === "down" ? "text-error" : "hover:text-on-surface")} title="Not right" aria-label="Not right">
          thumb_down
        </button>
      </div>
    </div>
  );
}

/** A conversation with the assistant: messages, suggested questions, and the box to ask. */
export function ChatPanel({ chatId, onChat, compact = false }: { chatId: string | null; onChat: (id: string | null) => void; compact?: boolean }) {
  const qc = useQueryClient();
  const { showToast } = useToast();
  const sug = useQuery({ queryKey: ["assistant", "suggestions"], queryFn: assistantApi.suggestions, staleTime: 10 * 60_000 });
  const chat = useQuery({ queryKey: ["assistant", "chat", chatId], queryFn: () => assistantApi.chat(chatId!), enabled: !!chatId });
  const [pending, setPending] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [secs, setSecs] = useState(0);
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!pending) return;
    setSecs(0);
    const t = setInterval(() => setSecs((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [pending]);
  const messages = chatId ? (chat.data?.messages ?? []) : [];
  useEffect(() => {
    // In braces: newer browsers return a Promise from scrollIntoView, and an effect may only return a clean-up function.
    end.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, pending]);

  const send = async (text: string) => {
    const question = text.trim();
    if (!question || pending) return;
    setQ("");
    setPending(question);
    try {
      const r = await assistantApi.ask(question, chatId);
      const user: ChatMessage = { id: `u${Date.now()}`, role: "user", text: question, links: [], steps: [], feedback: null, createdAt: new Date().toISOString() };
      if (r.chatId !== chatId) {
        qc.setQueryData(["assistant", "chat", r.chatId], { id: r.chatId, title: r.title, messages: [user, r.message] });
        onChat(r.chatId);
      } else {
        qc.setQueryData(["assistant", "chat", r.chatId], (old: { id: string; title: string; messages: ChatMessage[] } | undefined) => (old ? { ...old, messages: [...old.messages, user, r.message] } : old));
      }
      qc.invalidateQueries({ queryKey: ["assistant", "chats"] });
    } catch (e) {
      showToast(errorMessage(e), "error");
      setQ(question);
    } finally {
      setPending(null);
    }
  };
  const feedback = async (m: ChatMessage, f: "up" | "down" | null) => {
    try {
      await assistantApi.feedback(m.id, f);
      qc.setQueryData(["assistant", "chat", chatId], (old: { id: string; title: string; messages: ChatMessage[] } | undefined) => (old ? { ...old, messages: old.messages.map((x) => (x.id === m.id ? { ...x, feedback: f } : x)) } : old));
    } catch (e) {
      showToast(errorMessage(e), "error");
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className={cn("min-h-0 flex-1 space-y-4 overflow-y-auto", compact ? "p-3" : "p-4 sm:p-6")}>
        {sug.data && !sug.data.ready && <FormAlert tone="warning">{sug.data.why}</FormAlert>}
        {!messages.length && !pending && (
          <div className="space-y-4 py-4 text-center">
            <span className="material-symbols-outlined text-5xl text-primary/40">smart_toy</span>
            <div>
              <p className="font-bold">Ask me about the school</p>
              <p className="text-sm text-on-surface-variant">I answer from the records you can see. I can’t change anything, but I can tell you where to do it.</p>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              {(sug.data?.suggestions ?? []).map((s) => (
                <button key={s} type="button" onClick={() => void send(s)} className="rounded-full border border-outline-variant/40 px-3 py-1.5 text-xs font-semibold text-on-surface hover:border-primary hover:text-primary">
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m) => (
          <Message key={m.id} m={m} onFeedback={(f) => void feedback(m, f)} />
        ))}
        {pending && (
          <>
            <div className="ml-auto max-w-[85%] rounded-2xl rounded-br-md bg-primary px-4 py-2 text-sm text-white whitespace-pre-wrap">{pending}</div>
            <div className="flex max-w-[92%] items-center gap-2 rounded-2xl rounded-bl-md bg-surface-container px-4 py-3 text-sm text-on-surface-variant">
              <span className="material-symbols-outlined animate-spin text-base">progress_activity</span>
              Looking it up… {secs}s{secs > 20 ? " (the AI can take a minute or two)" : ""}
            </div>
          </>
        )}
        <div ref={end} />
      </div>
      <form
        className={cn("flex items-end gap-2 border-t border-outline-variant/20", compact ? "p-3" : "p-4")}
        onSubmit={(e) => {
          e.preventDefault();
          void send(q);
        }}
      >
        <textarea
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void send(q);
            }
          }}
          rows={1}
          maxLength={1000}
          placeholder="Ask a question…"
          className="max-h-32 min-h-[2.75rem] flex-1 resize-none rounded-xl border border-outline-variant/40 bg-transparent px-3 py-2.5 text-sm focus:border-primary focus:outline-none"
        />
        <button type="submit" disabled={!q.trim() || !!pending} className="material-symbols-outlined flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary text-white disabled:opacity-40" aria-label="Send">
          send
        </button>
      </form>
    </div>
  );
}
