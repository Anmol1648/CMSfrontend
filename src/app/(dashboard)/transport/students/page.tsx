"use client";

import { useState } from "react";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { FormAlert, Pill, Select } from "@/components/forms";
import { PageHeader } from "@/components/layout/AppShell";
import { PageLoader } from "@/components/ui/PageLoader";
import { useToast } from "@/components/ui/ToastProvider";
import { RequirePermission } from "@/lib/auth/RequirePermission";
import { useAuth } from "@/lib/auth/AuthProvider";
import { errorMessage } from "@/lib/api/client";
import { todayIST, transportApi, Way, WAY_LABEL } from "@/lib/api/transport";

function Assign({ ids, onClose }: { ids: string[]; onClose: () => void }) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const routes = useQuery({ queryKey: ["transport", "routes"], queryFn: transportApi.routes });
  const [routeId, setRouteId] = useState("");
  const [stopId, setStopId] = useState("");
  const [way, setWay] = useState<Way>("both");
  const [fromDate, setFromDate] = useState(todayIST());
  const [fare, setFare] = useState("");
  const [error, setError] = useState<string | null>(null);
  const route = routes.data?.routes.find((r) => r.id === routeId);
  const save = async () => {
    setError(null);
    try {
      const r = await transportApi.assign({ studentIds: ids, routeId, stopId, way, fromDate, fare: fare === "" ? null : Math.round(Number(fare)) });
      queryClient.invalidateQueries({ queryKey: ["transport"] });
      showToast(`${r.assigned} student${r.assigned === 1 ? "" : "s"} put on ${route?.name}`, "success");
      onClose();
    } catch (err) {
      setError(errorMessage(err));
    }
  };
  return (
    <Modal isOpen onClose={onClose} title={`Route and stop for ${ids.length} student${ids.length === 1 ? "" : "s"}`} width="max-w-xl">
      <div className="space-y-4">
        <Select label="Route" value={routeId} onChange={(x) => { setRouteId(x); setStopId(""); }} options={[{ value: "", label: "Choose…" }, ...(routes.data?.routes ?? []).filter((r) => r.isActive).map((r) => ({ value: r.id, label: `${r.name}${r.capacity ? ` (${r.students}/${r.capacity})` : ""}` }))]} />
        <Select label="Stop" value={stopId} onChange={setStopId} options={[{ value: "", label: route ? "Choose…" : "Choose the route first" }, ...(route?.stops ?? []).filter((s) => s.isActive).map((s) => ({ value: s.id, label: `${s.name} · ₹${s.fare}` }))]} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Select label="Which way" value={way} onChange={(x) => setWay(x as Way)} options={(Object.keys(WAY_LABEL) as Way[]).map((w) => ({ value: w, label: WAY_LABEL[w] }))} />
          <Input label="From" type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
        </div>
        <Input label="Their own fare per instalment (optional, ₹)" type="number" min={0} value={fare} onChange={(e) => setFare(e.target.value)} placeholder="Blank = the stop’s fare" />
        <p className="text-xs text-on-surface-variant/70">If a student already has a route, it ends the day before. The fare is added to their fees from the instalment this date falls in (one way: the share in System Settings → Transport).</p>
        {error && <FormAlert>{error}</FormAlert>}
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save} disabled={!routeId || !stopId}>
            Save
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function End({ ids, onClose }: { ids: string[]; onClose: () => void }) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [lastDate, setLastDate] = useState(todayIST());
  const [error, setError] = useState<string | null>(null);
  const save = async () => {
    try {
      await transportApi.end({ studentIds: ids, lastDate });
      queryClient.invalidateQueries({ queryKey: ["transport"] });
      showToast("Transport stopped", "success");
      onClose();
    } catch (err) {
      setError(errorMessage(err));
    }
  };
  return (
    <Modal isOpen onClose={onClose} title={`Stop transport for ${ids.length} student${ids.length === 1 ? "" : "s"}`}>
      <div className="space-y-4">
        <Input label="Last day on the bus" type="date" value={lastDate} onChange={(e) => setLastDate(e.target.value)} />
        <p className="text-xs text-on-surface-variant/70">No transport fee from the next instalment.</p>
        {error && <FormAlert>{error}</FormAlert>}
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save}>Stop transport</Button>
        </div>
      </div>
    </Modal>
  );
}

