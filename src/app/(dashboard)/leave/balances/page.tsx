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
import { useAuth } from "@/lib/auth/AuthProvider";
import { errorMessage } from "@/lib/api/client";
import { showDay, todayIST } from "@/lib/api/attendance";
import { staffApi } from "@/lib/api/staff";
import { leaveApi } from "@/lib/api/leave";

const KIND: Record<string, string> = { carry: "Carried forward", adjust: "Adjusted", compoff: "Comp-off earned" };
const fmt = (iso: string) => showDay(iso, { day: "numeric", month: "short", year: "numeric" });

/** One person's balances and the changes behind them; HR adjusts here. */
function StaffDetail({ staffId, year, onClose, onChanged }: { staffId: string; year: string; onClose: () => void; onChanged: () => void }) {
  const queryClient = useQueryClient();
  const { can } = useAuth();
  const { showToast } = useToast();
  const confirm = useConfirm();
  const data = useQuery({ queryKey: ["leave-staff-balance", staffId, year], queryFn: () => leaveApi.staffBalance(staffId, year) });
  const [typeId, setTypeId] = useState("");
  const [days, setDays] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const d = data.data;
  const limited = (d?.balances ?? []).filter((b) => !b.unlimited);
  const done = () => {
    queryClient.invalidateQueries({ queryKey: ["leave-staff-balance", staffId] });
    onChanged();
  };
  const adjust = async () => {
    setBusy(true);
    try {
      await leaveApi.adjust({ staffId, typeId: typeId || limited[0]?.typeId, year, days: Number(days), note: note.trim() });
      showToast("Balance adjusted", "success");
      setDays("");
      setNote("");
      done();
    } catch (err) {
      showToast(errorMessage(err), "error");
    } finally {
      setBusy(false);
    }
  };
  const remove = async (id: string, label: string) => {
    if (!(await confirm({ title: `Remove “${label}”?`, message: "The balance goes back to what it was without it.", confirmLabel: "Remove", danger: true }))) return;
    try {
      await leaveApi.removeEntry(id);
      showToast("Removed", "success");
      done();
    } catch (err) {
      showToast(errorMessage(err), "error");
    }
  };
  return (
    <Modal isOpen onClose={onClose} title={d ? `${d.staff.name}: leave ${d.year.name}` : "Leave balance"} width="max-w-3xl">
      {!d ? (
        <PageLoader />
      ) : (
        <div className="space-y-6">
          <p className="text-xs text-on-surface-variant/70">
            {d.staff.employeeCode ? `${d.staff.employeeCode} · ` : ""}joined {fmt(d.staff.joiningDate)}
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-widest text-on-surface-variant/60 border-b border-outline-variant/20">
                  {["Leave", "Given", "Carried", "Adjusted", "Comp-off", "Taken", "Waiting", "Left"].map((h) => (
                    <th key={h} className="px-3 py-2 font-bold">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {d.balances.map((b) => (
                  <tr key={b.typeId} className="border-t border-outline-variant/10">
                    <td className="px-3 py-2 font-semibold">{b.name}</td>
                    <td className="px-3 py-2">{b.unlimited ? "—" : b.credited}</td>
                    <td className="px-3 py-2">{b.carried || ""}</td>
                    <td className="px-3 py-2">{b.adjusted || ""}</td>
                    <td className="px-3 py-2">{b.isCompOff ? b.earned : ""}</td>
                    <td className="px-3 py-2">{b.taken}</td>
                    <td className="px-3 py-2">{b.pending || ""}</td>
                    <td className="px-3 py-2 font-bold">{b.unlimited ? "—" : b.balance}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div>
            <h4 className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/60 mb-2">Changes this year</h4>
            {!d.entries.length && <p className="text-sm text-on-surface-variant/70">None: only what the leave rules give.</p>}
            {d.entries.map((e) => (
              <div key={e.id} className="flex items-start justify-between gap-3 border-t border-outline-variant/10 py-2 text-sm">
                <div>
                  <b>{e.days > 0 ? `+${e.days}` : e.days}</b> {e.type} · {KIND[e.kind]}
                  {e.workedOn && ` (worked ${fmt(e.workedOn)}${e.expiresOn ? `, lapses ${fmt(e.expiresOn)}` : ""})`}
                  <p className="text-[11px] text-on-surface-variant/70">
                    {e.note} · {e.by ?? "system"}, {new Date(e.at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                  </p>
                </div>
                {can("leave.manage") && e.kind !== "carry" && (
                  <button type="button" className="text-xs font-bold uppercase tracking-widest text-error hover:opacity-70" onClick={() => remove(e.id, `${e.days} ${e.type}`)}>
                    Remove
                  </button>
                )}
              </div>
            ))}
          </div>
          {can("leave.manage") && !!limited.length && (
            <div className="rounded-xl bg-surface-container-low p-4 space-y-3">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/60">Adjust (opening balance, a correction)</h4>
              <div className="grid grid-cols-1 md:grid-cols-[1fr_8rem_2fr_auto] gap-3 items-end">
                <Select label="Leave" value={typeId || limited[0].typeId} onChange={setTypeId} options={limited.map((b) => ({ value: b.typeId, label: b.name }))} />
                <Input label="Days (− to take away)" type="number" step="0.5" value={days} onChange={(e) => setDays(e.target.value)} />
                <Input label="Why" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Opening balance from the old register" />
                <Button onClick={adjust} loading={busy} disabled={!days || Number(days) === 0 || note.trim().length < 3}>
                  Adjust
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}

function BalanceList({ year }: { year: string }) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const data = useQuery({ queryKey: ["leave-balances", year, search], queryFn: () => leaveApi.balances({ year, search }) });
  const d = data.data;
  return (
    <>
      <div className="mb-4 max-w-sm">
        <Input placeholder="Search staff by name or code" value={search} onChange={(e) => setSearch(e.target.value)} icon="search" />
      </div>
      {data.isError && <FormAlert>{errorMessage(data.error)}</FormAlert>}
      {!d && !data.isError && <PageLoader />}
      {d && (
        <Card padding="none" className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-widest text-on-surface-variant/60 border-b border-outline-variant/20">
                  <th className="px-5 py-3 font-bold">Staff member</th>
                  {d.types.map((t) => (
                    <th key={t.id} className="px-3 py-3 font-bold text-center" title={t.name}>
                      {t.code}
                      <span className="block normal-case tracking-normal font-medium">{t.unlimited ? "taken" : "left / taken"}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {d.staff.map((s) => (
                  <tr key={s.id} className="border-t border-outline-variant/10 hover:bg-surface-container-low cursor-pointer" onClick={() => setOpen(s.id)}>
                    <td className="px-5 py-3">
                      <p className="font-semibold">{s.name}</p>
                      <p className="text-[11px] text-on-surface-variant/70">{[s.employeeCode, s.designation].filter(Boolean).join(" · ") || "—"}</p>
                    </td>
                    {d.types.map((t) => {
                      const b = s.balances.find((x) => x.typeId === t.id);
                      return (
                        <td key={t.id} className="px-3 py-3 text-center whitespace-nowrap">
                          {!b ? (
                            <span className="text-on-surface-variant/30">—</span>
                          ) : b.unlimited ? (
                            b.taken || ""
                          ) : (
                            <>
                              <b className={b.available < 0 ? "text-error" : undefined}>{b.balance}</b>
                              <span className="text-on-surface-variant/50"> / {b.taken}</span>
                              {b.pending > 0 && <span className="block text-[10px] text-amber-700">{b.pending} waiting</span>}
                            </>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
                {!d.staff.length && (
                  <tr>
                    <td colSpan={d.types.length + 1} className="px-5 py-12 text-center text-on-surface-variant/70">
                      No staff found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}
      {open && <StaffDetail staffId={open} year={year} onClose={() => setOpen(null)} onChanged={() => queryClient.invalidateQueries({ queryKey: ["leave-balances"] })} />}
    </>
  );
}

/** Comp-offs: give one for working on a day off (with the check-ins on days off as hints). */
function CompOffs() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const staff = useQuery({ queryKey: ["staff-options"], queryFn: () => staffApi.options() });
  const hints = useQuery({ queryKey: ["comp-off-hints"], queryFn: leaveApi.compOffSuggestions });
  const [staffId, setStaffId] = useState("");
  const [workedOn, setWorkedOn] = useState(todayIST());
  const [days, setDays] = useState("1");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const give = async (input: { staffId: string; workedOn: string; days: 1 | 0.5; note?: string }) => {
    setBusy(true);
    try {
      await leaveApi.compOff(input);
      showToast("Comp-off given", "success");
      setNote("");
      queryClient.invalidateQueries({ queryKey: ["comp-off-hints"] });
      queryClient.invalidateQueries({ queryKey: ["leave-balances"] });
    } catch (err) {
      showToast(errorMessage(err), "error");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="space-y-6">
      <Card className="space-y-4">
        <h3 className="text-sm font-black uppercase tracking-widest text-primary">Give a comp-off</h3>
        <p className="text-sm text-on-surface-variant/70">For working on a holiday or weekly off. It lapses after the days set on the comp-off leave type (Leave Setup).</p>
        <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr_2fr_auto] gap-3 items-end">
          <Select label="Staff member" value={staffId} onChange={setStaffId} options={[{ value: "", label: "Choose…" }, ...(staff.data ?? []).map((s) => ({ value: s.id, label: `${s.name}${s.code ? ` (${s.code})` : ""}` }))]} />
          <Input label="Day worked" type="date" max={todayIST()} value={workedOn} onChange={(e) => setWorkedOn(e.target.value)} />
          <Select label="Days" value={days} onChange={setDays} options={[{ value: "1", label: "1 day" }, { value: "0.5", label: "Half day" }]} />
          <Input label="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Annual day preparation" />
          <Button onClick={() => give({ staffId, workedOn, days: days === "0.5" ? 0.5 : 1, note: note.trim() || undefined })} loading={busy} disabled={!staffId}>
            Give
          </Button>
        </div>
      </Card>
      <Card padding="none" className="overflow-hidden">
        <h3 className="px-5 pt-5 text-sm font-black uppercase tracking-widest text-primary">Checked in on a day off (last 60 days)</h3>
        <p className="px-5 pt-1 text-xs text-on-surface-variant/70">People who came on a holiday or weekly off and have no comp-off for it yet.</p>
        <table className="w-full text-sm mt-3">
          <tbody>
            {(hints.data ?? []).map((h) => (
              <tr key={h.staffId + h.date} className="border-t border-outline-variant/10">
                <td className="px-5 py-3 font-semibold">
                  {h.name}
                  {h.employeeCode && <span className="text-[11px] font-normal text-on-surface-variant/70"> · {h.employeeCode}</span>}
                </td>
                <td className="px-5 py-3">
                  {fmt(h.date)} <span className="text-[11px] text-on-surface-variant/70">· {h.dayOff}</span>
                </td>
                <td className="px-5 py-3 text-right">
                  <button type="button" disabled={busy} className="text-xs font-bold uppercase tracking-widest text-primary hover:opacity-70" onClick={() => give({ staffId: h.staffId, workedOn: h.date, days: 1 })}>
                    Give 1 day
                  </button>
                </td>
              </tr>
            ))}
            {hints.data && !hints.data.length && (
              <tr>
                <td className="px-5 py-10 text-center text-on-surface-variant/70">Nobody.</td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

/** Closing a leave year: what is carried into the next and what lapses, then do it (or undo it). */
function YearEnd({ year }: { year: string }) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const confirm = useConfirm();
  const data = useQuery({ queryKey: ["leave-year-end", year], queryFn: () => leaveApi.yearEnd(year), retry: false });
  const [busy, setBusy] = useState(false);
  const d = data.data;
  const run = async (undo: boolean) => {
    if (!d) return;
    const ok = await confirm(
      undo
        ? { title: `Undo closing ${d.year.name}?`, message: `The days carried into ${d.next.name} are taken back. You can close the year again afterwards.`, confirmLabel: "Undo", danger: true }
        : { title: `Close leave year ${d.year.name}?`, message: `${d.totals.carry} days are carried into ${d.next.name} and ${d.totals.lapse} lapse, by the rules of each leave type. It can be undone.`, confirmLabel: "Close the year" }
    );
    if (!ok) return;
    setBusy(true);
    try {
      await (undo ? leaveApi.undoYear(year) : leaveApi.closeYear(year));
      showToast(undo ? "Undone" : `Leave year ${d.year.name} closed`, "success");
      queryClient.invalidateQueries({ queryKey: ["leave-year-end"] });
      queryClient.invalidateQueries({ queryKey: ["leave-balances"] });
    } catch (err) {
      showToast(errorMessage(err), "error");
    } finally {
      setBusy(false);
    }
  };
  if (data.isError) return <FormAlert>{errorMessage(data.error)}</FormAlert>;
  if (!d) return <PageLoader />;
  return (
    <div className="space-y-4">
      <Card className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-black uppercase tracking-widest text-primary">
              {d.year.name} → {d.next.name}
            </h3>
            <p className="text-sm text-on-surface-variant/70 mt-1">
              Carried as on {fmt(d.year.end)}: {d.types.map((t) => `${t.name} (${t.rule})`).join(", ") || "no leave type carries forward"}. Other leave lapses.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {d.done && <Pill tone="success">Closed</Pill>}
            {d.done ? (
              <Button variant="secondary" onClick={() => run(true)} loading={busy}>
                Undo
              </Button>
            ) : (
              <Button onClick={() => run(false)} loading={busy} disabled={!d.rows.length}>
                Close the year
              </Button>
            )}
          </div>
        </div>
        <p className="text-sm">
          <b>{d.totals.carry}</b> days carried · <b>{d.totals.lapse}</b> days lapse
        </p>
      </Card>
      <Card padding="none" className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[10px] uppercase tracking-widest text-on-surface-variant/60 border-b border-outline-variant/20">
                <th className="px-5 py-3 font-bold">Staff member</th>
                <th className="px-5 py-3 font-bold">Leave</th>
                <th className="px-5 py-3 font-bold text-right">Left at year end</th>
                <th className="px-5 py-3 font-bold text-right">Carried</th>
                <th className="px-5 py-3 font-bold text-right">Lapses</th>
              </tr>
            </thead>
            <tbody>
              {d.rows.map((r) => (
                <tr key={r.staffId + r.typeId} className="border-t border-outline-variant/10">
                  <td className="px-5 py-2 font-semibold">{r.name}</td>
                  <td className="px-5 py-2">{r.type}</td>
                  <td className="px-5 py-2 text-right">{r.balance}</td>
                  <td className="px-5 py-2 text-right font-bold text-emerald-700">{r.carry}</td>
                  <td className="px-5 py-2 text-right text-on-surface-variant/70">{r.lapse || ""}</td>
                </tr>
              ))}
              {!d.rows.length && (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center text-on-surface-variant/70">
                    Nothing to carry forward.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function Balances() {
  const { can } = useAuth();
  const [tab, setTab] = useState("balances");
  const [year, setYear] = useState("");
  const years = useQuery({ queryKey: ["leave-years"], queryFn: leaveApi.years });
  const y = year || years.data?.current.start || "";
  return (
    <>
      <PageHeader
        title="Leave Balances"
        description="What each person has of every leave this year. Click a person to see how it is made up, or to adjust it."
        actions={years.data && <Select value={y} onChange={setYear} options={years.data.years.map((x) => ({ value: x.start, label: `Leave year ${x.name}` }))} className="w-56" />}
      />
      <div className="mb-4">
        <Tabs
          tabs={[{ id: "balances", label: "Balances" }, ...(can("leave.manage") ? [{ id: "compoff", label: "Comp-offs" }, { id: "yearend", label: "Year end" }] : [])]}
          activeTab={tab}
          onChange={setTab}
        />
      </div>
      {!y && <PageLoader />}
      {y && tab === "balances" && <BalanceList year={y} />}
      {tab === "compoff" && <CompOffs />}
      {y && tab === "yearend" && <YearEnd year={y} />}
    </>
  );
}

export default function LeaveBalancesPage() {
  return (
    <RequirePermission permission="leave.view">
      <Balances />
    </RequirePermission>
  );
}
