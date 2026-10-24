"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/layout/AppShell";
import { useToast } from "@/components/ui/ToastProvider";
import { useConfirm } from "@/components/ui/ConfirmProvider";
import { RequirePermission } from "@/lib/auth/RequirePermission";
import { errorMessage } from "@/lib/api/client";
import { cn } from "@/lib/utils";
import { assistantApi } from "@/lib/api/assistant";
import { ChatPanel } from "@/components/assistant/ChatPanel";

function Assistant() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  const confirm = useConfirm();
  const chats = useQuery({ queryKey: ["assistant", "chats"], queryFn: assistantApi.chats });
  const [chatId, setChatId] = useState<string | null>(null);
  return (
    <div className="grid h-[calc(100vh-14rem)] min-h-[28rem] gap-4 lg:grid-cols-[16rem_1fr]">
      <Card padding="none" className="hidden min-h-0 flex-col lg:flex">
        <button type="button" onClick={() => setChatId(null)} className="m-3 flex items-center justify-center gap-2 rounded-xl bg-primary px-3 py-2 text-sm font-bold text-white hover:opacity-90">
          <span className="material-symbols-outlined text-base">add</span>
          New conversation
        </button>
        <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-3">
          {(chats.data ?? []).map((c) => (
            <div key={c.id} className={cn("group flex items-center gap-1 rounded-lg px-2 py-2 text-sm", c.id === chatId ? "bg-primary/10 text-primary" : "hover:bg-surface-container")}>
              <button type="button" onClick={() => setChatId(c.id)} className="min-w-0 flex-1 truncate text-left">
                {c.title}
              </button>
              <button
                type="button"
                className="material-symbols-outlined hidden text-base text-on-surface-variant group-hover:block"
                aria-label={`Delete ${c.title}`}
                onClick={async () => {
                  if (!(await confirm({ title: "Delete this conversation?", message: c.title, confirmLabel: "Delete", danger: true }))) return;
                  try {
                    await assistantApi.remove(c.id);
                    if (chatId === c.id) setChatId(null);
                    qc.invalidateQueries({ queryKey: ["assistant", "chats"] });
                  } catch (e) {
                    showToast(errorMessage(e), "error");
                  }
                }}
              >
                delete
              </button>
            </div>
          ))}
          {chats.data && !chats.data.length && <p className="px-2 py-4 text-xs text-on-surface-variant">Your conversations appear here.</p>}
        </div>
      </Card>
      <Card padding="none" className="flex min-h-0 flex-col">
        <div className="flex items-center justify-between border-b border-outline-variant/20 px-4 py-2 lg:hidden">
          <span className="text-sm font-bold">{chats.data?.find((c) => c.id === chatId)?.title ?? "New conversation"}</span>
          <button type="button" onClick={() => setChatId(null)} className="text-xs font-bold uppercase tracking-widest text-primary">
            New
          </button>
        </div>
        <ChatPanel chatId={chatId} onChat={setChatId} />
      </Card>
    </div>
  );
}

export default function AssistantPage() {
  return (
    <RequirePermission permission="ai.chat">
      <PageHeader title="AI Assistant" description="Ask about the school in plain words. Answers come only from the records you are allowed to see; nothing is changed." />
      <Assistant />
    </RequirePermission>
  );
}
