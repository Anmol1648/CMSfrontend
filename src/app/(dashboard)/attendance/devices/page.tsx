"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Checkbox, FormAlert, Pill, Select } from "@/components/forms";
import { PageHeader } from "@/components/layout/AppShell";
import { PageLoader } from "@/components/ui/PageLoader";
import { useToast } from "@/components/ui/ToastProvider";
import { useConfirm } from "@/components/ui/ConfirmProvider";
import { RequirePermission } from "@/lib/auth/RequirePermission";
import { AttendanceDevice, DEVICE_KINDS, DeviceKind, devicesApi } from "@/lib/api/attendance";
import { API_BASE_URL, errorMessage } from "@/lib/api/client";

const apiOrigin = () => new URL(API_BASE_URL, typeof window === "undefined" ? "http://localhost" : window.location.href).origin;
const when = (iso: string | null) => (iso ? new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }) : "never");

function Instructions({ d }: { d: AttendanceDevice }) {
  const { showToast } = useToast();
  const origin = apiOrigin();
  const copy = (text: string) => navigator.clipboard?.writeText(text).then(() => showToast("Copied", "success"));
  if (d.kind === "essl_adms") {
    const host = new URL(origin);
    return (
      <div className="text-xs text-on-surface-variant space-y-1.5">
        <p className="font-bold text-primary">On the machine: Menu → COMM. (Communication) → Cloud Server Setting / ADMS</p>
        <p>
          Server address: <b className="font-mono text-primary">{host.hostname}</b> · Port: <b className="font-mono text-primary">{host.port || (host.protocol === "https:" ? "443" : "80")}</b> · HTTPS: {host.protocol === "https:" ? "on" : "off"}
        </p>
        <p>
          Serial number on the machine must be <b className="font-mono">{d.serialNo}</b> (Menu → System info → Device info).
        </p>
        <p>The machine sends every punch by itself. “Last heard” changes within a few minutes once it is connected.</p>
      </div>
    );
  }
  if (d.kind === "webhook") {
    const url = `${origin}/api/public/attendance-devices/${d.token}/punches`;
    return (
      <div className="text-xs text-on-surface-variant space-y-1.5">
        <p className="font-bold text-primary">The other system sends punches to this address (POST, JSON). Keep it secret.</p>
        <p className="flex flex-wrap items-center gap-2">
          <code className="font-mono text-primary break-all">{url}</code>
          <button type="button" className="font-bold uppercase tracking-widest text-primary" onClick={() => copy(url)}>
            Copy
          </button>
        </p>
        <pre className="rounded-lg bg-surface-container-low p-3 font-mono text-[11px] text-on-surface overflow-x-auto">{`{ "punches": [ { "userId": "105", "time": "2026-10-22 08:05:30" } ] }`}</pre>
        <p>“userId” is the person’s number on the machine; “time” in India time (or ISO with a zone).</p>
      </div>
    );
  }
  return <p className="text-xs text-on-surface-variant">Use “Import a file” below with the machine’s export (each line: number, date and time).</p>;
}

