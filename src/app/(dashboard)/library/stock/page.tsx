"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Checkbox, FormAlert, Pill } from "@/components/forms";
import { PageHeader } from "@/components/layout/AppShell";
import { PageLoader } from "@/components/ui/PageLoader";
import { useToast } from "@/components/ui/ToastProvider";
import { useConfirm } from "@/components/ui/ConfirmProvider";
import { RequirePermission } from "@/lib/auth/RequirePermission";
import { errorMessage } from "@/lib/api/client";
import { libraryApi } from "@/lib/api/library";
import { CameraScan } from "@/components/library/CameraScan";

function Check({ id, onBack }: { id: string; onBack: () => void }) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const confirm = useConfirm();
  const q = useQuery({ queryKey: ["library", "stock", id], queryFn: () => libraryApi.stock(id) });
  const [code, setCode] = useState("");
  const [log, setLog] = useState<{ text: string; tone: "success" | "warning" | "error" }[]>([]);
  const [markLost, setMarkLost] = useState(false);
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    ref.current?.focus();
  }, []);
  const c = q.data;
  const scan = async (scanned?: string) => {
    const acc = (scanned ?? code).trim();
    if (!acc) return;
    setCode("");
    try {
      const r = await libraryApi.scanStock(id, acc);
      setLog((l) => [{ text: `${r.accessionNo} · ${r.title}${r.note ? ` — ${r.note}` : ""}`, tone: (r.note ? "warning" : "success") as "warning" | "success" }, ...l].slice(0, 30));
      queryClient.invalidateQueries({ queryKey: ["library", "stock", id] });
    } catch (err) {
      setLog((l) => [{ text: `${acc}: ${errorMessage(err)}`, tone: "error" as const }, ...l].slice(0, 30));
    }
    ref.current?.focus();
  };
  const close = async () => {
    if (!c || !(await confirm({ title: "Close the stock check?", message: markLost ? `${c.missingCount} copies not found will be marked lost.` : "Copies not found stay as they are (the report keeps the list).", confirmLabel: "Close", danger: markLost }))) return;
    try {
      await libraryApi.closeStock(id, markLost);
      queryClient.invalidateQueries({ queryKey: ["library"] });
      showToast("Closed", "success");
    } catch (err) {
      showToast(errorMessage(err), "error");
    }
  };
  if (!c) return <PageLoader />;
  return (
    <div className="space-y-4">
      <button type="button" onClick={onBack} className="text-xs font-bold text-primary">
        ← All stock checks
      </button>
      <Card>
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-lg font-extrabold flex-1">{c.name}</p>
          <Pill tone={c.status === "open" ? "success" : "neutral"}>{c.status === "open" ? "Open" : "Closed"}</Pill>
        </div>
        <div className="mt-3 h-3 rounded-full bg-surface-container-high overflow-hidden">
          <div className="h-full bg-primary" style={{ width: `${c.expected ? Math.min(100, (c.scanned / c.expected) * 100) : 0}%` }} />
        </div>
        <p className="mt-2 text-sm text-on-surface-variant">
          {c.scanned} scanned of {c.expected} that should be on the shelves · <b>{c.missingCount}</b> not found yet
        </p>
        {c.status === "open" && (
          <div className="mt-4 flex items-end gap-3">
            <Input ref={ref} label="Scan each book on the shelves" value={code} onChange={(e) => setCode(e.target.value)} onKeyDown={(e) => e.key === "Enter" && void scan()} icon="qr_code_scanner" placeholder="LIB-00012" />
            <CameraScan onScan={(c) => void scan(c)} label="Scan the book with the camera" />
            <Button onClick={() => scan()}>Add</Button>
          </div>
        )}
        {log.length > 0 && (
          <div className="mt-3 space-y-1 max-h-48 overflow-y-auto">
            {log.map((l, i) => (
              <p key={i} className={l.tone === "error" ? "text-xs text-error" : l.tone === "warning" ? "text-xs text-amber-800" : "text-xs text-green-800"}>
                {l.text}
              </p>
            ))}
          </div>
        )}
      </Card>
      <Card>
        <p className="text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-widest">Not found yet</p>
        {!c.missing.length ? (
          <p className="mt-2 text-sm text-on-surface-variant">Every copy was found. ✓</p>
        ) : (
          <ul className="mt-2 grid gap-1 sm:grid-cols-2 text-sm max-h-96 overflow-y-auto">
            {c.missing.map((m) => (
              <li key={m.id}>
                <b>{m.accessionNo}</b> · {m.title}
                {m.location ? <span className="text-xs text-on-surface-variant/70"> · {m.location}</span> : null}
              </li>
            ))}
          </ul>
        )}
        {c.status === "open" && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <Checkbox checked={markLost} onChange={setMarkLost} label="Mark the copies not found as lost" />
            <Button onClick={close}>Close the stock check</Button>
          </div>
        )}
      </Card>
    </div>
  );
}

function Stock() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const q = useQuery({ queryKey: ["library", "stock-list"], queryFn: libraryApi.stockChecks });
  const [open, setOpen] = useState<string | null>(null);
  const [name, setName] = useState("");
  if (open) return <Check id={open} onBack={() => setOpen(null)} />;
  const start = async () => {
    try {
      const c = await libraryApi.startStock(name.trim());
      queryClient.invalidateQueries({ queryKey: ["library", "stock-list"] });
      setOpen(c.id);
    } catch (err) {
      showToast(errorMessage(err), "error");
    }
  };
  return (
    <div className="space-y-4">
      <Card>
        <p className="text-sm text-on-surface-variant">Scan every book on the shelves; the books that should be there (not lent, lost or withdrawn) but weren’t scanned are listed as missing.</p>
        <div className="mt-4 flex items-end gap-3">
          <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Annual stock check 2026" />
          <Button onClick={start}>Start a stock check</Button>
        </div>
      </Card>
      {q.isLoading ? (
        <PageLoader />
      ) : q.error ? (
        <FormAlert>{errorMessage(q.error)}</FormAlert>
      ) : (
        q.data?.map((c) => (
          <button key={c.id} type="button" onClick={() => setOpen(c.id)} className="w-full text-left rounded-2xl bg-surface-container-lowest p-4 shadow-sm hover:shadow-md flex items-center gap-3">
            <span className="material-symbols-outlined text-primary">inventory</span>
            <span className="flex-1">
              <span className="block font-bold">{c.name}</span>
              <span className="block text-xs text-on-surface-variant/70">
                {new Date(c.startedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })} · {c.scanned} scanned
              </span>
            </span>
            <Pill tone={c.status === "open" ? "success" : "neutral"}>{c.status === "open" ? "Open" : "Closed"}</Pill>
          </button>
        ))
      )}
    </div>
  );
}

export default function LibraryStockPage() {
  return (
    <RequirePermission permission="library.manage">
      <PageHeader title="Stock Check" description="Count the library: scan the books on the shelves and see which are missing." />
      <Stock />
    </RequirePermission>
  );
}
