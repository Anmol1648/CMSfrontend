"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Checkbox, FormAlert, Pill, Select } from "@/components/forms";
import { PageLoader } from "@/components/ui/PageLoader";
import { useToast } from "@/components/ui/ToastProvider";
import { useConfirm } from "@/components/ui/ConfirmProvider";
import { errorMessage } from "@/lib/api/client";
import { platformApi, School, SchoolUpdate, when } from "@/lib/api/platform";
import { usePlatformUser } from "@/components/platform/PlatformContext";

const num = (s: string) => (s.trim() === "" ? undefined : Math.max(0, Math.floor(Number(s)) || 0));

function Stat({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <Card>
      <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/60">{label}</p>
      <p className="text-2xl font-extrabold">{value}</p>
      {sub && <p className="text-xs text-on-surface-variant">{sub}</p>}
    </Card>
  );
}

function Details({ s, owner, onSaved }: { s: School; owner: boolean; onSaved: (x: School) => void }) {
  const { showToast } = useToast();
  const plans = useQuery({ queryKey: ["platform", "plans"], queryFn: platformApi.plans });
  const [f, setF] = useState<SchoolUpdate>({ name: s.name, domain: s.domain, city: s.city, contactName: s.contactName, contactEmail: s.contactEmail, contactPhone: s.contactPhone, notes: s.notes, planId: s.planId, modulesAll: s.modulesAll, modules: s.modules, limits: s.limits });
  const [lim, setLim] = useState({ maxStudents: String(s.limits.maxStudents ?? ""), aiMonthly: String(s.limits.aiMonthly ?? ""), storageMb: String(s.limits.storageMb ?? "") });
  const set = <K extends keyof SchoolUpdate>(k: K, v: SchoolUpdate[K]) => setF((x) => ({ ...x, [k]: v }));
  const modules = plans.data?.modules ?? [];
  const applyPlan = (id: string) => {
    const p = plans.data?.plans.find((x) => x.id === id);
    if (!p) return set("planId", null);
    setF((x) => ({ ...x, planId: p.id, modulesAll: false, modules: p.modules }));
    setLim({ maxStudents: String(p.limits.maxStudents ?? ""), aiMonthly: String(p.limits.aiMonthly ?? ""), storageMb: String(p.limits.storageMb ?? "") });
  };
  return (
    <div className="space-y-4">
      <Card className="space-y-3">
        <p className="font-bold">Details</p>
        <fieldset disabled={!owner} className="grid gap-3 sm:grid-cols-2">
          <Input label="Name" value={f.name} onChange={(e) => set("name", e.target.value)} />
          <Input label="Its own domain" value={f.domain ?? ""} onChange={(e) => set("domain", e.target.value.toLowerCase() || null)} placeholder="erp.school.in" />
          <Input label="City" value={f.city ?? ""} onChange={(e) => set("city", e.target.value || null)} />
          <Input label="Contact name" value={f.contactName ?? ""} onChange={(e) => set("contactName", e.target.value || null)} />
          <Input label="Contact email" value={f.contactEmail ?? ""} onChange={(e) => set("contactEmail", e.target.value || null)} />
          <Input label="Contact phone" value={f.contactPhone ?? ""} onChange={(e) => set("contactPhone", e.target.value || null)} />
          <label className="sm:col-span-2 flex flex-col gap-2">
            <span className="ml-1 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60">Notes (only Klytos sees these)</span>
            <textarea className="min-h-[4rem] rounded-xl border border-outline-variant/40 bg-transparent px-3 py-2 text-sm" value={f.notes ?? ""} onChange={(e) => set("notes", e.target.value || null)} maxLength={2000} />
          </label>
        </fieldset>
      </Card>
      <Card className="space-y-3">
        <p className="font-bold">Plan, modules and limits</p>
        <fieldset disabled={!owner} className="space-y-3">
          <Select className="max-w-sm" label="Plan (sets the modules and limits below; they can then be changed for this school)" value={f.planId ?? ""} onChange={applyPlan} options={[{ value: "", label: "No plan" }, ...(plans.data?.plans ?? []).map((p) => ({ value: p.id, label: p.name }))]} />
          <Checkbox checked={f.modulesAll} onChange={(v) => set("modulesAll", v)} label="Every module" hint="Off: only the modules ticked below. Students, staff, academic set-up, attendance, users, settings, dashboard and reports are always on." />
          {!f.modulesAll && (
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {modules.map((m) => (
                <Checkbox key={m.key} checked={f.modules.includes(m.key)} onChange={(v) => set("modules", v ? [...f.modules, m.key] : f.modules.filter((x) => x !== m.key))} label={m.label} hint={m.description} />
              ))}
            </div>
          )}
          <div className="grid gap-3 sm:grid-cols-3">
            <Input label="Students allowed (empty = no limit)" type="number" min={0} value={lim.maxStudents} onChange={(e) => setLim({ ...lim, maxStudents: e.target.value })} />
            <Input label="AI requests a month (empty = no limit)" type="number" min={0} value={lim.aiMonthly} onChange={(e) => setLim({ ...lim, aiMonthly: e.target.value })} />
            <Input label="File storage, MB (empty = no limit)" type="number" min={0} value={lim.storageMb} onChange={(e) => setLim({ ...lim, storageMb: e.target.value })} />
          </div>
        </fieldset>
      </Card>
      {owner && (
        <div className="flex justify-end">
          <Button
            onClick={async () => {
              try {
                const limits = Object.fromEntries(Object.entries({ maxStudents: num(lim.maxStudents), aiMonthly: num(lim.aiMonthly), storageMb: num(lim.storageMb) }).filter(([, v]) => v !== undefined));
                onSaved(await platformApi.updateSchool(s.id, { ...f, domain: f.domain || null, limits }));
                showToast("Saved: the school sees the change within a minute", "success");
              } catch (e) {
                showToast(errorMessage(e), "error");
              }
            }}
          >
            Save
          </Button>
        </div>
      )}
    </div>
  );
}