function Devices() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const confirm = useConfirm();
  const list = useQuery({ queryKey: ["attendance-devices"], queryFn: devicesApi.list });
  const numbers = useQuery({ queryKey: ["device-numbers"], queryFn: devicesApi.numbers });
  const punches = useQuery({ queryKey: ["device-punches"], queryFn: devicesApi.punches });
  const [form, setForm] = useState<{ name: string; kind: DeviceKind; serialNo: string; isActive: boolean }>({ name: "", kind: "essl_adms", serialNo: "", isActive: true });
  const [editing, setEditing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [importDevice, setImportDevice] = useState("");
  const [search, setSearch] = useState("");

  const setDevices = (rows: AttendanceDevice[]) => queryClient.setQueryData(["attendance-devices"], rows);
  const save = async () => {
    setError(null);
    const input = { name: form.name.trim(), kind: form.kind, ...(form.kind === "essl_adms" ? { serialNo: form.serialNo.trim() } : {}), isActive: form.isActive };
    try {
      setDevices(editing ? await devicesApi.save(editing, input) : await devicesApi.add(input));
      showToast("Saved", "success");
      setEditing(null);
      setForm({ name: "", kind: "essl_adms", serialNo: "", isActive: true });
    } catch (err) {
      setError(errorMessage(err));
    }
  };
  const saveNumber = async (staffId: string, value: string) => {
    try {
      queryClient.setQueryData(["device-numbers"], await devicesApi.setNumber(staffId, value.trim() || null));
      queryClient.invalidateQueries({ queryKey: ["device-punches"] });
      setDrafts((d) => {
        const n = { ...d };
        delete n[staffId];
        return n;
      });
      showToast("Saved", "success");
    } catch (err) {
      showToast(errorMessage(err), "error");
    }
  };
  const importFile = async (file: File) => {
    try {
      const r = await devicesApi.importText(await file.text(), importDevice || undefined);
      showToast(`${r.added} new punches from ${r.lines} lines${r.unmatched ? ` · ${r.unmatched} for numbers not given to anyone` : ""}${r.unreadable ? ` · ${r.unreadable} lines not read` : ""}`, "success");
      queryClient.invalidateQueries({ queryKey: ["device-punches"] });
      queryClient.invalidateQueries({ queryKey: ["device-numbers"] });
    } catch (err) {
      showToast(errorMessage(err), "error");
    }
  };

  if (list.isError) return <FormAlert>{errorMessage(list.error)}</FormAlert>;
  if (!list.data) return <PageLoader />;
  const q = search.trim().toLowerCase();
  const staff = (numbers.data?.staff ?? []).filter((s) => !q || `${s.name} ${s.employeeCode} ${s.deviceUserId ?? ""}`.toLowerCase().includes(q));

  return (
    <>
      <PageHeader
        title="Attendance devices"
        description="Connect the school’s own attendance machines or systems: a biometric machine (eSSL / ZKTeco) sends punches by itself, another system can send them to a web address, or upload a machine’s export. The first punch of a day is the check-in, the last the check-out."
      />

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)] gap-6 items-start mb-6">
        <Card>
          <h3 className="font-black text-primary mb-4">{editing ? "Change the device" : "Add a device"}</h3>
          <div className="space-y-4">
            <Input label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Main gate machine" />
            <Select label="Kind" value={form.kind} onChange={(v) => setForm({ ...form, kind: v as DeviceKind })} options={(Object.keys(DEVICE_KINDS) as DeviceKind[]).map((k) => ({ value: k, label: DEVICE_KINDS[k] }))} />
            {form.kind === "essl_adms" && <Input label="Serial number of the machine" value={form.serialNo} onChange={(e) => setForm({ ...form, serialNo: e.target.value })} placeholder="e.g. CQUJ234560012" />}
            <Checkbox label="In use" checked={form.isActive} onChange={(v) => setForm({ ...form, isActive: v })} />
            {error && <FormAlert>{error}</FormAlert>}
            <div className="flex gap-3">
              <Button onClick={save} disabled={form.name.trim().length < 2 || (form.kind === "essl_adms" && form.serialNo.trim().length < 3)}>
                {editing ? "Save" : "Add"}
              </Button>
              {editing && (
                <Button
                  variant="secondary"
                  onClick={() => {
                    setEditing(null);
                    setForm({ name: "", kind: "essl_adms", serialNo: "", isActive: true });
                  }}
                >
                  Cancel
                </Button>
              )}
            </div>
          </div>
        </Card>

        <div className="space-y-4">
          {list.data.map((d) => (
            <Card key={d.id}>
              <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                <div>
                  <h3 className="font-black text-primary">
                    {d.name} {!d.isActive && <Pill>Off</Pill>}
                  </h3>
                  <p className="text-xs text-on-surface-variant">
                    {DEVICE_KINDS[d.kind]} · {d.punches} punches · last heard {when(d.lastSeenAt)} · last punch {when(d.lastPunchAt)}
                  </p>
                </div>
                <div className="flex gap-4 text-xs font-bold uppercase tracking-widest">
                  <button
                    type="button"
                    className="text-primary hover:opacity-70"
                    onClick={() => {
                      setEditing(d.id);
                      setForm({ name: d.name, kind: d.kind, serialNo: d.serialNo ?? "", isActive: d.isActive });
                    }}
                  >
                    Change
                  </button>
                  {d.kind === "webhook" && (
                    <button
                      type="button"
                      className="text-primary hover:opacity-70"
                      onClick={async () => {
                        if (!(await confirm({ title: "Make a new address?", message: "The old address stops working: update it in the other system.", confirmLabel: "New address" }))) return;
                        setDevices(await devicesApi.newToken(d.id));
                      }}
                    >
                      New address
                    </button>
                  )}
                  <button
                    type="button"
                    className="text-error hover:opacity-70"
                    onClick={async () => {
                      if (!(await confirm({ title: `Remove ${d.name}?`, message: "Its punches stay; it can no longer send new ones.", confirmLabel: "Remove", danger: true }))) return;
                      setDevices(await devicesApi.remove(d.id));
                    }}
                  >
                    Remove
                  </button>
                </div>
              </div>
              <Instructions d={d} />
            </Card>
          ))}
          {!list.data.length && <Card>No devices yet. Staff check in with the Check In button (and its photo / location checks) until a machine is added.</Card>}
        </div>
      </div>

      <Card className="mb-6">
        <h3 className="font-black text-primary mb-1">Import a file</h3>
        <p className="text-xs text-on-surface-variant mb-4">A CSV / text export from a machine: each line the person’s number, then the date and time (e.g. “105, 22-10-2026 08:05”). Punches already received are skipped.</p>
        <div className="flex flex-wrap items-end gap-4">
          <div className="w-full sm:w-72">
            <Select label="From device (optional)" value={importDevice} onChange={setImportDevice} options={[{ value: "", label: "Not a listed device" }, ...list.data.map((d) => ({ value: d.id, label: d.name }))]} />
          </div>
          <input
            type="file"
            accept=".csv,.txt,.dat"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void importFile(f);
              e.target.value = "";
            }}
            className="text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-primary/10 file:px-3 file:py-2 file:text-xs file:font-bold file:text-primary"
          />
        </div>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
        <Card padding="none" className="overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-outline-variant/20">
            <div>
              <h3 className="font-black text-primary">Machine numbers</h3>
              <p className="text-xs text-on-surface-variant mt-0.5">Each person’s number on the machine (what it calls “user ID” / “enrol no.”).</p>
            </div>
            <div className="w-56">
              <Input placeholder="Find a person" value={search} onChange={(e) => setSearch(e.target.value)} icon="search" />
            </div>
          </div>
          {numbers.data && numbers.data.unmatched.length > 0 && (
            <div className="px-5 py-3 border-b border-outline-variant/20 bg-amber-50 text-xs text-amber-900">
              Punches from numbers not given to anyone: {numbers.data.unmatched.map((u) => `${u.deviceUserId} (${u.punches})`).join(", ")}. Give each number to its person below; their punches are then counted.
            </div>
          )}
          <div className="max-h-[520px] overflow-y-auto">
            <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <tbody>
                {staff.map((s) => {
                  const draft = drafts[s.id] ?? s.deviceUserId ?? "";
                  const changed = draft !== (s.deviceUserId ?? "");
                  return (
                    <tr key={s.id} className="border-t border-outline-variant/10 first:border-t-0">
                      <td className="px-5 py-2">
                        <p className="font-semibold">{s.name}</p>
                        <p className="text-[11px] font-mono text-on-surface-variant/70">{s.employeeCode}</p>
                      </td>
                      <td className="px-5 py-2 w-48">
                        <input
                          value={draft}
                          onChange={(e) => setDrafts((d) => ({ ...d, [s.id]: e.target.value }))}
                          onKeyDown={(e) => e.key === "Enter" && changed && saveNumber(s.id, draft)}
                          placeholder="—"
                          aria-label={`Machine number of ${s.name}`}
                          className="w-full rounded-lg bg-surface-container-low px-3 py-1.5 font-mono text-sm outline-none focus:ring-2 focus:ring-primary/20"
                        />
                      </td>
                      <td className="px-5 py-2 w-20 text-right">
                        {changed && (
                          <button type="button" className="text-xs font-bold uppercase tracking-widest text-primary hover:opacity-70" onClick={() => saveNumber(s.id, draft)}>
                            Save
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            </div>
          </div>
        </Card>

        <Card padding="none" className="overflow-hidden">
          <div className="px-5 py-4 border-b border-outline-variant/20">
            <h3 className="font-black text-primary">Latest punches</h3>
          </div>
          <div className="max-h-[560px] overflow-y-auto">
            <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <tbody>
                {(punches.data ?? []).map((p) => (
                  <tr key={p.id} className="border-t border-outline-variant/10 first:border-t-0">
                    <td className="px-5 py-2 whitespace-nowrap tabular-nums">{new Date(p.at).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" })}</td>
                    <td className="px-5 py-2 font-mono text-xs">{p.deviceUserId}</td>
                    <td className="px-5 py-2">{p.staff ?? <span className="text-xs font-bold text-amber-700">not matched</span>}</td>
                    <td className="px-5 py-2 text-xs text-on-surface-variant">{p.device}</td>
                  </tr>
                ))}
                {punches.data && !punches.data.length && (
                  <tr>
                    <td className="px-5 py-10 text-center text-on-surface-variant/70">No punches yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
            </div>
          </div>
        </Card>
      </div>
    </>
  );
}

export default function AttendanceDevicesPage() {
  return (
    <RequirePermission permission="attendance.staff">
      <Devices />
    </RequirePermission>
  );
}
