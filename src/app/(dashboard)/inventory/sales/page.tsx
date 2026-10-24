"use client";

import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { FormAlert, Pill, Select } from "@/components/forms";
import { PageHeader } from "@/components/layout/AppShell";
import { PageLoader } from "@/components/ui/PageLoader";
import { Pagination } from "@/components/ui/Pagination";
import { useToast } from "@/components/ui/ToastProvider";
import { useConfirm } from "@/components/ui/ConfirmProvider";
import { RequirePermission } from "@/lib/auth/RequirePermission";
import { errorMessage } from "@/lib/api/client";
import { day, invApi, money, qty, Sale } from "@/lib/api/inventory";
import { apiLines, EditLine, LinesEditor, useInvOptions } from "@/components/inventory/InvParts";
import { PrintPortal } from "@/components/print/PrintPortal";

function Receipt({ s }: { s: Sale }) {
  return (
    <div style={{ fontFamily: "Arial, sans-serif", fontSize: 12, maxWidth: 420 }}>
      <div style={{ textAlign: "center", borderBottom: "1px dashed #333", paddingBottom: 6 }}>
        <div style={{ fontWeight: 800, fontSize: 15 }}>{s.school?.legalName}</div>
        <div>{[s.school?.addressLine1, s.school?.city].filter(Boolean).join(", ")}</div>
        <div style={{ fontWeight: 700, marginTop: 4 }}>{s.payAt === "fees" ? "Store slip (added to fees)" : "Store receipt"}</div>
      </div>
      <p>
        No. {s.number} · {new Date(s.at).toLocaleString("en-IN")}
        <br />
        {s.student} ({s.admissionNo})
      </p>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <tbody>
          {s.lines.map((l) => (
            <tr key={l.id}>
              <td style={{ padding: "2px 0" }}>{l.item}</td>
              <td style={{ textAlign: "right" }}>
                {qty(l.qty)} × {money(l.rate)}
              </td>
              <td style={{ textAlign: "right" }}>{money(l.amount)}</td>
            </tr>
          ))}
          <tr>
            <td colSpan={2} style={{ borderTop: "1px dashed #333", fontWeight: 800 }}>
              Total
            </td>
            <td style={{ borderTop: "1px dashed #333", textAlign: "right", fontWeight: 800 }}>{money(s.total)}</td>
          </tr>
        </tbody>
      </table>
      <p>{s.payAt === "fees" ? "This amount is added to the student’s fees (next instalment)." : `Paid${s.mode ? ` by ${s.mode}` : ""}.`}</p>
      <p style={{ textAlign: "right", marginTop: 24 }}>{s.soldByName}</p>
    </div>
  );
}

