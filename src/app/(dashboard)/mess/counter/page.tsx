"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { FormAlert, Pill, Select } from "@/components/forms";
import { PageHeader } from "@/components/layout/AppShell";
import { PageLoader } from "@/components/ui/PageLoader";
import { useToast } from "@/components/ui/ToastProvider";
import { RequirePermission } from "@/lib/auth/RequirePermission";
import { errorMessage } from "@/lib/api/client";
import { AuthedPhoto } from "@/components/visitors/Photo";
import { CameraScan } from "@/components/library/CameraScan";
import { SearchPick } from "@/components/hostel/SearchPick";
import { todayISO } from "@/lib/api/hostel";
import { messApi, type Meal } from "@/lib/api/mess";

/** The meal on now: the last one that has started (or the first of the day). */
const currentMeal = (meals: Meal[]) => {
  const now = new Date(Date.now() + 5.5 * 3_600_000).toISOString().slice(11, 16);
  return [...meals].reverse().find((m) => m.time <= now) ?? meals[0];
};

function GuestForm({ date, meal, onDone }: { date: string; meal: Meal; onDone: () => void }) {
  const { showToast } = useToast();
  const [f, setF] = useState({ guestName: "", guests: "1", payBy: "cash" });
  const [who, setWho] = useState<{ kind: "student" | "staff"; id: string; name: string } | null>(null);
  return (
    <Card>
      <p className="mb-3 font-bold">Guests at {meal.name} (₹{meal.rate} each)</p>
      <div className="grid gap-3 sm:grid-cols-3">
        <Input label="Guest" value={f.guestName} onChange={(e) => setF({ ...f, guestName: e.target.value })} maxLength={80} />
        <Input label="How many" type="number" min={1} max={100} value={f.guests} onChange={(e) => setF({ ...f, guests: e.target.value })} />
        <Select label="Paid by" value={f.payBy} onChange={(v) => (setF({ ...f, payBy: v }), setWho(null))} options={[{ value: "cash", label: "Cash now" }, { value: "student", label: "A student’s fees" }, { value: "staff", label: "A staff member’s salary" }, { value: "free", label: "Free (school guest)" }]} />
      </div>
      {(f.payBy === "student" || f.payBy === "staff") && (
        <div className="mt-3">
          {who ? (
            <p className="text-sm">
              Charged to <b>{who.name}</b>{" "}
              <button className="text-xs text-primary" onClick={() => setWho(null)}>
                change
              </button>
            </p>
          ) : (
            <SearchPick label={f.payBy === "student" ? "Student" : "Staff member"} placeholder="Type a name or code" search={async (q: string) => (await messApi.people(q)).filter((p) => p.kind === f.payBy)} onPick={setWho} render={(p) => <span><b>{p.name}</b> <span className="text-on-surface-variant">{p.code}</span></span>} />
          )}
        </div>
      )}
      <div className="mt-3 flex items-center justify-end gap-3">
        <span className="text-sm">{f.payBy === "free" ? "Free" : `₹${meal.rate * (Number(f.guests) || 0)}`}</span>
        <Button
          disabled={f.guestName.trim().length < 2 || !(Number(f.guests) > 0) || ((f.payBy === "student" || f.payBy === "staff") && !who)}
          onClick={async () => {
            try {
              const r = await messApi.guest({ date, mealId: meal.id, guestName: f.guestName, guests: Number(f.guests), payBy: f.payBy, studentId: f.payBy === "student" ? who!.id : null, staffId: f.payBy === "staff" ? who!.id : null });
              showToast(f.payBy === "cash" ? `Collect ₹${r.amount}` : "Added", "success");
              setF({ guestName: "", guests: "1", payBy: "cash" });
              setWho(null);
              onDone();
            } catch (e) {
              showToast(errorMessage(e), "error");
            }
          }}
        >
          Add guests
        </Button>
      </div>
    </Card>
  );
}

