"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Tabs } from "@/components/ui/Tabs";
import { Modal } from "@/components/ui/Modal";
import { FormAlert, Pill, Select } from "@/components/forms";
import { PageHeader } from "@/components/layout/AppShell";
import { PageLoader } from "@/components/ui/PageLoader";
import { useToast } from "@/components/ui/ToastProvider";
import { useConfirm } from "@/components/ui/ConfirmProvider";
import { RequirePermission } from "@/lib/auth/RequirePermission";
import { errorMessage } from "@/lib/api/client";
import { day, invApi, money, Options, qty, Request, REQ, todayISO } from "@/lib/api/inventory";
import { apiLines, EditLine, LinesEditor, opts, useInvOptions } from "@/components/inventory/InvParts";

type Mode = "issue" | "return" | "transfer";

/** Issue / take back / transfer form (optionally against a request). */
function MoveForm({ mode, options, request, onDone }: { mode: Mode; options: Options; request?: Request | null; onDone?: () => void }) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [storeId, setStoreId] = useState(request?.storeId ?? options.stores[0]?.id ?? "");
  const [toStore, setToStore] = useState(options.stores[1]?.id ?? "");
  const [dept, setDept] = useState(request?.departmentId ?? "");
  const [staff, setStaff] = useState(request?.staffId ?? "");
  const [note, setNote] = useState("");
  const [lines, setLines] = useState<EditLine[]>(() => (request ? request.lines.filter((l) => l.qty > l.issuedQty).map((l) => ({ itemId: l.itemId, name: l.item, unit: l.unit, inStock: l.inStock, qty: String(Math.round((l.qty - l.issuedQty) * 1000) / 1000), rate: "0", gstPct: "0", batchNo: "", expiryOn: "", trackExpiry: false })) : []));
  const save = async () => {
    try {
      const l = apiLines(lines);
      if (!l.length) return showToast("Add the items", "error");
      const r =
        mode === "issue"
          ? await invApi.issue({ storeId, departmentId: dept || null, staffId: staff || null, requestId: request?.id ?? null, note: note || null, lines: l })
          : mode === "return"
            ? await invApi.takeBack({ storeId, departmentId: dept || null, staffId: staff || null, note: note || null, lines: l })
            : await invApi.transfer({ fromStoreId: storeId, toStoreId: toStore, note: note || null, lines: l });
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      showToast(`${mode === "issue" ? "Issued" : mode === "return" ? "Taken back" : "Moved"} (${r.refNo})`, "success");
      setLines([]);
      setNote("");
      onDone?.();
    } catch (e) {
      showToast(errorMessage(e), "error");
    }
  };
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Select label={mode === "transfer" ? "From store" : mode === "return" ? "Back into store" : "From store"} value={storeId} onChange={setStoreId} options={options.stores.map((s) => ({ value: s.id, label: s.name }))} />
        {mode === "transfer" ? (
          <Select label="To store" value={toStore} onChange={setToStore} options={options.stores.map((s) => ({ value: s.id, label: s.name }))} />
        ) : (
          <>
            <Select label={mode === "issue" ? "To department" : "From department"} value={dept} onChange={setDept} options={opts(options.departments)} />
            <Select
              label={mode === "issue" ? "To staff member" : "From staff member"}
              value={staff}
              onChange={(v) => {
                setStaff(v);
                const d = options.staff.find((s) => s.id === v)?.departmentId;
                if (v && d && !dept) setDept(d);
              }}
              options={opts(options.staff, "—")}
            />
          </>
        )}
      </div>
      <LinesEditor storeId={storeId} lines={lines} setLines={setLines} />
      <Input label="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} />
      <div className="flex justify-end">
        <Button onClick={save} disabled={!lines.length || (mode === "transfer" ? !toStore : !dept && !staff)}>
          {mode === "issue" ? "Issue" : mode === "return" ? "Take back" : "Move"}
        </Button>
      </div>
    </div>
  );
}

