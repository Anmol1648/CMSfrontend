"use client";

import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Tabs } from "@/components/ui/Tabs";
import { Modal } from "@/components/ui/Modal";
import { FormAlert, Pill } from "@/components/forms";
import { PageHeader } from "@/components/layout/AppShell";
import { PageLoader } from "@/components/ui/PageLoader";
import { MasterSelect } from "@/components/masters/MasterSelect";
import { DocumentViewer } from "@/components/documents/DocumentViewer";
import { AskTc } from "@/components/students/AskTc";
import { useToast } from "@/components/ui/ToastProvider";
import { useConfirm } from "@/components/ui/ConfirmProvider";
import { useAuth } from "@/lib/auth/AuthProvider";
import { errorMessage } from "@/lib/api/client";
import { todayIST } from "@/lib/api/attendance";
import { Tc, tcApi } from "@/lib/api/promotion";

const STATUS: Record<Tc["status"], { label: string; tone: "warning" | "success" | "neutral" }> = { requested: { label: "Asked for", tone: "warning" }, issued: { label: "Issued", tone: "success" }, cancelled: { label: "Cancelled", tone: "neutral" } };
const fmt = (iso: string | null) => (iso ? new Date(iso.length === 10 ? `${iso}T00:00:00Z` : iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: iso.length === 10 ? "UTC" : "Asia/Kolkata" }) : "—");
const rupees = (n: number) => `₹${n.toLocaleString("en-IN")}`;