function MenuNames({ s }: { s: School }) {
  const qc = useQueryClient();
  const { showToast } = useToast();
  const confirm = useConfirm();
  const t = useQuery({ queryKey: ["platform", "menu-templates"], queryFn: platformApi.menuTemplates });
  const [templateId, setTemplateId] = useState("");
  const [name, setName] = useState("");
  return (
    <Card className="space-y-3">
      <p className="font-bold">Menu names</p>
      <p className="text-sm text-on-surface-variant">The school can rename, reorder and regroup its menu itself (Setup → Menu Setup). Here you can give it a ready-made set of names, or keep this school’s set as a template for others.</p>
      <div className="flex flex-wrap items-end gap-2">
        <Select className="max-w-xs" label="Template" value={templateId} onChange={setTemplateId} options={[{ value: "", label: "Choose…" }, ...(t.data ?? []).map((x) => ({ value: x.id, label: `${x.name} (${x.items.length} items, ${x.groups.length} groups)` }))]} />
        <Button
          variant="secondary"
          disabled={!templateId}
          onClick={async () => {
            if (!(await confirm({ title: "Apply this template?", message: `${s.name}'s own menu names and places are replaced.`, confirmLabel: "Apply" }))) return;
            try {
              await platformApi.applyMenu(s.id, templateId);
              showToast("Applied: the school sees it at its next page load", "success");
            } catch (e) {
              showToast(errorMessage(e), "error");
            }
          }}
        >
          Apply
        </Button>
        <Button
          variant="tertiary"
          onClick={async () => {
            if (!(await confirm({ title: "Built-in menu for this school?", message: "Its own menu names and places are removed.", confirmLabel: "Reset" }))) return;
            await platformApi.applyMenu(s.id, null).then(() => showToast("Back to the built-in menu", "success")).catch((e) => showToast(errorMessage(e), "error"));
          }}
        >
          Built-in menu
        </Button>
      </div>
      <div className="flex flex-wrap items-end gap-2">
        <Input className="max-w-xs" label="Save this school’s menu as a template" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Boarding school" />
        <Button
          variant="secondary"
          disabled={name.trim().length < 2}
          onClick={async () => {
            try {
              qc.setQueryData(["platform", "menu-templates"], await platformApi.saveMenuTemplate(s.id, name.trim(), ""));
              setName("");
              showToast("Template saved", "success");
            } catch (e) {
              showToast(errorMessage(e), "error");
            }
          }}
        >
          Save template
        </Button>
        {templateId && (
          <button
            type="button"
            className="pb-2 text-xs font-bold uppercase tracking-widest text-error"
            onClick={async () => {
              if (!(await confirm({ title: "Delete this template?", message: "Schools that used it keep their menus.", confirmLabel: "Delete", danger: true }))) return;
              qc.setQueryData(["platform", "menu-templates"], await platformApi.deleteMenuTemplate(templateId));
              setTemplateId("");
            }}
          >
            Delete template
          </button>
        )}
      </div>
    </Card>
  );
}

