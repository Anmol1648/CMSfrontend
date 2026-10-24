"use client";

import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/ToastProvider";
import { useConfirm } from "@/components/ui/ConfirmProvider";
import { api, errorMessage } from "@/lib/api/client";

type Setup = { steps: { key: string; label: string; help: string; href: string; done: boolean; detail?: string }[]; done: number; total: number; live: boolean };

/** For a new school's admin, until the school is live: what is left to set up. */
export function SetupChecklist() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  const confirm = useConfirm();
  const q = useQuery({ queryKey: ["school-setup"], queryFn: () => api.get<Setup>("/platform-info/setup", { quiet: true }), staleTime: 5 * 60_000, retry: false });
  if (!q.data || q.data.live) return null;
  const s = q.data;
  return (
    <Card className="mb-6 space-y-3 border border-primary/20">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-bold">Setting up your school</p>
          <p className="text-sm text-on-surface-variant">
            {s.done} of {s.total} done. Each step ticks itself when it is entered.
          </p>
        </div>
        <Button
          variant={s.done === s.total ? "primary" : "secondary"}
          onClick={async () => {
            if (s.done < s.total && !(await confirm({ title: "Go live now?", message: `${s.total - s.done} step(s) are not done yet. You can still do them later.`, confirmLabel: "Go live" }))) return;
            try {
              qc.setQueryData(["school-setup"], await api.post<Setup>("/platform-info/setup/live"));
              showToast("Your school is live 🎉", "success");
            } catch (e) {
              showToast(errorMessage(e), "error");
            }
          }}
        >
          We’re live
        </Button>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-surface-container">
        <div className="h-full rounded-full bg-primary" style={{ width: `${(s.done / s.total) * 100}%` }} />
      </div>
      <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
        {s.steps.map((st) => (
          <Link key={st.key} href={st.href} className="flex items-start gap-2 rounded-xl px-2 py-1.5 hover:bg-surface-container-low">
            <span className={`material-symbols-outlined text-lg ${st.done ? "text-emerald-600" : "text-on-surface-variant/40"}`}>{st.done ? "check_circle" : "radio_button_unchecked"}</span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold">
                {st.label}
                {st.detail && <span className="font-normal text-on-surface-variant"> · {st.detail}</span>}
              </span>
              <span className="block text-xs text-on-surface-variant">{st.help}</span>
            </span>
          </Link>
        ))}
      </div>
    </Card>
  );
}
