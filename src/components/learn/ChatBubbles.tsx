"use client";

import { NoticeBody } from "@/components/notices/NoticeBody";
import { Chat } from "@/lib/api/learn";
import { cn } from "@/lib/utils";

/** A tutor conversation as chat bubbles (the tutor's replies keep their bold and lists). */
export function ChatBubbles({ chat }: { chat: Pick<Chat, "messages"> }) {
  return (
    <div className="space-y-3">
      {chat.messages.map((m) => (
        <div key={m.id} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
          <div className={cn("max-w-[85%] rounded-2xl px-4 py-3 text-sm", m.role === "user" ? "bg-primary text-white rounded-br-md" : "bg-surface-container-low rounded-bl-md", m.flag !== "ok" && "ring-1 ring-error/40")}>
            {m.role === "user" ? <p className="whitespace-pre-line">{m.text}</p> : <NoticeBody text={m.text} />}
          </div>
        </div>
      ))}
    </div>
  );
}
