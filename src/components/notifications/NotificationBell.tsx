"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/ToastProvider";
import { alertsApi, NotificationItem, timeAgo } from "@/lib/api/alerts";

/** The bell in the header: unread count, the latest few, and a pop-up for important new ones. */
export function NotificationBell() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [open, setOpen] = useState(false);
  const since = useRef<string | undefined>(undefined);
  const ref = useRef<HTMLDivElement>(null);
  const [every, setEvery] = useState(30);
  const q = useQuery({
    queryKey: ["bell"],
    queryFn: async () => {
      const b = await alertsApi.bell(since.current);
      since.current = b.now;
      return b;
    },
    refetchInterval: every * 1000,
    refetchIntervalInBackground: false,
  });
  const b = q.data;
  useEffect(() => {
    if (b?.refreshSeconds && b.refreshSeconds !== every) setEvery(b.refreshSeconds);
    for (const t of b?.toasts ?? []) showToast(t.title, "info");
  }, [b, every, showToast]);
  useEffect(() => {
    const close = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);
  if (b && !b.on) return null;

  const openOne = async (n: NotificationItem) => {
    setOpen(false);
    if (!n.read) {
      await alertsApi.markRead([n.id]).catch(() => null);
      queryClient.invalidateQueries({ queryKey: ["bell"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    }
    router.push(n.link || "/notifications");
  };
  const readAll = async () => {
    await alertsApi.markRead("all").catch(() => null);
    queryClient.invalidateQueries({ queryKey: ["bell"] });
    queryClient.invalidateQueries({ queryKey: ["notifications"] });
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="relative p-2 rounded-full text-primary hover:bg-surface-container-high transition-colors"
        aria-label={b?.unread ? `Notifications, ${b.unread} unread` : "Notifications"}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span className="material-symbols-outlined" style={{ fontVariationSettings: `'FILL' ${b?.unread ? 1 : 0}` }}>
          notifications
        </span>
        {!!b?.unread && <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-error text-white text-[10px] font-black flex items-center justify-center">{b.unread > 99 ? "99+" : b.unread}</span>}
      </button>
      {open && (
        <div role="menu" className="absolute right-0 mt-2 w-[22rem] max-w-[calc(100vw-2rem)] bg-surface-lowest rounded-2xl shadow-premium border border-outline-variant/20 z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-outline-variant/15">
            <p className="text-sm font-extrabold text-primary">Notifications</p>
            {!!b?.unread && (
              <button type="button" onClick={readAll} className="text-xs font-bold text-primary hover:opacity-70">
                Mark all as read
              </button>
            )}
          </div>
          <div className="max-h-[60vh] overflow-y-auto">
            {(b?.latest ?? []).map((n) => (
              <button key={n.id} type="button" role="menuitem" onClick={() => openOne(n)} className={cn("w-full text-left flex gap-3 px-4 py-3 hover:bg-surface-container-low border-b border-outline-variant/10", !n.read && "bg-primary/5")}>
                <span className={cn("material-symbols-outlined text-xl shrink-0 mt-0.5", n.priority !== "normal" ? "text-error" : "text-primary")}>{n.icon}</span>
                <span className="min-w-0 flex-1">
                  <span className={cn("block text-sm truncate", n.read ? "font-semibold text-on-surface" : "font-extrabold text-primary")}>{n.title}</span>
                  <span className="block text-xs text-on-surface-variant/80 line-clamp-2">{n.body}</span>
                  <span className="block text-[10px] text-on-surface-variant/60 mt-0.5">{timeAgo(n.at)}</span>
                </span>
                {!n.read && <span className="w-2 h-2 rounded-full bg-primary shrink-0 mt-2" aria-label="unread" />}
              </button>
            ))}
            {b && !b.latest.length && <p className="px-4 py-8 text-center text-sm text-on-surface-variant/70">No notifications yet.</p>}
          </div>
          <Link href="/notifications" onClick={() => setOpen(false)} className="block text-center text-xs font-bold uppercase tracking-widest text-primary py-3 hover:bg-surface-container-low">
            See all
          </Link>
        </div>
      )}
    </div>
  );
}