function NewSale({ onSold }: { onSold: (s: Sale) => void }) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const o = useInvOptions();
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<{ id: string; name: string; admissionNo: string; section: string }[]>([]);
  const [student, setStudent] = useState<(typeof hits)[number] | null>(null);
  const [storeId, setStoreId] = useState("");
  const [payAt, setPayAt] = useState<"fees" | "counter">("fees");
  const [mode, setMode] = useState("Cash");
  const [lines, setLines] = useState<EditLine[]>([]);
  useEffect(() => {
    if (o.data) {
      setStoreId((s) => s || o.data.stores[0]?.id || "");
      setPayAt(o.data.settings.salesTo);
    }
  }, [o.data]);
  useEffect(() => {
    if (student || q.trim().length < 2) return setHits([]);
    const t = setTimeout(() => invApi.students(q).then(setHits).catch(() => setHits([])), 250);
    return () => clearTimeout(t);
  }, [q, student]);
  if (!o.data) return <PageLoader />;
  if (!o.data.settings.sales) return <FormAlert tone="info">Student sales are off (System Settings → Inventory).</FormAlert>;
  return (
    <Card>
      <div className="space-y-4">
        {student ? (
          <div className="flex items-center gap-2 rounded-xl bg-surface-container-low px-4 py-3">
            <span className="flex-1 text-sm">
              <b>{student.name}</b> · {student.section} · {student.admissionNo}
            </span>
            <button type="button" className="text-xs font-bold text-primary" onClick={() => setStudent(null)}>
              Change
            </button>
          </div>
        ) : (
          <div className="relative">
            <Input label="Student" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name or admission no" />
            {hits.length > 0 && (
              <ul className="absolute z-20 mt-1 w-full rounded-xl bg-white shadow-lg border border-outline-variant/30">
                {hits.map((h) => (
                  <li key={h.id}>
                    <button type="button" className="w-full px-4 py-2 text-left text-sm hover:bg-surface-container-low" onClick={() => { setStudent(h); setQ(""); }}>
                      <b>{h.name}</b> <span className="text-on-surface-variant">· {h.section} · {h.admissionNo}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
        <div className="grid gap-3 sm:grid-cols-3">
          <Select label="From store" value={storeId} onChange={setStoreId} options={o.data.stores.map((s) => ({ value: s.id, label: s.name }))} />
          <Select label="Paid" value={payAt} onChange={(v) => setPayAt(v as "fees" | "counter")} options={[{ value: "fees", label: "Add to the fees" }, { value: "counter", label: "Paid here now" }]} />
          {payAt === "counter" && <Select label="How" value={mode} onChange={setMode} options={["Cash", "UPI", "Card"].map((x) => ({ value: x, label: x }))} />}
        </div>
        <LinesEditor storeId={storeId} lines={lines} setLines={setLines} sellable />
        <div className="flex justify-end">
          <Button
            disabled={!student || !lines.length}
            onClick={async () => {
              try {
                const s = await invApi.sell({ studentId: student!.id, storeId, payAt, mode: payAt === "counter" ? mode : null, lines: apiLines(lines) });
                queryClient.invalidateQueries({ queryKey: ["inventory"] });
                showToast(`Sold (${s.number}): ${money(s.total)}${s.payAt === "fees" ? " added to the fees" : ""}`, "success");
                setLines([]);
                setStudent(null);
                onSold(s);
              } catch (e) {
                showToast(errorMessage(e), "error");
              }
            }}
          >
            Sell
          </Button>
        </div>
      </div>
    </Card>
  );
}

function Sales() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const confirm = useConfirm();
  const [page, setPage] = useState(1);
  const [view, setView] = useState<Sale | null>(null);
  const q = useQuery({ queryKey: ["inventory", "sales", page], queryFn: () => invApi.sales(page) });
  return (
    <div className="space-y-4">
      <NewSale onSold={setView} />
      {q.isLoading ? (
        <PageLoader />
      ) : q.error ? (
        <FormAlert>{errorMessage(q.error)}</FormAlert>
      ) : (
        <Card padding="none">
          <ul className="divide-y divide-outline-variant/15 text-sm">
            {q.data!.rows.map((s) => (
              <li key={s.id}>
                <button type="button" onClick={async () => setView(await invApi.sale(s.id))} className="w-full flex flex-wrap items-center gap-3 px-5 py-2.5 text-left hover:bg-surface-container-low">
                  <span className="w-20 font-mono text-xs">{s.number}</span>
                  <span className="flex-1">
                    <b>{s.student}</b> <span className="text-on-surface-variant">· {s.admissionNo} · {day(s.at)}</span>
                  </span>
                  <Pill tone={s.payAt === "fees" ? "primary" : "success"}>{s.payAt === "fees" ? "In fees" : `Paid${s.mode ? ` (${s.mode})` : ""}`}</Pill>
                  {s.status === "cancelled" && <Pill tone="danger">Cancelled</Pill>}
                  <span className="w-20 text-right font-bold">{money(s.total)}</span>
                </button>
              </li>
            ))}
            {!q.data!.rows.length && <li className="px-5 py-6 text-center text-on-surface-variant">No sales yet.</li>}
          </ul>
          {q.data!.total > q.data!.pageSize && <Pagination className="px-4 py-3" currentPage={page} totalPage={Math.ceil(q.data!.total / q.data!.pageSize)} onPageChange={setPage} />}
        </Card>
      )}
      {view && (
        <Modal isOpen onClose={() => setView(null)} title={`Sale ${view.number}`} width="max-w-lg">
          <div className="space-y-4">
            <Receipt s={view} />
            <PrintPortal page="@page { size: A5; margin: 10mm; }">
              <Receipt s={view} />
            </PrintPortal>
            <div className="flex justify-end gap-2">
              {view.status === "active" && (
                <Button
                  variant="tertiary"
                  onClick={async () => {
                    if (!(await confirm({ title: `Cancel ${view.number}?`, message: "The items go back into the store and the amount comes off the fees.", confirmLabel: "Cancel sale", danger: true }))) return;
                    try {
                      setView(await invApi.cancelSale(view.id));
                      queryClient.invalidateQueries({ queryKey: ["inventory"] });
                      showToast("Cancelled", "success");
                    } catch (e) {
                      showToast(errorMessage(e), "error");
                    }
                  }}
                >
                  Cancel sale
                </Button>
              )}
              <Button onClick={() => window.print()}>
                <span className="material-symbols-outlined text-lg">print</span> Print
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

export default function InventorySalesPage() {
  return (
    <RequirePermission permission="inventory.sell">
      <PageHeader title="Student Sales" description="Sell uniforms, diaries and notebooks to students: added to the fees (next instalment) or paid at the counter." />
      <Sales />
    </RequirePermission>
  );
}
