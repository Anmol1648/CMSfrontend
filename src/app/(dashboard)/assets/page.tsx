"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { FormAlert, Pill, Select } from "@/components/forms";
import { PageHeader } from "@/components/layout/AppShell";
import { PageLoader } from "@/components/ui/PageLoader";
import { Pagination } from "@/components/ui/Pagination";
import { RequirePermission } from "@/lib/auth/RequirePermission";
import { useAuth } from "@/lib/auth/AuthProvider";
import { errorMessage } from "@/lib/api/client";
import { assetsApi, rupees, STATUS } from "@/lib/api/assets";
import { AssetDrawer, AssetForm, useAssetOptions } from "@/components/assets/AssetParts";
import { CameraScan } from "@/components/library/CameraScan";
import { useToast } from "@/components/ui/ToastProvider";

const opts = (l: { id: string; name: string }[], all: string) => [{ value: "", label: all }, ...l.map((x) => ({ value: x.id, label: x.name }))];

function Register() {
  const { can } = useAuth();
  const router = useRouter();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const o = useAssetOptions();
  const [search, setSearch] = useState("");
  const [term, setTerm] = useState("");
  const [f, setF] = useState({ category: "", room: "", condition: "", staff: "", status: "active" });
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  useEffect(() => {
    const t = setTimeout(() => setTerm(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);
  useEffect(() => setPage(1), [term, f]);
  const q = useQuery({ queryKey: ["assets", "list", term, f, page], queryFn: () => assetsApi.list({ search: term, ...f, page, pageSize: 25 }) });
  const set = (k: keyof typeof f) => (v: string) => setF((x) => ({ ...x, [k]: v }));
  const toggle = (id: string) => setPicked((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const scan = async (code: string) => {
    try {
      const a = await assetsApi.byCode(code);
      setOpen(a.id);
    } catch (e) {
      showToast(errorMessage(e), "error");
    }
  };
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-2 justify-end">
        <CameraScan onScan={scan} label="Scan a label" square />
        <Button variant="secondary" disabled={!picked.size} onClick={() => router.push(`/assets/labels?ids=${Array.from(picked).join(",")}`)}>
          <span className="material-symbols-outlined text-lg">qr_code_2</span> Labels for {picked.size || "ticked"}
        </Button>
        <Button variant="secondary" disabled={!f.room} onClick={() => router.push(`/assets/labels?room=${f.room}`)}>
          Labels for the room
        </Button>
        {can("asset.manage") && (
          <Button onClick={() => setAdding(true)} disabled={!o.data}>
            <span className="material-symbols-outlined text-lg">add</span> Add an asset
          </Button>
        )}
      </div>
      <Card>
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <Input label="Search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Name, code, serial…" className="lg:col-span-1" />
          <Select label="Category" value={f.category} onChange={set("category")} options={opts(o.data?.categories ?? [], "All")} />
          <Select label="Room" value={f.room} onChange={set("room")} options={opts(o.data?.rooms ?? [], "All")} />
          <Select label="Condition" value={f.condition} onChange={set("condition")} options={opts(o.data?.conditions ?? [], "All")} />
          <Select label="With staff" value={f.staff} onChange={set("staff")} options={opts(o.data?.staff ?? [], "Anyone")} />
          <Select label="Status" value={f.status} onChange={set("status")} options={[{ value: "active", label: "In use + in repair" }, { value: "in_use", label: "In use" }, { value: "in_repair", label: "In repair" }, { value: "disposed", label: "Written off" }, { value: "lost", label: "Lost" }, { value: "all", label: "All" }]} />
        </div>
      </Card>
      {q.isLoading ? (
        <PageLoader />
      ) : q.error ? (
        <FormAlert>{errorMessage(q.error)}</FormAlert>
      ) : (
        <Card padding="none">
          <div className="flex flex-wrap gap-4 px-5 py-3 text-sm border-b border-outline-variant/20">
            <span>
              <b>{q.data!.total}</b> entries
            </span>
            <span>
              <b>{q.data!.totals.items.toLocaleString("en-IN")}</b> items
            </span>
            <span>
              Cost <b>{rupees(q.data!.totals.cost)}</b>
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-widest text-on-surface-variant/70">
                  <th className="px-4 py-2 w-8"></th>
                  <th className="px-2 py-2">Code</th>
                  <th className="px-2 py-2">Asset</th>
                  <th className="px-2 py-2">Room / with</th>
                  <th className="px-2 py-2">Condition</th>
                  <th className="px-2 py-2 text-right">Qty</th>
                  <th className="px-2 py-2 text-right">Cost</th>
                  {o.data?.depreciation && <th className="px-2 py-2 text-right">Value now</th>}
                  <th className="px-4 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {q.data!.rows.map((r) => (
                  <tr key={r.id} className="border-t border-outline-variant/15 hover:bg-surface-container-low cursor-pointer" onClick={() => setOpen(r.id)}>
                    <td className="px-4 py-2" onClick={(e) => e.stopPropagation()}>
                      <input type="checkbox" className="accent-[#1A365D]" checked={picked.has(r.id)} onChange={() => toggle(r.id)} aria-label={`Tick ${r.code}`} />
                    </td>
                    <td className="px-2 py-2 font-mono text-xs">{r.code}</td>
                    <td className="px-2 py-2">
                      <p className="font-bold">{r.name}</p>
                      <p className="text-xs text-on-surface-variant">{r.category}</p>
                    </td>
                    <td className="px-2 py-2">
                      {r.room ?? "—"}
                      {r.staff && <p className="text-xs text-on-surface-variant">with {r.staff}</p>}
                    </td>
                    <td className="px-2 py-2">{r.condition ?? "—"}</td>
                    <td className="px-2 py-2 text-right">{r.quantity}</td>
                    <td className="px-2 py-2 text-right">{rupees(r.cost)}</td>
                    {o.data?.depreciation && <td className="px-2 py-2 text-right">{rupees(r.value)}</td>}
                    <td className="px-4 py-2">
                      <div className="flex flex-wrap gap-1">
                        <Pill tone={STATUS[r.status].tone}>{STATUS[r.status].label}</Pill>
                        {r.openIssues > 0 && <Pill tone="danger">{r.openIssues} problem</Pill>}
                        {r.maintenanceDue && <Pill tone="warning">Service due</Pill>}
                      </div>
                    </td>
                  </tr>
                ))}
                {!q.data!.rows.length && (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-on-surface-variant">
                      No assets match.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {q.data!.total > q.data!.pageSize && <Pagination className="px-4 py-3" currentPage={page} totalPage={Math.ceil(q.data!.total / q.data!.pageSize)} onPageChange={setPage} />}
        </Card>
      )}
      {open && <AssetDrawer id={open} onClose={() => setOpen(null)} />}
      {adding && o.data && (
        <AssetForm
          asset={null}
          options={o.data}
          onClose={() => setAdding(false)}
          onSaved={(a) => {
            setAdding(false);
            queryClient.invalidateQueries({ queryKey: ["assets"] });
            setOpen(a.id);
          }}
        />
      )}
    </div>
  );
}

export default function AssetsPage() {
  return (
    <RequirePermission permission={["asset.manage", "asset.view"]}>
      <PageHeader title="Asset Register" description="Everything the school owns: where it is, who has it, its value and care. Click an asset for its history, to move it, give it to a staff member, record maintenance or write it off." />
      <Register />
    </RequirePermission>
  );
}