function Requests({ options }: { options: Options }) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const confirm = useConfirm();
  const [show, setShow] = useState("open");
  const [issuing, setIssuing] = useState<Request | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const q = useQuery({ queryKey: ["inventory", "requests", show], queryFn: () => invApi.requests(show) });
  const act = async (fn: () => Promise<unknown>, msg: string) => {
    try {
      await fn();
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      showToast(msg, "success");
    } catch (e) {
      showToast(errorMessage(e), "error");
    }
  };
  return (
    <div className="space-y-3">
      <Select className="max-w-xs" value={show} onChange={setShow} options={[{ value: "open", label: "To approve and to issue" }, { value: "pending", label: "Waiting for approval" }, { value: "done", label: "Done" }, { value: "all", label: "All" }]} />
      {q.isLoading ? (
        <PageLoader />
      ) : q.error ? (
        <FormAlert>{errorMessage(q.error)}</FormAlert>
      ) : !q.data!.length ? (
        <FormAlert tone="info">No requests here.</FormAlert>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {q.data!.map((r) => (
            <Card key={r.id} padding="sm">
              <div className="flex items-start gap-2">
                <div className="flex-1">
                  <p className="font-bold">
                    {r.number} · {r.by}
                  </p>
                  <p className="text-xs text-on-surface-variant">
                    {day(r.createdAt)}
                    {r.department ? ` · ${r.department}` : ""} · about {money(Math.round(r.value))}
                  </p>
                  {r.purpose && <p className="text-sm mt-1">{r.purpose}</p>}
                </div>
                <Pill tone={REQ[r.status].tone}>{REQ[r.status].label}</Pill>
              </div>
              <ul className="mt-2 text-sm space-y-0.5">
                {r.lines.map((l) => (
                  <li key={l.id} className="flex gap-2">
                    <span className="flex-1">{l.item}</span>
                    <span>
                      {qty(l.qty)} {l.unit}
                      {l.issuedQty > 0 ? ` (given ${qty(l.issuedQty)})` : ""}
                    </span>
                    <span className={l.inStock < l.qty - l.issuedQty ? "text-error text-xs" : "text-on-surface-variant text-xs"}>in store {qty(l.inStock)}</span>
                  </li>
                ))}
              </ul>
              {r.answer && <p className="mt-1 text-xs">Note: {r.answer}</p>}
              {r.status === "pending" && options.can.approve && (
                <div className="mt-3 flex flex-wrap items-end gap-2">
                  <Input label="Note (optional)" value={answers[r.id] ?? ""} onChange={(e) => setAnswers((a) => ({ ...a, [r.id]: e.target.value }))} className="flex-1" />
                  <Button variant="secondary" onClick={() => act(() => invApi.answerRequest(r.id, false, answers[r.id] || null), "Not approved: the staff member is told")}>
                    Not approve
                  </Button>
                  <Button onClick={() => act(() => invApi.answerRequest(r.id, true, answers[r.id] || null), "Approved: the store can issue it")}>Approve</Button>
                </div>
              )}
              {(r.status === "approved" || r.status === "partly") && options.can.store && (
                <div className="mt-3 flex justify-end gap-2">
                  <Button variant="tertiary" onClick={async () => (await confirm({ title: `Close ${r.number}?`, message: "Use this when the store cannot give (the rest of) it. The staff member sees it closed.", confirmLabel: "Close" })) && act(() => invApi.closeRequest(r.id), "Closed")}>
                    Cannot give
                  </Button>
                  <Button onClick={() => setIssuing(r)}>Issue</Button>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
      {issuing && (
        <Modal isOpen onClose={() => setIssuing(null)} title={`Issue ${issuing.number} to ${issuing.by}`} width="max-w-4xl">
          <MoveForm mode="issue" options={options} request={issuing} onDone={() => setIssuing(null)} />
        </Modal>
      )}
    </div>
  );
}

function IssuedTo({ options }: { options: Options }) {
  const [dept, setDept] = useState("");
  const [staff, setStaff] = useState("");
  const [from, setFrom] = useState(todayISO().slice(0, 8) + "01");
  const [to, setTo] = useState(todayISO());
  const q = useQuery({ queryKey: ["inventory", "issued", dept, staff, from, to], queryFn: () => invApi.issued({ departmentId: dept || undefined, staffId: staff || undefined, from, to }) });
  const total = (q.data ?? []).reduce((a, r) => a + r.value, 0);
  return (
    <div className="space-y-3">
      <Card>
        <div className="grid gap-3 sm:grid-cols-4">
          <Select label="Department" value={dept} onChange={setDept} options={opts(options.departments, "All")} />
          <Select label="Staff member" value={staff} onChange={setStaff} options={opts(options.staff, "All")} />
          <Input label="From" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          <Input label="To" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
      </Card>
      {q.isLoading ? (
        <PageLoader />
      ) : q.error ? (
        <FormAlert>{errorMessage(q.error)}</FormAlert>
      ) : (
        <Card padding="none">
          <p className="px-5 py-3 text-sm border-b border-outline-variant/20">
            {q.data!.length} movement(s) · value {money(Math.round(total))}
          </p>
          <ul className="divide-y divide-outline-variant/15 text-sm">
            {q.data!.map((r) => (
              <li key={r.id} className="flex flex-wrap gap-3 px-5 py-2">
                <span className="w-24 text-xs text-on-surface-variant">{day(r.at)}</span>
                <span className="flex-1">
                  {r.item} {r.kind === "return" && <Pill>Returned</Pill>}
                </span>
                <span>{qty(r.qty)}</span>
                <span className="w-24 text-right">{money(r.value)}</span>
                <span className="w-24 text-xs text-on-surface-variant">{r.refNo}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}

function Issue() {
  const o = useInvOptions();
  const [tab, setTab] = useState("requests");
  if (o.isLoading) return <PageLoader />;
  if (o.error) return <FormAlert>{errorMessage(o.error)}</FormAlert>;
  const options = o.data!;
  const tabs = [{ id: "requests", label: "Requests" }, ...(options.can.store ? [{ id: "issue", label: "Issue" }, { id: "return", label: "Take back" }, { id: "transfer", label: "Transfer" }] : []), { id: "history", label: "Issued to" }];
  return (
    <div className="space-y-4">
      <Tabs tabs={tabs} activeTab={tab} onChange={setTab} />
      {tab === "requests" && <Requests options={options} />}
      {(tab === "issue" || tab === "return" || tab === "transfer") && (
        <Card>
          <MoveForm key={tab} mode={tab as Mode} options={options} />
        </Card>
      )}
      {tab === "history" && <IssuedTo options={options} />}
    </div>
  );
}

export default function InventoryIssuePage() {
  return (
    <RequirePermission permission={["inventory.store", "inventory.approve"]}>
      <PageHeader title="Issue & Requests" description="Staff requests to approve and issue, issuing to a department or staff member, taking things back, and moving stock between stores." />
      <Issue />
    </RequirePermission>
  );
}
