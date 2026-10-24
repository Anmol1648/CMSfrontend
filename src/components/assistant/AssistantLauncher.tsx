"use client";

import Link from "next/link";
import { useState } from "react";
import { Drawer } from "@/components/ui/Drawer";
import { ChatPanel } from "./ChatPanel";

/** The round button in the corner of every page: a quick conversation with the assistant. */
export function AssistantLauncher() {
  const [open, setOpen] = useState(false);
  const [chatId, setChatId] = useState<string | null>(null);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="fixed bottom-5 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white shadow-lg hover:opacity-90 print:hidden" aria-label="Ask the AI assistant" title="Ask the AI assistant">
        <span className="material-symbols-outlined text-2xl">smart_toy</span>
      </button>
      <Drawer isOpen={open} onClose={() => setOpen(false)} title="AI Assistant" width="max-w-lg">
        <div className="-mx-8 -my-6 flex h-[calc(100vh-4.4rem)] flex-col">
          <div className="flex items-center justify-between px-4 pt-2 text-xs font-bold uppercase tracking-widest">
            <button type="button" onClick={() => setChatId(null)} className="text-primary hover:opacity-70">
              New conversation
            </button>
            <Link href="/assistant" onClick={() => setOpen(false)} className="text-primary hover:opacity-70">
              All conversations
            </Link>
          </div>
          <ChatPanel chatId={chatId} onChat={setChatId} compact />
        </div>
      </Drawer>
    </>
  );
}