function Mail({ s, onSaved }: { s: School; onSaved: (x: School) => void }) {
  const { showToast } = useToast();
  const [f, setF] = useState({ host: s.mail?.host ?? "", port: s.mail?.port ?? "587", user: s.mail?.user ?? "", password: "", from: s.mail?.from ?? "" });
  return (
    <Card className="space-y-3">
      <p className="font-bold">School’s own mail server</p>
      <p className="text-sm text-on-surface-variant">{s.mail ? `Email goes from ${s.mail.from || s.mail.user}.` : "Not set: email goes from the platform as “School via Klytos”, replies to the school’s email."}</p>
      <div className="grid gap-3 sm:grid-cols-5">
        <Input label="SMTP host" value={f.host} onChange={(e) => setF({ ...f, host: e.target.value })} />
        <Input label="Port" value={f.port} onChange={(e) => setF({ ...f, port: e.target.value })} />
        <Input label="User" value={f.user} onChange={(e) => setF({ ...f, user: e.target.value })} />
        <Input label={s.mail ? "Password (blank = keep)" : "Password"} type="password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} />
        <Input label="From address" value={f.from} onChange={(e) => setF({ ...f, from: e.target.value })} />
      </div>
      <div className="flex justify-end gap-2">
        {s.mail && (
          <Button variant="tertiary" onClick={async () => onSaved(await platformApi.setMail(s.id, null).catch((e) => (showToast(errorMessage(e), "error"), s)))}>
            Remove
          </Button>
        )}
        <Button
          disabled={!f.host || !f.user || (!s.mail && !f.password)}
          onClick={async () => {
            try {
              onSaved(await platformApi.setMail(s.id, { host: f.host, port: Number(f.port) || 587, user: f.user, password: f.password || undefined, from: f.from || null }));
              showToast("Saved", "success");
            } catch (e) {
              showToast(errorMessage(e), "error");
            }
          }}
        >
          Save
        </Button>
      </div>
    </Card>
  );
}