/** One TC: details, clearances, fees, then issue and print (or cancel). */
function TcDetail({ id, onClose }: { id: string; onClose: () => void }) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const confirm = useConfirm();
  const { can } = useAuth();
  const office = can("tc.manage");
  const q = useQuery({ queryKey: ["tc", id], queryFn: () => tcApi.get(id) });
  const t = q.data;
  const [form, setForm] = useState<{ leavingDate: string; reasonId: string; lastClass: string; result: string; conduct: string; remarks: string } | null>(null);
  const [printing, setPrinting] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (t) setForm({ leavingDate: t.leavingDate, reasonId: t.reasonId ?? "", lastClass: t.lastClass ?? "", result: t.result ?? "", conduct: t.conduct, remarks: t.remarks ?? "" });
  }, [t]);
  const refresh = (fresh?: Tc) => {
    if (fresh) queryClient.setQueryData(["tc", id], fresh);
    queryClient.invalidateQueries({ queryKey: ["tcs"] });
  };
  const act = async (p: Promise<Tc>, done: string) => {
    setBusy(true);
    try {
      refresh(await p);
      showToast(done, "success");
    } catch (err) {
      showToast(errorMessage(err), "error");
    } finally {
      setBusy(false);
    }
  };
  const saveForm = () => form && act(tcApi.save(id, { leavingDate: form.leavingDate, reasonId: form.reasonId || null, lastClass: form.lastClass || null, result: form.result || null, conduct: form.conduct || "Good", remarks: form.remarks || null }), "Saved");
  const issue = async () => {
    if (!t) return;
    if (!(await confirm({ title: `Issue the TC of ${t.student.name}?`, message: "It gets the next TC number; the student is marked as left and their login stops. You can print it straight after.", confirmLabel: "Issue TC" }))) return;
    await saveForm();
    await act(tcApi.issue(id), "TC issued");
  };
  const cancel = async () => {
    if (!t) return;
    const ok = await confirm({ title: t.status === "issued" ? `Cancel TC ${t.tcNo}?` : "Cancel this TC request?", message: t.status === "issued" ? "The student becomes active again (their login works again). The number is not used again." : "The request is withdrawn.", confirmLabel: "Cancel TC", danger: true });
    if (!ok) return;
    await act(tcApi.cancel(id, t.status === "issued" ? "Issued by mistake" : "Request withdrawn"), "Cancelled");
  };
  const editable = t?.status === "requested" && office;
  return (
    <Modal isOpen onClose={onClose} title={t ? `TC · ${t.student.name}` : "Transfer certificate"} width="max-w-3xl">
      {!t || !form ? (
        <PageLoader />
      ) : (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <Pill tone={STATUS[t.status].tone}>{STATUS[t.status].label}</Pill>
            {t.tcNo && <span className="font-mono font-bold">{t.tcNo}</span>}
            <span className="text-on-surface-variant/70">
              {t.student.admissionNo} · {t.student.section ?? "—"} · asked {fmt(t.applicationDate)}
              {t.requestedBy ? ` by ${t.requestedBy}` : ""}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Leaving on" type="date" value={form.leavingDate} disabled={!editable} onChange={(e) => setForm({ ...form, leavingDate: e.target.value })} />
            <MasterSelect master="leaving_reason" label="Reason for leaving" value={form.reasonId} onChange={(v) => setForm({ ...form, reasonId: v })} disabled={!editable} placeholder="Choose…" />
            <Input label="Class last studied in" value={form.lastClass} disabled={!editable} onChange={(e) => setForm({ ...form, lastClass: e.target.value })} maxLength={60} />
            <Input label="Result of the last exam" value={form.result} disabled={!editable} onChange={(e) => setForm({ ...form, result: e.target.value })} maxLength={120} placeholder="e.g. Passed and promoted to Class VIII" />
            <Input label="Conduct" value={form.conduct} disabled={!editable} onChange={(e) => setForm({ ...form, conduct: e.target.value })} maxLength={60} />
            <Input label="Remarks" value={form.remarks} disabled={!editable} onChange={(e) => setForm({ ...form, remarks: e.target.value })} maxLength={300} />
          </div>
          {editable && (
            <div className="flex justify-end">
              <Button variant="secondary" onClick={saveForm} loading={busy}>
                Save details
              </Button>
            </div>
          )}

          <div className="rounded-xl bg-surface-container-low p-4 space-y-3">
            <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/60">Clearances</p>
            <div className={`flex items-center justify-between text-sm ${t.dues && t.dues.total > 0 ? "text-error" : "text-emerald-700"}`}>
              <span className="font-semibold">Fees</span>
              <span className="font-bold">{t.dues && t.dues.total > 0 ? `${rupees(t.dues.total)} due (${t.dues.by.map((d) => `${d.year}: ${rupees(d.amount)}`).join(", ")})` : "✓ Nothing due"}</span>
            </div>
            {t.clearances.map((c) => (
              <label key={c.id} className="flex items-center justify-between gap-3 text-sm">
                <span className="flex items-center gap-2">
                  <input type="checkbox" className="h-4 w-4 accent-[#1A365D]" checked={c.done} disabled={t.status !== "requested" || busy} onChange={(e) => act(tcApi.clear(id, c.id, e.target.checked), e.target.checked ? `${c.label}: cleared` : "Saved")} />
                  {c.label}
                </span>
                <span className="text-[11px] text-on-surface-variant/70">{c.done ? `${c.by ?? ""} · ${fmt(c.at)}` : "not yet"}</span>
              </label>
            ))}
            {!t.clearances.length && <p className="text-xs text-on-surface-variant/70">No clearances set up (Masters → TC clearances).</p>}
          </div>

          {t.status === "cancelled" && t.cancelNote && <FormAlert tone="info">Cancelled: {t.cancelNote}</FormAlert>}
          {t.status === "issued" && (
            <p className="text-sm text-on-surface-variant">
              Issued {fmt(t.issuedAt)}
              {t.issuedBy ? ` by ${t.issuedBy}` : ""} · printed {t.printCount} time{t.printCount === 1 ? "" : "s"}
              {t.printCount > 0 ? " (next prints say DUPLICATE)" : ""}
            </p>
          )}
          <div className="flex flex-wrap justify-end gap-3">
            {office && t.status !== "cancelled" && (
              <Button variant="secondary" onClick={cancel} disabled={busy}>
                {t.status === "issued" ? "Cancel TC" : "Cancel request"}
              </Button>
            )}
            {office && t.status === "requested" && (
              <Button onClick={issue} loading={busy} disabled={!t.cleared}>
                {t.cleared ? "Issue TC" : "Clear everything to issue"}
              </Button>
            )}
            {office && t.status === "issued" && <Button onClick={() => setPrinting(true)}>{t.printCount ? "Print duplicate" : "Print TC"}</Button>}
          </div>
        </div>
      )}
      {printing && t && (
        <DocumentViewer
          docKey="transfer_certificate"
          params={{ id: t.id }}
          title={`TC ${t.tcNo}`}
          filename={`TC-${t.tcNo}.pdf`}
          onClose={() => {
            setPrinting(false);
            queryClient.invalidateQueries({ queryKey: ["tc", id] });
          }}
        />
      )}
    </Modal>
  );
}

