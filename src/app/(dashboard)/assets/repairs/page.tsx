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
import { AuthedPhoto } from "@/components/visitors/Photo";
import { RequirePermission } from "@/lib/auth/RequirePermission";
import { useAuth } from "@/lib/auth/AuthProvider";
import { errorMessage } from "@/lib/api/client";
import { assetsApi, day, Issue, ISSUE, IssueStatus, REASON, rupees } from "@/lib/api/assets";
import { AssetDrawer, ReportProblem, useAssetOptions } from "@/components/assets/AssetParts";

function IssueForm({ issue, onClose }: { issue: Issue; onClose: () => void }) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const o = useAssetOptions();
  const [status, setStatus] = useState<IssueStatus>(issue.status === "open" ? "in_repair" : issue.status);
  const [vendor, setVendor] = useState(issue.vendorId ?? "");
  const [cost, setCost] = useState(issue.cost === null ? "" : String(issue.cost));
  const [resolution, setResolution] = useState(issue.resolution ?? "");
  const save = async () => {
    try {
      await assetsApi.updateIssue(issue.id, { status, vendorId: vendor || null, cost: cost.trim() ? Math.max(0, Math.round(Number(cost))) || 0 : null, resolution: resolution.trim() || null });
      queryClient.invalidateQueries({ queryKey: ["assets"] });
      showToast(status === "fixed" ? "Marked fixed: the reporter is told" : "Saved", "success");
      onClose();
    } catch (e) {
      showToast(errorMessage(e), "error");
    }
  };
  const done = status === "fixed" || status === "written_off";
  return (
    <Modal isOpen onClose={onClose} title={issue.title} width="max-w-xl">
      <div className="space-y-4">
        <p className="text-sm">
          <b>{issue.asset}</b>
          {issue.room ? ` · ${issue.room}` : ""}
        </p>
        {issue.details && <p className="text-sm text-on-surface-variant">{issue.details}</p>}
        {issue.photoFileId && <AuthedPhoto path={assetsApi.fileUrl(issue.photoFileId)} className="h-40 w-full rounded-xl object-cover" icon="image" />}
        <div className="grid gap-3 sm:grid-cols-2">
          <Select label="Status" value={status} onChange={(v) => setStatus(v as IssueStatus)} options={(Object.keys(ISSUE) as IssueStatus[]).map((k) => ({ value: k, label: ISSUE[k].label }))} />
          <Select label="Repaired by (vendor)" value={vendor} onChange={setVendor} options={[{ value: "", label: "Our own staff" }, ...(o.data?.vendors ?? []).map((v) => ({ value: v.id, label: v.name }))]} />
          <Input label="Cost (₹)" type="number" min={0} value={cost} onChange={(e) => setCost(e.target.value)} />
        </div>
        <label className="flex flex-col gap-2">
          <span className="text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-widest ml-1">What was done{done ? " (needed)" : ""}</span>
          <textarea value={resolution} onChange={(e) => setResolution(e.target.value)} rows={3} maxLength={1000} className="rounded-xl bg-surface-container-low px-4 py-3 text-sm outline-none" />
        </label>
        <p className="text-xs text-on-surface-variant">“In repair” marks the asset in repair; “Fixed” puts it back in use and records it in the asset’s history. “Written off” closes the problem (write the asset off from the register if it cannot be used).</p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save} disabled={done && !resolution.trim()}>
            Save
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function Problems({ openAsset }: { openAsset: (id: string) => void }) {
  const { can } = useAuth();
  const [show, setShow] = useState("open");
  const [edit, setEdit] = useState<Issue | null>(null);
  const [report, setReport] = useState(false);
  const q = useQuery({ queryKey: ["assets", "issues", show], queryFn: () => assetsApi.issues(show) });
  const repair = can("asset.repair") || can("asset.manage");
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-2 justify-between">
        <Select className="max-w-xs" value={show} onChange={setShow} options={[{ value: "open", label: "Open and in repair" }, { value: "fixed", label: "Fixed / closed" }, { value: "all", label: "All" }]} />
        <Button variant="secondary" onClick={() => setReport(true)}>
          <span className="material-symbols-outlined text-lg">report</span> Report a problem
        </Button>
      </div>
      {q.isLoading ? (
        <PageLoader />
      ) : q.error ? (
        <FormAlert>{errorMessage(q.error)}</FormAlert>
      ) : !q.data!.length ? (
        <FormAlert tone="info">Nothing here. 👍</FormAlert>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {q.data!.map((i) => (
            <Card key={i.id} padding="sm">
              <div className="flex items-start gap-2">
                <div className="flex-1 min-w-0">
                  <p className="font-bold">{i.title}</p>
                  <button type="button" className="text-sm text-primary font-semibold text-left" onClick={() => openAsset(i.assetId)}>
                    {i.asset}
                  </button>
                  <p className="text-xs text-on-surface-variant">
                    {i.room ?? "No room"} · {day(i.createdAt)} · by {i.reportedBy ?? "—"}
                  </p>
                </div>
                <Pill tone={ISSUE[i.status].tone}>{ISSUE[i.status].label}</Pill>
              </div>
              {i.details && <p className="mt-1 text-sm">{i.details}</p>}
              {(i.vendor || i.cost || i.resolution) && (
                <p className="mt-1 text-xs text-on-surface-variant">
                  {[i.vendor, i.cost ? rupees(i.cost) : null, i.resolution].filter(Boolean).join(" · ")}
                </p>
              )}
              {repair && (
                <div className="mt-2 flex justify-end">
                  <Button variant="tertiary" onClick={() => setEdit(i)}>
                    {i.status === "open" ? "Take it up" : "Update"}
                  </Button>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
      {edit && <IssueForm issue={edit} onClose={() => setEdit(null)} />}
      {report && <ReportProblem onClose={() => setReport(false)} onDone={() => q.refetch()} />}
    </div>
  );
}

function Due({ openAsset }: { openAsset: (id: string) => void }) {
  const q = useQuery({ queryKey: ["assets", "care"], queryFn: assetsApi.care });
  if (q.isLoading) return <PageLoader />;
  if (q.error) return <FormAlert>{errorMessage(q.error)}</FormAlert>;
  const d = q.data!;
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <p className="font-extrabold mb-1">Maintenance due</p>
        <p className="text-xs text-on-surface-variant mb-3">Open an asset and click “Maintenance done” to set the next date.</p>
        <ul className="divide-y divide-outline-variant/20">
          {d.maintenance.map((m) => (
            <li key={m.id}>
              <button type="button" onClick={() => openAsset(m.id)} className="w-full flex items-center gap-2 py-2 text-left text-sm">
                <span className="flex-1">
                  <b>{m.name}</b> <span className="text-on-surface-variant">· {m.code}{m.room ? ` · ${m.room}` : ""}</span>
                </span>
                <Pill tone={m.overdue ? "danger" : "warning"}>{m.overdue ? `Overdue ${day(m.due)}` : `Due ${day(m.due)}`}</Pill>
              </button>
            </li>
          ))}
          {!d.maintenance.length && <li className="py-2 text-sm text-on-surface-variant">Nothing due.</li>}
        </ul>
      </Card>
      <Card>
        <p className="font-extrabold mb-1">Warranties and AMCs ending</p>
        <p className="text-xs text-on-surface-variant mb-3">Within the days in System Settings → Assets.</p>
        <ul className="divide-y divide-outline-variant/20">
          {d.warranty.map((w) => (
            <li key={w.id}>
              <button type="button" onClick={() => openAsset(w.id)} className="w-full flex items-center gap-2 py-2 text-left text-sm">
                <span className="flex-1">
                  <b>{w.name}</b> <span className="text-on-surface-variant">· {w.code}{w.room ? ` · ${w.room}` : ""}</span>
                </span>
                <span className="text-xs">
                  {w.warrantyUntil ? `Warranty ${day(w.warrantyUntil)}` : ""}
                  {w.amcUntil ? ` AMC ${day(w.amcUntil)}` : ""}
                </span>
              </button>
            </li>
          ))}
          {!d.warranty.length && <li className="py-2 text-sm text-on-surface-variant">Nothing ending soon.</li>}
        </ul>
      </Card>
    </div>
  );
}

function WriteOffs({ openAsset }: { openAsset: (id: string) => void }) {
  const { can } = useAuth();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const confirm = useConfirm();
  const q = useQuery({ queryKey: ["assets", "disposals"], queryFn: assetsApi.disposals });
  const answer = async (id: string, approve: boolean, label: string) => {
    if (!(await confirm({ title: approve ? `Approve writing off ${label}?` : `Refuse writing off ${label}?`, confirmLabel: approve ? "Approve" : "Refuse", danger: approve }))) return;
    try {
      await assetsApi.answerDisposal(id, approve);
      queryClient.invalidateQueries({ queryKey: ["assets"] });
      showToast(approve ? "Approved: the asset is written off" : "Refused", "success");
    } catch (e) {
      showToast(errorMessage(e), "error");
    }
  };
  if (q.isLoading) return <PageLoader />;
  if (q.error) return <FormAlert>{errorMessage(q.error)}</FormAlert>;
  if (!q.data!.length) return <FormAlert tone="info">No write-off is waiting.</FormAlert>;
  return (
    <div className="space-y-3">
      {q.data!.map((d) => (
        <Card key={d.id} padding="sm">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex-1 min-w-0">
              <button type="button" className="font-bold text-primary text-left" onClick={() => openAsset(d.assetId)}>
                {d.asset}
              </button>
              <p className="text-sm">
                {REASON[d.reason] ?? d.reason}
                {d.amount ? ` for ${rupees(d.amount)}` : ""} · cost {rupees(d.cost)}
                {d.note ? ` · ${d.note}` : ""}
              </p>
              <p className="text-xs text-on-surface-variant">
                Asked by {d.by} on {day(d.at)}
              </p>
            </div>
            {can("asset.approve_disposal") ? (
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => answer(d.id, false, d.asset)}>
                  Refuse
                </Button>
                <Button onClick={() => answer(d.id, true, d.asset)}>Approve</Button>
              </div>
            ) : (
              <Pill tone="warning">Waiting for approval</Pill>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
}

function Repairs() {
  const { can } = useAuth();
  const [open, setOpen] = useState<string | null>(null);
  const tabs = [
    ...(can("asset.repair") || can("asset.manage") || can("asset.view") ? [{ id: "problems", label: "Problems" }, { id: "due", label: "Maintenance & warranty" }] : []),
    ...(can("asset.approve_disposal") || can("asset.manage") ? [{ id: "writeoffs", label: "Write-offs" }] : []),
  ];
  const [tab, setTab] = useState(tabs[0]?.id ?? "problems");
  return (
    <div className="space-y-4">
      <Tabs tabs={tabs} activeTab={tab} onChange={setTab} />
      {tab === "problems" && <Problems openAsset={setOpen} />}
      {tab === "due" && <Due openAsset={setOpen} />}
      {tab === "writeoffs" && <WriteOffs openAsset={setOpen} />}
      {open && <AssetDrawer id={open} onClose={() => setOpen(null)} />}
    </div>
  );
}

export default function AssetRepairsPage() {
  return (
    <RequirePermission permission={["asset.repair", "asset.manage", "asset.approve_disposal"]}>
      <PageHeader title="Repairs & Maintenance" description="Problems reported by staff, maintenance due, warranties ending, and write-offs waiting for approval." />
      <Repairs />
    </RequirePermission>
  );
}