export default function SchoolPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = usePlatformUser();
  const owner = user.role === "owner";
  const qc = useQueryClient();
  const { showToast } = useToast();
  const confirm = useConfirm();
  const q = useQuery({ queryKey: ["platform", "school", id], queryFn: () => platformApi.school(id) });
  const log = useQuery({ queryKey: ["platform", "log", id], queryFn: () => platformApi.log(1, id) });
  const [pw, setPw] = useState<{ username: string; password: string } | null>(null);
  const [del, setDel] = useState(false);
  const [code, setCode] = useState("");
  const [s, setS] = useState<School | null>(null);
  useEffect(() => setS(q.data ?? null), [q.data]);
  if (q.isLoading || !s) return q.error ? <FormAlert>{errorMessage(q.error)}</FormAlert> : <PageLoader />;
  const saved = (x: School) => {
    setS(x);
    qc.invalidateQueries({ queryKey: ["platform"] });
  };
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/platform" className="text-xs font-bold uppercase tracking-widest text-primary">
            ← Schools
          </Link>
          <h1 className="mt-1 text-2xl font-extrabold">{s.name}</h1>
          <p className="text-sm text-on-surface-variant">
            {s.code}
            {s.address && (
              <>
                {" · "}
                <a href={s.address} target="_blank" rel="noreferrer" className="text-primary">
                  {s.address.replace(/^https:\/\//, "")}
                </a>
              </>
            )}{" "}
            · added {new Date(s.createdAt).toLocaleDateString("en-IN")}
          </p>
          <div className="mt-1 flex gap-2">
            <Pill tone={s.status === "active" ? "success" : "danger"}>{s.status === "active" ? "Active" : "Suspended"}</Pill>
            {s.setup.live ? <Pill tone="primary">Live since {s.setup.liveOn}</Pill> : <Pill tone="warning">Setting up</Pill>}
          </div>
          {s.suspendedReason && <p className="mt-1 text-sm text-error">Reason: {s.suspendedReason}</p>}
        </div>
        {owner && (
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => platformApi.exportSchool(s.id).catch((e) => showToast(errorMessage(e), "error"))}>
              Export all data
            </Button>
            {s.status === "active" ? (
              <Button
                variant="secondary"
                onClick={async () => {
                  if (!(await confirm({ title: `Suspend ${s.name}?`, message: "Nobody at the school can sign in until it is reactivated. Nothing is deleted.", confirmLabel: "Suspend", danger: true }))) return;
                  saved(await platformApi.setStatus(s.id, "suspended", "Suspended by Klytos"));
                }}
              >
                Suspend
              </Button>
            ) : (
              <Button onClick={async () => saved(await platformApi.setStatus(s.id, "active"))}>Reactivate</Button>
            )}
          </div>
        )}
      </div>

      {s.deleteAfter && (
        <FormAlert tone="warning">
          Everything of this school will be deleted after {new Date(s.deleteAfter).toLocaleDateString("en-IN")}.{" "}
          {owner && (
            <button className="underline" onClick={async () => saved(await platformApi.cancelDelete(s.id))}>
              Cancel the deletion
            </button>
          )}
        </FormAlert>
      )}

      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Stat label="Students" value={s.students} sub={s.limits.maxStudents ? `of ${s.limits.maxStudents}` : undefined} />
        <Stat label="Staff" value={s.staff} />
        <Stat label="Logins" value={s.users} />
        <Stat label="Files" value={`${s.storageMb} MB`} sub={s.limits.storageMb ? `of ${s.limits.storageMb} MB` : undefined} />
        <Stat label="AI this month" value={s.aiThisMonth} sub={s.limits.aiMonthly ? `of ${s.limits.aiMonthly}` : undefined} />
        <Stat label="Last sign-in" value={s.lastSignIn ? new Date(s.lastSignIn).toLocaleDateString("en-IN") : "—"} />
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_22rem]">
        <Details key={s.id + s.planId + String(s.modulesAll)} s={s} owner={owner} onSaved={saved} />
        <div className="space-y-4">
          <Card>
            <p className="mb-2 font-bold">
              Setting up: {s.setup.done} of {s.setup.total}
            </p>
            {s.setup.steps.map((st) => (
              <p key={st.key} className="flex items-center gap-2 py-0.5 text-sm">
                <span className={`material-symbols-outlined text-base ${st.done ? "text-emerald-600" : "text-on-surface-variant/40"}`}>{st.done ? "check_circle" : "radio_button_unchecked"}</span>
                {st.label}
                {st.detail && <span className="text-xs text-on-surface-variant">· {st.detail}</span>}
              </p>
            ))}
          </Card>
          <Card>
            <p className="mb-2 font-bold">School admins</p>
            {s.admins.map((a) => (
              <div key={a.id} className="flex items-center justify-between gap-2 border-b border-outline-variant/10 py-2 text-sm last:border-0">
                <span>
                  <b>{a.displayName}</b> <span className="text-on-surface-variant">{a.username}</span>
                  <p className="text-xs text-on-surface-variant">last sign-in {when(a.lastLoginAt)}</p>
                </span>
                <Button
                  variant="tertiary"
                  onClick={async () => {
                    if (!(await confirm({ title: `New one-time password for ${a.displayName}?`, message: "Their current password stops working; they choose a new one at sign-in.", confirmLabel: "Reset" }))) return;
                    try {
                      setPw(await platformApi.resetAdmin(s.id, a.id));
                    } catch (e) {
                      showToast(errorMessage(e), "error");
                    }
                  }}
                >
                  Reset password
                </Button>
              </div>
            ))}
          </Card>
          <Card>
            <p className="mb-2 font-bold">Recent activity</p>
            {(log.data?.rows ?? []).slice(0, 10).map((r) => (
              <p key={r.id} className="py-0.5 text-xs">
                <span className="text-on-surface-variant">{when(r.createdAt)}</span> · {r.action.replace(/_/g, " ")} · {r.by}
              </p>
            ))}
          </Card>
        </div>
      </div>

      {owner && <MenuNames s={s} />}
      {owner && <Mail s={s} onSaved={saved} />}

      {owner && (
        <Card className="space-y-2 border border-error/30">
          <p className="font-bold text-error">Delete this school</p>
          <p className="text-sm text-on-surface-variant">Suspend it first. Everything (records and files) is deleted 30 days after you ask; reactivating cancels it. Export the data first if the school wants a copy.</p>
          <Button variant="secondary" disabled={s.status !== "suspended" || !!s.deleteAfter} onClick={() => setDel(true)}>
            Delete this school…
          </Button>
        </Card>
      )}

      {pw && (
        <Modal isOpen onClose={() => setPw(null)} title="New one-time password">
          <div className="space-y-2 text-sm">
            <p>
              Username: <b>{pw.username}</b>
            </p>
            <p>
              One-time password: <b className="font-mono">{pw.password}</b>
            </p>
            <FormAlert tone="info">Give it to the admin; it is shown only now.</FormAlert>
            <div className="flex justify-end">
              <Button onClick={() => setPw(null)}>Done</Button>
            </div>
          </div>
        </Modal>
      )}
      {del && (
        <Modal isOpen onClose={() => setDel(false)} title={`Delete ${s.name}?`}>
          <div className="space-y-3 text-sm">
            <p>
              Type the school code <b>{s.code}</b> to confirm. Everything is deleted after 30 days.
            </p>
            <Input value={code} onChange={(e) => setCode(e.target.value)} />
            <div className="flex justify-end gap-2">
              <Button variant="tertiary" onClick={() => setDel(false)}>
                Cancel
              </Button>
              <Button
                disabled={code.trim().toLowerCase() !== s.code}
                onClick={async () => {
                  try {
                    saved(await platformApi.requestDelete(s.id, code));
                    setDel(false);
                  } catch (e) {
                    showToast(errorMessage(e), "error");
                  }
                }}
              >
                Delete after 30 days
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