function Tcs() {
  const queryClient = useQueryClient();
  const { can } = useAuth();
  const [tab, setTab] = useState("requested");
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const [asking, setAsking] = useState(false);
  const list = useQuery({ queryKey: ["tcs", tab, search], queryFn: () => tcApi.list(tab, search) });
  return (
    <>
      <PageHeader
        title="Transfer Certificates"
        description="Ask for a TC, get it cleared (fees by themselves; library, laboratory… by those in charge), then issue it with the next TC number and print it."
        actions={
          can("tc.manage") ? (
            <Button onClick={() => setAsking(true)}>
              <span className="material-symbols-outlined text-lg align-middle mr-1">add</span>
              Ask for TC
            </Button>
          ) : undefined
        }
      />
      <div className="mb-4 space-y-3">
        <Tabs
          tabs={[
            { id: "requested", label: "Waiting" },
            { id: "issued", label: "Issued" },
            { id: "cancelled", label: "Cancelled" },
            { id: "all", label: "All" },
          ]}
          activeTab={tab}
          onChange={setTab}
        />
        <div className="max-w-sm">
          <Input placeholder="Student, admission or TC no." value={search} onChange={(e) => setSearch(e.target.value)} icon="search" />
        </div>
      </div>
      {list.isError && <FormAlert>{errorMessage(list.error)}</FormAlert>}
      {!list.data && !list.isError && <PageLoader />}
      {list.data && (
        <Card padding="none" className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-widest text-on-surface-variant/60 border-b border-outline-variant/20">
                  <th className="px-5 py-3 font-bold">Student</th>
                  <th className="px-5 py-3 font-bold">Leaving</th>
                  <th className="px-5 py-3 font-bold">Clearances</th>
                  <th className="px-5 py-3 font-bold">Status</th>
                </tr>
              </thead>
              <tbody>
                {list.data.map((t) => (
                  <tr key={t.id} className="border-t border-outline-variant/10 hover:bg-surface-container-low cursor-pointer" onClick={() => setOpen(t.id)}>
                    <td className="px-5 py-3">
                      <p className="font-semibold">{t.student.name}</p>
                      <p className="text-[11px] text-on-surface-variant/70">
                        {t.student.admissionNo} · {t.student.section ?? "—"}
                      </p>
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap">
                      {fmt(t.leavingDate)}
                      {t.reason && <p className="text-[11px] text-on-surface-variant/70">{t.reason}</p>}
                    </td>
                    <td className="px-5 py-3 text-xs">
                      {t.clearances.filter((c) => c.done).length} / {t.clearances.length}
                      {t.cleared && t.status === "requested" && <span className="ml-1 text-emerald-700 font-bold">✓ ready</span>}
                    </td>
                    <td className="px-5 py-3">
                      <Pill tone={STATUS[t.status].tone}>{STATUS[t.status].label}</Pill>
                      {t.tcNo && <p className="text-[11px] font-mono mt-1">{t.tcNo}</p>}
                    </td>
                  </tr>
                ))}
                {!list.data.length && (
                  <tr>
                    <td colSpan={4} className="px-5 py-12 text-center text-on-surface-variant/70">
                      {tab === "requested" ? "No TC waiting." : "None."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}
      {open && <TcDetail id={open} onClose={() => setOpen(null)} />}
      {asking && (
        <AskTc
          onClose={() => setAsking(false)}
          onDone={(t) => {
            setAsking(false);
            queryClient.invalidateQueries({ queryKey: ["tcs"] });
            setOpen(t.id);
          }}
        />
      )}
    </>
  );
}

export default function TransferCertificatesPage() {
  const { can } = useAuth();
  if (!can("tc.manage") && !can("tc.clear"))
    return <Card className="max-w-lg mx-auto mt-20 text-center">You don&apos;t have access to this page. Ask your school&apos;s administrator for the “transfer certificates” permission.</Card>;
  return <Tcs />;
}
