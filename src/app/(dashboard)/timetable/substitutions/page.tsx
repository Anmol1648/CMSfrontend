"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Tabs } from "@/components/ui/Tabs";
import { FormAlert, Pill, Select } from "@/components/forms";
import { PageHeader } from "@/components/layout/AppShell";
import { useToast } from "@/components/ui/ToastProvider";
import { RequirePermission } from "@/lib/auth/RequirePermission";
import { staffApi } from "@/lib/api/staff";
import { SubstitutionPeriod, timetableApi } from "@/lib/api/timetable";
import { errorMessage } from "@/lib/api/client";

const today = () => new Date().toISOString().slice(0, 10);

function PeriodRow({ p, date, onChange }: { p: SubstitutionPeriod; date: string; onChange: () => void }) {
  const { showToast } = useToast();
  const [busy, setBusy] = useState(false);
  const assign = async (id: string | null) => {
    setBusy(true);
    try {
      await timetableApi.assign(p.id, id);
      onChange();
    } catch (err) {
      showToast(errorMessage(err), "error");
    } finally {
      setBusy(false);
    }
  };
  void date;
  return (
    <tr className="border-t border-outline-variant/10 align-top">
      <td className="py-2.5 pr-3 font-bold">
        P{p.periodNo}
        {p.time && <p className="text-[10px] font-normal text-on-surface-variant/60">{p.time}</p>}
      </td>
      <td className="py-2.5 pr-3">
        <p className="font-semibold">{p.section.label}</p>
        <p className="text-xs text-on-surface-variant">{p.subject?.name}</p>
      </td>
      <td className="py-2.5">
        {p.substitute ? (
          <div className="flex items-center gap-3">
            <Pill tone="success">{p.substitute.name}</Pill>
            <button type="button" disabled={busy} onClick={() => assign(null)} className="text-xs font-bold uppercase tracking-widest text-error/70 hover:text-error">
              Change
            </button>
          </div>
        ) : p.suggestions.length ? (
          <div className="flex flex-wrap gap-2">
            {p.suggestions.map((s) => (
              <button
                key={s.id}
                type="button"
                disabled={busy}
                onClick={() => assign(s.id)}
                title={`${s.periodsThatDay} own periods, ${s.substitutionsThatDay} substitutions that day`}
                className={`rounded-full border px-3 py-1 text-xs font-semibold transition-all hover:bg-primary hover:text-white ${s.overLimit ? "border-error/40 text-error/80" : s.knowsClass ? "border-primary text-primary" : "border-outline-variant/40 text-on-surface"}`}
              >
                {s.name}
                <span className="opacity-60 ml-1">
                  {s.periodsThatDay + s.substitutionsThatDay}
                  {s.knowsClass ? " · teaches this class" : ""}
                  {s.overLimit ? " · at limit" : ""}
                </span>
              </button>
            ))}
          </div>
        ) : (
          <span className="text-xs text-error">Nobody is free in this period</span>
        )}
      </td>
    </tr>
  );
}

function Day() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [date, setDate] = useState(today());
  const [staffId, setStaffId] = useState("");
  const staff = useQuery({ queryKey: ["staff-options-teaching"], queryFn: () => staffApi.options(true) });
  const day = useQuery({ queryKey: ["tt-subs", date], queryFn: () => timetableApi.substitutions(date), enabled: !!date, retry: false });
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["tt-subs", date] });
  const d = day.data;
  return (
    <div className="space-y-6">
      <Card>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <Input label="Date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          <div className="md:col-span-2">
            <Select label="Teacher absent" value={staffId} onChange={setStaffId} options={[{ value: "", label: "Choose…" }, ...(staff.data ?? []).map((s) => ({ value: s.id, label: `${s.name} (${s.code})` }))]} />
          </div>
          <Button
            disabled={!staffId}
            onClick={async () => {
              try {
                queryClient.setQueryData(["tt-subs", date], await timetableApi.markAbsent(date, staffId));
                setStaffId("");
              } catch (err) {
                showToast(errorMessage(err), "error");
              }
            }}
          >
            Mark absent
          </Button>
        </div>
      </Card>
      {day.isError && <FormAlert tone="warning">{errorMessage(day.error)}</FormAlert>}
      {d && !d.schoolDay && <FormAlert tone="info">Not a school day.</FormAlert>}
      {d && d.schoolDay && !d.absent.length && <FormAlert tone="success">No teacher is marked absent on this day.</FormAlert>}
      {d && d.open > 0 && <FormAlert tone="warning">{d.open} period(s) still need a substitute. Suggestions: teachers of the class first, then whoever has the fewest periods that day (limit {d.limitPerDay} substitutions a day).</FormAlert>}
      {d?.absent.map((a) => (
        <Card key={a.teacher.id}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-black text-primary">
              {a.teacher.name} <span className="text-xs font-normal text-on-surface-variant">· absent · {a.periods.length} periods</span>
            </h3>
            <button
              type="button"
              onClick={async () => {
                if (!window.confirm(`${a.teacher.name} is not absent after all? Their arrangement periods of this day are removed.`)) return;
                queryClient.setQueryData(["tt-subs", date], await timetableApi.clearAbsent(date, a.teacher.id));
              }}
              className="text-xs font-bold uppercase tracking-widest text-error/70 hover:text-error"
            >
              Not absent
            </button>
          </div>
          <table className="w-full text-sm">
            <tbody>
              {a.periods.map((p) => (
                <PeriodRow key={p.id} p={p} date={date} onChange={refresh} />
              ))}
            </tbody>
          </table>
        </Card>
      ))}
    </div>
  );
}

function Report() {
  const [month, setMonth] = useState(today().slice(0, 7));
  const r = useQuery({ queryKey: ["tt-sub-report", month], queryFn: () => timetableApi.subReport(month) });
  return (
    <Card>
      <div className="max-w-xs mb-4">
        <Input label="Month" type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
      </div>
      {r.data && (
        <>
          <p className="text-sm mb-3">
            {r.data.total} periods needed a substitute; {r.data.arranged} were arranged.
          </p>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[10px] uppercase tracking-widest text-on-surface-variant/60">
                <th className="py-2">Teacher</th>
                <th className="py-2 text-right">Substitutions taken</th>
                <th className="py-2 text-right">Own periods missed (absent)</th>
              </tr>
            </thead>
            <tbody>
              {r.data.teachers.map((t) => (
                <tr key={t.id} className="border-t border-outline-variant/10">
                  <td className="py-2 font-semibold">{t.name}</td>
                  <td className="py-2 text-right">{t.taken}</td>
                  <td className="py-2 text-right">{t.missed}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </Card>
  );
}

function Substitutions() {
  const [tab, setTab] = useState("day");
  return (
    <>
      <PageHeader title="Substitutions" description="When a teacher is absent, their periods of that day (from the published timetable) need someone else. Pick from the free teachers suggested." />
      <Tabs tabs={[{ id: "day", label: "Day" }, { id: "report", label: "Monthly report" }]} activeTab={tab} onChange={setTab} />
      <div className="mt-6">{tab === "day" ? <Day /> : <Report />}</div>
    </>
  );
}

export default function SubstitutionsPage() {
  return (
    <RequirePermission permission="timetable.substitute">
      <Substitutions />
    </RequirePermission>
  );
}
