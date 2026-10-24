"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { api } from "@/lib/api/client";

type Notices = { banners: { id: string; title: string; body: string }[]; news: { id: string; title: string; body: string; startsAt: string }[] };
const SEEN_KEY = "whats-new-seen";
const seen = (): string[] => {
  try {
    return JSON.parse(localStorage.getItem(SEEN_KEY) ?? "[]");
  } catch {
    return [];
  }
};

/** Notices from Klytos: a banner (e.g. maintenance tonight) across the top, and "What's new" once per person after an update. */
export function PlatformNotices() {
  const q = useQuery({ queryKey: ["platform-notices"], queryFn: () => api.get<Notices>("/platform-info/notices", { quiet: true }), refetchInterval: 5 * 60_000, staleTime: 60_000, retry: false });
  const [hidden, setHidden] = useState<string[]>([]);
  const [unseen, setUnseen] = useState<Notices["news"]>([]);
  useEffect(() => {
    if (q.data) setUnseen(q.data.news.filter((n) => !seen().includes(n.id)));
  }, [q.data]);
  const banners = (q.data?.banners ?? []).filter((b) => !hidden.includes(b.id));
  const close = () => {
    try {
      localStorage.setItem(SEEN_KEY, JSON.stringify([...seen(), ...unseen.map((n) => n.id)].slice(-50)));
    } catch {
      /* private window: shown again next time */
    }
    setUnseen([]);
  };
  return (
    <>
      {banners.map((b) => (
        <div key={b.id} className="mb-4 flex items-start gap-3 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <span className="material-symbols-outlined text-lg">campaign</span>
          <div className="min-w-0 flex-1">
            <b>{b.title}</b>
            {b.body && <p className="whitespace-pre-wrap">{b.body}</p>}
          </div>
          <button type="button" className="material-symbols-outlined text-base" onClick={() => setHidden([...hidden, b.id])} aria-label="Hide">
            close
          </button>
        </div>
      ))}
      {unseen.length > 0 && (
        <Modal isOpen onClose={close} title="What’s new">
          <div className="space-y-4">
            {unseen.map((n) => (
              <div key={n.id}>
                <p className="font-bold">{n.title}</p>
                <p className="text-xs text-on-surface-variant">{new Date(n.startsAt).toLocaleDateString("en-IN", { dateStyle: "medium" })}</p>
                <p className="mt-1 whitespace-pre-wrap text-sm">{n.body}</p>
              </div>
            ))}
            <div className="flex justify-end">
              <Button onClick={close}>Got it</Button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
