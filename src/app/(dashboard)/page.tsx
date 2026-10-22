"use client";

import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/Card";
import { FormAlert } from "@/components/forms";
import { PageLoader } from "@/components/ui/PageLoader";
import { useAuth } from "@/lib/auth/AuthProvider";
import { errorMessage } from "@/lib/api/client";
import { dashboardApi } from "@/lib/api/dashboard";
import { Widget } from "@/components/dashboard/Widget";

const greeting = () => {
  const h = Number(new Date().toLocaleString("en-IN", { hour: "numeric", hour12: false, timeZone: "Asia/Kolkata" }));
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
};

/** Home: the person's dashboard (the widgets of their roles that their permissions allow). */
export default function HomePage() {
  const { me } = useAuth();
  const queryClient = useQueryClient();
  const q = useQuery({ queryKey: ["my-dashboard"], queryFn: dashboardApi.mine, staleTime: 5 * 60_000 });
  if (!me) return null;
  const today = new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Kolkata" });
  const first = me.user.displayName.split(" ")[0];
  return (
    <>
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between mb-6 lg:mb-8">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant/60">{today}</p>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-on-surface tracking-tight mt-1">
            {greeting()}, {first}
          </h1>
          <p className="text-sm text-on-surface-variant/70 mt-1">{me.school?.legalName}</p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <button type="button" onClick={() => queryClient.invalidateQueries({ queryKey: ["widget"] })} className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-widest text-primary hover:opacity-70">
            <span className="material-symbols-outlined text-base">refresh</span>
            Refresh
          </button>
          {q.data?.canSetUp && (
            <Link href="/dashboard/setup" className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-widest text-primary hover:opacity-70">
              <span className="material-symbols-outlined text-base">dashboard_customize</span>
              Set up dashboards
            </Link>
          )}
        </div>
      </div>
      {q.isError && <FormAlert>{errorMessage(q.error)}</FormAlert>}
      {!q.data && !q.isError && <PageLoader />}
      {q.data && !q.data.widgets.length && (
        <Card className="text-center py-12 space-y-2">
          <span className="material-symbols-outlined text-4xl text-on-surface-variant/40">dashboard</span>
          <p className="font-semibold">Your dashboard is empty</p>
          <p className="text-sm text-on-surface-variant/70">{q.data.canSetUp ? "Choose the widgets for each role in Dashboard Setup." : "Your school hasn’t chosen widgets for your role yet. Use the menu to get started."}</p>
        </Card>
      )}
      {q.data && q.data.widgets.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 lg:gap-6 items-stretch">
          {q.data.widgets.map((w) => (
            <Widget key={w.key} w={w} />
          ))}
        </div>
      )}
    </>
  );
}
