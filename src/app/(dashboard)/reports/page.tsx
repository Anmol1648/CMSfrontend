"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { FormAlert, Pill } from "@/components/forms";
import { PageHeader } from "@/components/layout/AppShell";
import { PageLoader } from "@/components/ui/PageLoader";
import { RequirePermission } from "@/lib/auth/RequirePermission";
import { reportsApi, ReportListItem } from "@/lib/api/reports";
import { errorMessage } from "@/lib/api/client";

const ICONS: Record<string, string> = { Students: "school", Fees: "payments", Admissions: "how_to_reg", Timetable: "calendar_month", Staff: "badge", "My reports": "person" };

function Library() {
  const list = useQuery({ queryKey: ["reports"], queryFn: reportsApi.list });
  const [search, setSearch] = useState("");
  const groups = useMemo(() => {
    const q = search.trim().toLowerCase();
    const map = new Map<string, ReportListItem[]>();
    for (const r of list.data?.reports ?? []) {
      if (q && !`${r.label} ${r.description} ${r.category}`.toLowerCase().includes(q)) continue;
      map.set(r.category, [...(map.get(r.category) ?? []), r]);
    }
    return Array.from(map.entries());
  }, [list.data, search]);

  if (list.isError) return <FormAlert>{errorMessage(list.error)}</FormAlert>;
  if (!list.data) return <PageLoader />;
  return (
    <>
      <PageHeader
        title="Report Center"
        description="Every report of the school in one place. Choose the filters, see the result on screen, and take it as PDF, Excel or Word. Reports with a Jasper design print in the school’s own format."
        actions={
          list.data.canBuild ? (
            <Link href="/reports/builder" className="inline-flex items-center gap-1 px-6 py-2.5 font-medium rounded-md gradient-primary text-white shadow-ambient transition-all duration-300 active:scale-95">
              <span className="material-symbols-outlined text-lg">add</span>
              New report
            </Link>
          ) : undefined
        }
      />
      <div className="mb-6 max-w-md">
        <Input placeholder="Find a report" value={search} onChange={(e) => setSearch(e.target.value)} icon="search" />
      </div>
      {!groups.length && <Card>{list.data.reports.length ? "No report matches." : "There are no reports you can run yet."}</Card>}
      <div className="space-y-8">
        {groups.map(([category, items]) => (
          <section key={category}>
            <h2 className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-on-surface-variant/70 mb-3">
              <span className="material-symbols-outlined text-lg">{ICONS[category] ?? "summarize"}</span>
              {category}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {items.map((r) => (
                <Link key={r.key} href={`/reports/${r.key}`} className="block">
                  <Card className="h-full hover:shadow-md hover:ring-2 hover:ring-primary/10 transition-all">
                    <div className="flex flex-wrap items-start justify-between gap-3 mb-2">
                      <h3 className="font-black text-primary">{r.label}</h3>
                      <span className="flex shrink-0 gap-1">
                        {r.custom && <Pill tone="success">Custom</Pill>}
                        {r.engine === "jasper" ? <Pill tone="primary">{r.customVersion ? `Jasper · v${r.customVersion}` : "Jasper"}</Pill> : <Pill>Table</Pill>}
                      </span>
                    </div>
                    <p className="text-sm text-on-surface-variant">{r.description}</p>
                  </Card>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </>
  );
}

export default function ReportCenterPage() {
  return (
    <RequirePermission permission="report.view">
      <Library />
    </RequirePermission>
  );
}