function Counter() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  const params = useSearchParams();
  const meals = useQuery({ queryKey: ["mess", "meals"], queryFn: messApi.meals });
  const [mealId, setMealId] = useState(params.get("meal") ?? "");
  const [date, setDate] = useState(todayISO());
  const [code, setCode] = useState("");
  const [last, setLast] = useState<{ name: string; code: string; sub: string; photo: string | null; plan: string; warning: string | null } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const box = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!mealId && meals.data?.length) setMealId(currentMeal(meals.data).id);
  }, [mealId, meals.data]);
  const key = ["mess", "counter", date, mealId];
  const list = useQuery({ queryKey: key, queryFn: () => messApi.counter(date, mealId), enabled: !!mealId });
  const refresh = () => qc.invalidateQueries({ queryKey: key });
  const scan = async (c: string) => {
    if (!c.trim()) return;
    setError(null);
    try {
      const r = await messApi.serve({ date, mealId, code: c });
      setLast(r);
      refresh();
    } catch (e) {
      setLast(null);
      setError(errorMessage(e));
    } finally {
      setCode("");
      box.current?.focus();
    }
  };
  if (meals.isLoading) return <PageLoader />;
  const members = list.data?.members ?? [];
  const served = members.filter((m) => m.servedId).length;
  const expected = members.filter((m) => !m.skipped && !m.away).length;
  const t = filter.trim().toLowerCase();
  const shown = members.filter((m) => !t || m.name.toLowerCase().includes(t) || m.code.toLowerCase().includes(t));
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <Select className="max-w-xs" label="Meal" value={mealId} onChange={setMealId} options={(meals.data ?? []).map((m) => ({ value: m.id, label: `${m.name} (${m.time})` }))} />
        <Input label="Date" type="date" value={date} max={todayISO()} onChange={(e) => setDate(e.target.value)} />
        <div className="flex-1" />
        <Pill tone="primary">
          Eaten {served} / {expected}
        </Pill>
        <Pill>Guests {(list.data?.guests ?? []).reduce((a, g) => a + g.guests, 0)}</Pill>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-4">
          <Card>
            <p className="mb-3 font-bold">Scan the ID card</p>
            <form
              className="flex items-end gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                void scan(code);
              }}
            >
              <Input ref={box} autoFocus className="flex-1" placeholder="Card no., admission no. or employee code" value={code} onChange={(e) => setCode(e.target.value)} />
              <Button type="submit" disabled={!code.trim() || !mealId}>
                Serve
              </Button>
            </form>
            <div className="mt-3">
              <CameraScan onScan={(c) => void scan(c)} label="Scan with camera" />
            </div>
          </Card>
          {error && <FormAlert>{error}</FormAlert>}
          {last && (
            <Card className={last.warning ? "border-2 border-amber-500" : "border-2 border-emerald-600"}>
              <div className="flex items-center gap-4">
                <AuthedPhoto path={last.photo} className="h-16 w-16 rounded-2xl" />
                <div>
                  <p className="text-lg font-extrabold">{last.name}</p>
                  <p className="text-sm text-on-surface-variant">
                    {last.code} · {last.sub} · {last.plan}
                  </p>
                  {last.warning && <p className="text-sm font-semibold text-amber-700">{last.warning}</p>}
                </div>
              </div>
            </Card>
          )}
          {list.data && <GuestForm date={date} meal={list.data.meal} onDone={refresh} />}
          {!!list.data?.guests.length && (
            <Card padding="none">
              {list.data.guests.map((g) => (
                <div key={g.id} className="flex items-center justify-between border-b border-outline-variant/10 px-5 py-2 text-sm last:border-0">
                  <span>
                    <b>{g.name}</b> × {g.guests}
                  </span>
                  <span className="text-on-surface-variant">
                    {g.payBy === "free" ? "Free" : `₹${g.amount} · ${g.payBy === "cash" ? "cash" : g.payBy === "student" ? "on fees" : "on salary"}`}
                  </span>
                </div>
              ))}
            </Card>
          )}
        </div>
        <Card padding="none">
          <div className="border-b border-outline-variant/15 px-5 py-3">
            <Input placeholder="Find a member" icon="search" value={filter} onChange={(e) => setFilter(e.target.value)} />
          </div>
          {list.isLoading ? (
            <PageLoader />
          ) : (
            <div className="max-h-[70vh] overflow-y-auto">
              {shown.map((m) => (
                <div key={m.subscriptionId} className={`flex items-center gap-3 border-b border-outline-variant/10 px-5 py-2 ${m.skipped || m.away ? "opacity-60" : ""}`}>
                  <AuthedPhoto path={m.photo} className="h-9 w-9 rounded-full" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{m.name}</p>
                    <p className="text-xs text-on-surface-variant">
                      {m.code} · {m.sub}
                      {m.skipped && " · skipped"}
                      {m.away && " · on leave"}
                    </p>
                  </div>
                  <button
                    onClick={async () => {
                      try {
                        if (m.servedId) await messApi.unserve(m.servedId);
                        else await messApi.serve({ date, mealId, subscriptionId: m.subscriptionId });
                        refresh();
                      } catch (e) {
                        showToast(errorMessage(e), "error");
                      }
                    }}
                    className={`material-symbols-outlined rounded-lg p-1 ${m.servedId ? "bg-emerald-600 text-white" : "bg-surface-container text-on-surface-variant"}`}
                    title={m.servedId ? "Served: click to undo" : "Mark served"}
                  >
                    check
                  </button>
                </div>
              ))}
              {!shown.length && <p className="px-5 py-6 text-center text-sm text-on-surface-variant">No members on this meal.</p>}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

export default function MessCounterPage() {
  return (
    <RequirePermission permission={["mess.counter", "mess.manage"]}>
      <PageHeader title="Mess Counter" description="Scan each member’s ID card (or tick them in the list) as they take the meal. Guests are added below and charged to cash, a student’s fees or a staff salary." />
      <Suspense>
        <Counter />
      </Suspense>
    </RequirePermission>
  );
}