function Students() {
  const { can } = useAuth();
  const manage = can("transport.manage");
  const [route, setRoute] = useState("");
  const [show, setShow] = useState("using");
  const [search, setSearch] = useState("");
  const [picked, setPicked] = useState<string[]>([]);
  const [modal, setModal] = useState<"assign" | "end" | null>(null);
  const routes = useQuery({ queryKey: ["transport", "routes"], queryFn: transportApi.routes });
  const q = useQuery({ queryKey: ["transport", "students", route, show, search], queryFn: () => transportApi.students({ route: route || undefined, show, search: search.trim() || undefined }), placeholderData: keepPreviousData });
  const rows = q.data?.rows ?? [];
  const all = rows.length > 0 && rows.every((r) => picked.includes(r.id));
  return (
    <div className="space-y-4">
      <Card>
        <div className="grid gap-4 sm:grid-cols-3">
          <Select label="Show" value={show} onChange={(x) => { setShow(x); setPicked([]); }} options={[{ value: "using", label: "Students on the bus" }, { value: "not_using", label: "Students not on the bus" }, { value: "all", label: "All students" }]} />
          <Select label="Route" value={route} onChange={(x) => { setRoute(x); setPicked([]); }} options={[{ value: "", label: "All routes" }, ...(routes.data?.routes ?? []).map((r) => ({ value: r.id, label: r.name }))]} />
          <Input label="Find" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Name or admission no" icon="search" />
        </div>
      </Card>
      {manage && picked.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-primary/10 px-4 py-3">
          <p className="text-sm font-bold text-primary">{picked.length} chosen</p>
          <Button onClick={() => setModal("assign")}>Give route & stop</Button>
          <Button variant="secondary" onClick={() => setModal("end")}>
            Stop transport
          </Button>
          <button type="button" onClick={() => setPicked([])} className="ml-auto text-xs font-bold text-primary">
            Clear
          </button>
        </div>
      )}
      {q.isLoading ? (
        <PageLoader />
      ) : q.error ? (
        <FormAlert>{errorMessage(q.error)}</FormAlert>
      ) : !rows.length ? (
        <FormAlert tone="info">No students here.</FormAlert>
      ) : (
        <Card padding="none">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60 border-b border-outline-variant/20">
                  {manage && (
                    <th className="px-4 py-3 w-10">
                      <input type="checkbox" aria-label="Choose all" checked={all} onChange={() => setPicked(all ? [] : rows.map((r) => r.id))} className="accent-[#1A365D]" />
                    </th>
                  )}
                  <th className="px-4 py-3">Student</th>
                  <th className="px-4 py-3">Class</th>
                  <th className="px-4 py-3">Route · stop</th>
                  <th className="px-4 py-3">Way</th>
                  <th className="px-4 py-3">Since</th>
                  <th className="px-4 py-3 text-right">Fare</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-outline-variant/10 hover:bg-surface-container-low">
                    {manage && (
                      <td className="px-4 py-2.5">
                        <input type="checkbox" aria-label={`Choose ${r.name}`} checked={picked.includes(r.id)} onChange={() => setPicked((p) => (p.includes(r.id) ? p.filter((x) => x !== r.id) : [...p, r.id]))} className="accent-[#1A365D]" />
                      </td>
                    )}
                    <td className="px-4 py-2.5">
                      <p className="font-bold text-on-surface">{r.name}</p>
                      <p className="text-xs text-on-surface-variant/70">{r.admissionNo}</p>
                    </td>
                    <td className="px-4 py-2.5">{r.section}</td>
                    <td className="px-4 py-2.5">{r.transport ? `${r.transport.route} · ${r.transport.stop}` : <span className="text-on-surface-variant/50">—</span>}</td>
                    <td className="px-4 py-2.5">{r.transport ? <Pill tone={r.transport.way === "both" ? "primary" : "neutral"}>{WAY_LABEL[r.transport.way]}</Pill> : null}</td>
                    <td className="px-4 py-2.5 text-xs">
                      {r.transport?.fromDate ?? ""}
                      {r.transport?.toDate ? ` to ${r.transport.toDate}` : ""}
                    </td>
                    <td className="px-4 py-2.5 text-right">{r.transport ? `₹${r.transport.fare ?? 0}${r.transport.ownFare ? " *" : ""}` : ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="px-4 py-3 text-xs text-on-surface-variant/60">{rows.length} students · fare per instalment (* their own fare)</p>
        </Card>
      )}
      {modal === "assign" && <Assign ids={picked} onClose={() => { setModal(null); setPicked([]); }} />}
      {modal === "end" && <End ids={picked} onClose={() => { setModal(null); setPicked([]); }} />}
    </div>
  );
}

export default function TransportStudentsPage() {
  return (
    <RequirePermission permission={["transport.view", "transport.manage"]}>
      <PageHeader title="Students’ Transport" description="Who comes by bus: their route, stop, which way and fare. Choose students to give them a route or stop their transport." />
      <Students />
    </RequirePermission>
  );
}
