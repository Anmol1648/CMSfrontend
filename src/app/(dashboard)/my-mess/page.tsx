"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/Card";
import { FormAlert, Pill } from "@/components/forms";
import { PageHeader } from "@/components/layout/AppShell";
import { PageLoader } from "@/components/ui/PageLoader";
import { useToast } from "@/components/ui/ToastProvider";
import { RequirePermission } from "@/lib/auth/RequirePermission";
import { errorMessage } from "@/lib/api/client";
import { dayLabel, messApi, type MyMember } from "@/lib/api/mess";

function Stars({ value, onPick }: { value: number | null; onPick: (n: number) => void }) {
  const [hover, setHover] = useState(0);
  return (
    <span className="flex" onMouseLeave={() => setHover(0)}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} onMouseEnter={() => setHover(n)} onClick={() => onPick(n)} className={`material-symbols-outlined text-xl ${(hover || value || 0) >= n ? "text-amber-500" : "text-on-surface-variant/40"}`} style={{ fontVariationSettings: `'FILL' ${(hover || value || 0) >= n ? 1 : 0}` }}>
          star
        </button>
      ))}
    </span>
  );
}

function Member({ m, cutoff }: { m: MyMember; cutoff: number }) {
  const qc = useQueryClient();
  const { showToast } = useToast();
  const refresh = () => qc.invalidateQueries({ queryKey: ["mess", "mine"] });
  return (
    <div className="space-y-4">
      <Card>
        <p className="text-xl font-extrabold">{m.name}</p>
        <p className="text-sm text-on-surface-variant">
          {m.plan} · since {m.since} · {m.meals.map((x) => `${x.name} ${x.time}`).join(", ")}
        </p>
        <p className="mt-2 text-xs text-on-surface-variant">Not eating a meal? Untick it at least {cutoff} hours before, so food is not wasted.</p>
      </Card>
      <Card padding="none" className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="text-left text-[10px] uppercase tracking-widest text-on-surface-variant/70">
              <th className="w-32 px-5 py-2">Day</th>
              {m.meals.map((x) => (
                <th key={x.id} className="px-2 py-2">
                  {x.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {m.week.map((d) => (
              <tr key={d.date} className="border-t border-outline-variant/15 align-top">
                <td className="px-5 py-2 font-semibold">{dayLabel(d.date)}</td>
                {d.meals.map((x) => (
                  <td key={x.mealId} className={`px-2 py-2 ${x.skipped ? "opacity-50" : ""}`}>
                    {x.special && <Pill tone="primary">{x.special}</Pill>}
                    <p className={x.skipped ? "line-through" : ""}>{x.items || "—"}</p>
                    <label className={`mt-1 flex items-center gap-1 text-xs ${x.canChange ? "cursor-pointer" : "text-on-surface-variant"}`}>
                      <input
                        type="checkbox"
                        className="accent-[#1A365D]"
                        checked={!x.skipped}
                        disabled={!x.canChange}
                        onChange={async (e) => {
                          try {
                            await messApi.mySkip({ subscriptionId: m.subscriptionId, date: d.date, mealIds: [x.mealId], skip: !e.target.checked });
                            refresh();
                          } catch (err) {
                            showToast(errorMessage(err), "error");
                          }
                        }}
                      />
                      {x.skipped ? "Skipped" : "Eating"}
                    </label>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      <div className="grid gap-4 lg:grid-cols-2">
        {m.toRate.length > 0 && (
          <Card>
            <p className="mb-3 font-bold">How was it?</p>
            {m.toRate.map((r) => (
              <div key={`${r.date}${r.mealId}`} className="flex items-center justify-between border-b border-outline-variant/10 py-2 text-sm last:border-0">
                <span>
                  {dayLabel(r.date)} · <b>{r.meal}</b>
                </span>
                <Stars
                  value={r.stars}
                  onPick={async (n) => {
                    try {
                      await messApi.rate({ date: r.date, mealId: r.mealId, stars: n });
                      showToast("Thank you", "success");
                      refresh();
                    } catch (e) {
                      showToast(errorMessage(e), "error");
                    }
                  }}
                />
              </div>
            ))}
          </Card>
        )}
        <Card>
          <p className="mb-3 font-bold">Meals taken, last two weeks ({m.served.length})</p>
          <div className="max-h-72 overflow-y-auto">
            {m.served.map((s, i) => (
              <div key={i} className="flex justify-between border-b border-outline-variant/10 py-1 text-sm last:border-0">
                <span>
                  {dayLabel(s.date)} · {s.meal}
                </span>
                <span className="text-on-surface-variant">{new Date(s.at).toLocaleTimeString("en-IN", { timeStyle: "short" })}</span>
              </div>
            ))}
            {!m.served.length && <p className="text-sm text-on-surface-variant">None.</p>}
          </div>
        </Card>
      </div>
    </div>
  );
}

function MyMess() {
  const q = useQuery({ queryKey: ["mess", "mine"], queryFn: messApi.mine });
  if (q.isLoading) return <PageLoader />;
  if (q.error) return <FormAlert>{errorMessage(q.error)}</FormAlert>;
  if (!q.data!.members.length) return <FormAlert tone="info">Not on a mess plan. Ask the office to add you.</FormAlert>;
  return (
    <div className="space-y-8">
      {q.data!.members.map((m) => (
        <Member key={m.subscriptionId} m={m} cutoff={q.data!.cutoff} />
      ))}
    </div>
  );
}

export default function MyMessPage() {
  return (
    <RequirePermission permission="mess.mine">
      <PageHeader title="My Mess" description="This week’s menu, meals you will skip, and how you liked them." />
      <MyMess />
    </RequirePermission>
  );
}
