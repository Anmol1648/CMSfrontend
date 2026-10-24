"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Checkbox, FormAlert, Pill, Select } from "@/components/forms";
import { PageLoader } from "@/components/ui/PageLoader";
import { useToast } from "@/components/ui/ToastProvider";
import { errorMessage } from "@/lib/api/client";
import { platformApi, when } from "@/lib/api/platform";
import { usePlatformUser } from "@/components/platform/PlatformContext";

function AddSchool({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const { showToast } = useToast();
  const plans = useQuery({ queryKey: ["platform", "plans"], queryFn: platformApi.plans });
  const [f, setF] = useState({ code: "", name: "", city: "", domain: "", contactName: "", contactEmail: "", contactPhone: "", planId: "", adminName: "", adminUsername: "admin", adminEmail: "", starterData: true });
  const [done, setDone] = useState<{ code: string; address: string | null; username: string; password: string; emailed: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f, v: string | boolean) => setF((x) => ({ ...x, [k]: v }));
  if (done)
    return (
      <Modal isOpen onClose={onDone} title="School added">
        <div className="space-y-3 text-sm">
          <FormAlert tone="success">Write these down now: the password is shown only once{done.emailed ? " (it was also emailed to the admin)" : ""}.</FormAlert>
          <p>
            Address: <b>{done.address ?? "set the platform domain or the school's own domain"}</b>
          </p>
          <p>
            School code: <b>{done.code}</b>
          </p>
          <p>
            Username: <b>{done.username}</b>
          </p>
          <p>
            One-time password: <b className="font-mono">{done.password}</b>
          </p>
          <div className="flex justify-end">
            <Button onClick={onDone}>Done</Button>
          </div>
        </div>
      </Modal>
    );
  return (
    <Modal isOpen onClose={onClose} title="Add a school" width="max-w-2xl">
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <Input label="School name" value={f.name} onChange={(e) => set("name", e.target.value)} />
          <Input label="School code (in its address)" value={f.code} onChange={(e) => set("code", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))} placeholder="e.g. gvs" />
          <Input label="City" value={f.city} onChange={(e) => set("city", e.target.value)} />
          <Input label="Its own domain (optional)" value={f.domain} onChange={(e) => set("domain", e.target.value.toLowerCase())} placeholder="erp.school.in" />
          <Select label="Plan" value={f.planId} onChange={(v) => set("planId", v)} options={[{ value: "", label: "Every module (no plan)" }, ...(plans.data?.plans ?? []).filter((p) => p.isActive).map((p) => ({ value: p.id, label: p.name }))]} />
        </div>
        <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant/60">Contact at the school</p>
        <div className="grid gap-3 sm:grid-cols-3">
          <Input label="Name" value={f.contactName} onChange={(e) => set("contactName", e.target.value)} />
          <Input label="Email" value={f.contactEmail} onChange={(e) => set("contactEmail", e.target.value)} />
          <Input label="Phone" value={f.contactPhone} onChange={(e) => set("contactPhone", e.target.value)} />
        </div>
        <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant/60">The school’s first admin</p>
        <div className="grid gap-3 sm:grid-cols-3">
          <Input label="Name" value={f.adminName} onChange={(e) => set("adminName", e.target.value)} />
          <Input label="Username" value={f.adminUsername} onChange={(e) => set("adminUsername", e.target.value.toLowerCase())} />
          <Input label="Email (sign-in details are sent here)" value={f.adminEmail} onChange={(e) => set("adminEmail", e.target.value)} />
        </div>
        <Checkbox checked={f.starterData} onChange={(v) => set("starterData", v)} label="Add the starter lists (masters, statuses, room types…)" />
        <div className="flex justify-end gap-2">
          <Button variant="tertiary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            loading={busy}
            disabled={f.name.trim().length < 2 || f.code.length < 2 || f.adminName.trim().length < 2 || f.adminUsername.length < 3}
            onClick={async () => {
              setBusy(true);
              try {
                const r = await platformApi.createSchool({ code: f.code, name: f.name, domain: f.domain || null, city: f.city || null, contactName: f.contactName || null, contactEmail: f.contactEmail || null, contactPhone: f.contactPhone || null, planId: f.planId || null, starterData: f.starterData, admin: { displayName: f.adminName, username: f.adminUsername, email: f.adminEmail || null } });
                setDone({ code: r.code, address: r.address, username: r.admin.username, password: r.admin.temporaryPassword, emailed: r.emailed });
              } catch (e) {
                showToast(errorMessage(e), "error");
              } finally {
                setBusy(false);
              }
            }}
          >
            Add school
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export default function SchoolsPage() {
  const { user } = usePlatformUser();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["platform", "schools"], queryFn: platformApi.schools });
  const [adding, setAdding] = useState(false);
  const [find, setFind] = useState("");
  if (q.isLoading) return <PageLoader />;
  if (q.error) return <FormAlert>{errorMessage(q.error)}</FormAlert>;
  const t = find.trim().toLowerCase();
  const rows = q.data!.filter((s) => !t || s.name.toLowerCase().includes(t) || s.code.includes(t) || (s.city ?? "").toLowerCase().includes(t));
  const total = (k: "students" | "staff" | "aiThisMonth") => q.data!.reduce((a, s) => a + s[k], 0);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold">Schools</h1>
          <p className="text-sm text-on-surface-variant">
            {q.data!.length} schools · {total("students")} students · {total("staff")} staff · {total("aiThisMonth")} AI requests this month
          </p>
        </div>
        <div className="flex gap-2">
          <Input placeholder="Find a school" icon="search" value={find} onChange={(e) => setFind(e.target.value)} />
          {user.role === "owner" && <Button onClick={() => setAdding(true)}>Add a school</Button>}
        </div>
      </div>
      <Card padding="none" className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-sm">
          <thead>
            <tr className="text-left text-[10px] uppercase tracking-widest text-on-surface-variant/70">
              <th className="px-5 py-2">School</th>
              <th className="px-2 py-2">Plan</th>
              <th className="px-2 py-2 text-right">Students</th>
              <th className="px-2 py-2 text-right">Staff</th>
              <th className="px-2 py-2 text-right">Logins</th>
              <th className="px-2 py-2 text-right">Files</th>
              <th className="px-2 py-2 text-right">AI (month)</th>
              <th className="px-5 py-2">Last sign-in</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((s) => (
              <tr key={s.id} className="border-t border-outline-variant/15 hover:bg-surface-container-low">
                <td className="px-5 py-2">
                  <Link href={`/platform/schools/${s.id}`} className="font-bold text-primary hover:underline">
                    {s.name}
                  </Link>
                  <p className="text-xs text-on-surface-variant">
                    {s.code}
                    {s.city ? ` · ${s.city}` : ""}
                    {s.address ? ` · ${s.address.replace(/^https:\/\//, "")}` : ""}
                  </p>
                  {s.status === "suspended" && <Pill tone="danger">{s.deleteAfter ? `Deleting ${new Date(s.deleteAfter).toLocaleDateString("en-IN")}` : "Suspended"}</Pill>}
                </td>
                <td className="px-2 py-2">{s.plan ?? (s.modulesAll ? "All modules" : `${s.modules.length} modules`)}</td>
                <td className="px-2 py-2 text-right">
                  {s.students}
                  {s.limits.maxStudents ? <span className="text-on-surface-variant"> / {s.limits.maxStudents}</span> : null}
                </td>
                <td className="px-2 py-2 text-right">{s.staff}</td>
                <td className="px-2 py-2 text-right">{s.users}</td>
                <td className="px-2 py-2 text-right">{s.storageMb} MB</td>
                <td className="px-2 py-2 text-right">{s.aiThisMonth}</td>
                <td className="px-5 py-2 text-xs text-on-surface-variant">{when(s.lastSignIn)}</td>
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td colSpan={8} className="px-5 py-8 text-center text-on-surface-variant">
                  No schools.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
      {adding && <AddSchool onClose={() => setAdding(false)} onDone={() => (setAdding(false), qc.invalidateQueries({ queryKey: ["platform"] }))} />}
    </div>
  );
}
