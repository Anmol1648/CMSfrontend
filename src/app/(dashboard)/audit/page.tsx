"use client";

import { useEffect, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { FormAlert, Select } from "@/components/forms";
import { PageHeader } from "@/components/layout/AppShell";
import { AuditChanges, actionLabel, entityLabel } from "@/components/admin/AuditChanges";
import { formatDateTime } from "@/components/admin/labels";
import { RequirePermission } from "@/lib/auth/RequirePermission";
import { auditApi, AuditQuery } from "@/lib/api/audit";
import { errorMessage } from "@/lib/api/client";

const PAGE_SIZE = 50;

/** "Chrome on Windows" from a user-agent string. */
const device = (ua: string | null) => {
  if (!ua) return "";
  const b = /Edg\//.test(ua) ? "Edge" : /Chrome\//.test(ua) ? "Chrome" : /Firefox\//.test(ua) ? "Firefox" : /Safari\//.test(ua) ? "Safari" : "";
  const o = /Windows/.test(ua) ? "Windows" : /Android/.test(ua) ? "Android" : /iPhone|iPad/.test(ua) ? "iOS" : /Mac OS/.test(ua) ? "Mac" : "";
  return [b, o].filter(Boolean).join(" on ");
};

function AuditTrail() {
  const [filters, setFilters] = useState<AuditQuery>({});
  const [page, setPage] = useState(1);
  useEffect(() => setPage(1), [filters]);

  const facets = useQuery({ queryKey: ["audit-facets"], queryFn: auditApi.facets });
  const query = { ...filters, page, pageSize: PAGE_SIZE };
  const entries = useQuery({ queryKey: ["audit", query], queryFn: () => auditApi.list(query), placeholderData: keepPreviousData });
  const totalPages = entries.data ? Math.max(1, Math.ceil(entries.data.total / PAGE_SIZE)) : 1;
  const set = (k: keyof AuditQuery) => (v: string) => setFilters((f) => ({ ...f, [k]: v || undefined }));

  return (
    <>
      <PageHeader title="Audit Trail" description="Who did what and when: sign-ins, failed sign-ins, and every change with its old and new value." />

      <Card padding="none" className="overflow-hidden">
        <div className="grid grid-cols-2 lg:grid-cols-[1fr_1fr_1.4fr_1.4fr_1.4fr_auto] gap-4 p-6 border-b border-outline-variant/20 items-end">
          <Input label="From" type="date" value={filters.from ?? ""} onChange={(e) => set("from")(e.target.value)} />
          <Input label="To" type="date" value={filters.to ?? ""} onChange={(e) => set("to")(e.target.value)} />
          <Select
            label="What happened"
            value={filters.action ?? ""}
            onChange={set("action")}
            options={[{ value: "", label: "Everything" }, ...(facets.data?.actions ?? []).map((a) => ({ value: a.value, label: `${actionLabel(a.value)} (${a.count})` }))]}
          />
          <Select
            label="Record type"
            value={filters.entity ?? ""}
            onChange={set("entity")}
            options={[{ value: "", label: "All records" }, ...(facets.data?.entities ?? []).map((e) => ({ value: e.value, label: `${entityLabel(e.value)} (${e.count})` }))]}
          />
          <Select
            label="Who"
            value={filters.userId ?? ""}
            onChange={set("userId")}
            options={[{ value: "", label: "Anyone" }, ...(facets.data?.users ?? []).map((u) => ({ value: u.value, label: `${u.label} (${u.count})` }))]}
          />
          <Button variant="secondary" onClick={() => setFilters({})} disabled={!Object.values(filters).some(Boolean)}>
            Clear
          </Button>
        </div>

        {entries.isError && (
          <div className="p-6">
            <FormAlert>{errorMessage(entries.error)}</FormAlert>
          </div>
        )}

        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[10px] uppercase tracking-widest text-on-surface-variant/60">
              <th className="px-6 py-3 font-bold w-44">When</th>
              <th className="px-6 py-3 font-bold w-48">Who</th>
              <th className="px-6 py-3 font-bold w-56">What happened</th>
              <th className="px-6 py-3 font-bold">Details</th>
              <th className="px-6 py-3 font-bold w-48">From</th>
            </tr>
          </thead>
          <tbody>
            {entries.data?.items.map((e) => (
              <tr key={e.id} className="border-t border-outline-variant/10 align-top">
                <td className="px-6 py-4 whitespace-nowrap text-on-surface-variant">{formatDateTime(e.at)}</td>
                <td className="px-6 py-4">
                  {e.user ? (
                    <>
                      <p className="font-semibold text-on-surface">{e.user.displayName}</p>
                      <p className="text-xs text-on-surface-variant/60 font-mono">{e.user.username}</p>
                    </>
                  ) : (
                    <span className="text-on-surface-variant/60">{e.action === "login_failed" ? "Unknown" : "System"}</span>
                  )}
                </td>
                <td className="px-6 py-4">
                  <p className={e.action === "login_failed" || e.action === "account_locked" || e.action === "session_reuse_detected" ? "font-bold text-error" : "font-bold text-on-surface"}>
                    {actionLabel(e.action)}
                  </p>
                  <p className="text-xs text-on-surface-variant/60">{entityLabel(e.entity)}</p>
                </td>
                <td className="px-6 py-4">
                  <AuditChanges entry={e} />
                </td>
                <td className="px-6 py-4 text-xs text-on-surface-variant/70">
                  <p>{device(e.userAgent)}</p>
                  <p className="font-mono">{e.ip}</p>
                </td>
              </tr>
            ))}
            {entries.data && entries.data.items.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-on-surface-variant/70">
                  Nothing recorded for these filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        <div className="flex items-center justify-between px-6 py-4 border-t border-outline-variant/20 text-sm">
          <span className="text-on-surface-variant/70">{entries.data ? `${entries.data.total} entr${entries.data.total === 1 ? "y" : "ies"}` : entries.isLoading ? "Loading…" : ""}</span>
          <div className="flex items-center gap-3">
            <Button variant="secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              Newer
            </Button>
            <span className="text-on-surface-variant/70">
              Page {page} of {totalPages}
            </span>
            <Button variant="secondary" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
              Older
            </Button>
          </div>
        </div>
      </Card>
    </>
  );
}

export default function AuditPage() {
  return (
    <RequirePermission permission="audit.view">
      <AuditTrail />
    </RequirePermission>
  );
}
