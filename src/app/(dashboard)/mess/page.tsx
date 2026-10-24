"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { FormAlert, Pill } from "@/components/forms";
import { PageHeader } from "@/components/layout/AppShell";
import { PageLoader } from "@/components/ui/PageLoader";
import { RequirePermission } from "@/lib/auth/RequirePermission";
import { useAuth } from "@/lib/auth/AuthProvider";
import { errorMessage } from "@/lib/api/client";
import { todayISO } from "@/lib/api/hostel";
import { messApi } from "@/lib/api/mess";

function Stat({ label, value, tone }: { label: string; value: number | string; tone?: string }) {
  return (
    <div className="rounded-xl bg-surface-container px-3 py-2">
      <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/70">{label}</p>
      <p className={`text-lg font-extrabold ${tone ?? ""}`}>{value}</p>
    </div>
  );
}

function Today() {
  const { can } = useAuth();
  const [date, setDate] = useState(todayISO());
  const q = useQuery({ queryKey: ["mess", "today", date], queryFn: () => messApi.today(date), refetchInterval: 60_000 });
  if (q.isLoading) return <PageLoader />;
  if (q.error) return <FormAlert>{errorMessage(q.error)}</FormAlert>;
  const meals = q.data!.meals;
  return (
    <div className="space-y-4">
      <Input className="max-w-xs" label="Date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      {!meals.length && <FormAlert tone="info">No meals yet: add them in Masters → Meals.</FormAlert>}
      <div className="grid gap-4 md:grid-cols-2">
        {meals.map((m) => (
          <Card key={m.id}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-lg font-extrabold">
                  {m.name} <span className="text-sm font-normal text-on-surface-variant">{m.time}</span>
                </p>
                {m.special && <Pill tone="primary">{m.special}</Pill>}
                <p className="mt-1 text-sm">{m.items || <span className="text-on-surface-variant">No menu set</span>}</p>
              </div>
              {(can("mess.counter") || can("mess.manage")) && date === todayISO() && (
                <Link href={`/mess/counter?meal=${m.id}`} className="shrink-0 text-sm font-semibold text-primary">
                  Counter →
                </Link>
              )}
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-6">
              <Stat label="Members" value={m.members} />
              <Stat label="Skipped" value={m.skipped} />
              <Stat label="On leave" value={m.away} />
              <Stat label="Cook for" value={m.cook} tone="text-primary" />
              <Stat label="Eaten" value={m.started ? m.served : "—"} />
              <Stat label="Guests" value={m.guests} />
            </div>
            {m.rating != null && (
              <p className="mt-3 text-sm">
                Rated <b>{m.rating}★</b> by {m.ratings}
              </p>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}

export default function MessTodayPage() {
  return (
    <RequirePermission permission={["mess.manage", "mess.view", "mess.setup", "mess.counter"]}>
      <PageHeader title="Mess Today" description="What is on the menu and how many to cook for: members on each meal, less meals skipped and boarders away on hostel leave." />
      <Today />
    </RequirePermission>
  );
}
