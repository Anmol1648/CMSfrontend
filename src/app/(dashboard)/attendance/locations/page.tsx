"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Checkbox, FormAlert, Pill } from "@/components/forms";
import { PageHeader } from "@/components/layout/AppShell";
import { PageLoader } from "@/components/ui/PageLoader";
import { useToast } from "@/components/ui/ToastProvider";
import { useConfirm } from "@/components/ui/ConfirmProvider";
import { RequirePermission } from "@/lib/auth/RequirePermission";
import { checkInApi, CheckInLocation, currentPosition, mapLink } from "@/lib/api/attendance";
import { errorMessage } from "@/lib/api/client";

const EMPTY = { name: "", latitude: "", longitude: "", radius: "150", isActive: true };

function Locations() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const confirm = useConfirm();
  const list = useQuery({ queryKey: ["check-in-locations"], queryFn: checkInApi.locations });
  const [form, setForm] = useState(EMPTY);
  const [editing, setEditing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [finding, setFinding] = useState(false);

  const here = async () => {
    setFinding(true);
    const p = await currentPosition();
    setFinding(false);
    if (!p) return showToast("Location not available: allow it for this site (and use https).", "error");
    setForm((f) => ({ ...f, latitude: p.lat.toFixed(6), longitude: p.lng.toFixed(6) }));
    showToast(`Location found (accurate to about ${p.accuracy} m)`, "success");
  };
  const save = async () => {
    setError(null);
    const input = { name: form.name.trim(), latitude: Number(form.latitude), longitude: Number(form.longitude), radius: Number(form.radius), isActive: form.isActive };
    try {
      queryClient.setQueryData(["check-in-locations"], editing ? await checkInApi.saveLocation(editing, input) : await checkInApi.addLocation(input));
      showToast("Saved", "success");
      setForm(EMPTY);
      setEditing(null);
    } catch (err) {
      setError(errorMessage(err));
    }
  };
  const edit = (l: CheckInLocation) => {
    setEditing(l.id);
    setForm({ name: l.name, latitude: String(l.latitude), longitude: String(l.longitude), radius: String(l.radius), isActive: l.isActive });
  };

  if (list.isError) return <FormAlert>{errorMessage(list.error)}</FormAlert>;
  if (!list.data) return <PageLoader />;
  const ok = form.name.trim().length >= 2 && form.latitude !== "" && form.longitude !== "" && Number(form.radius) >= 20;

  return (
    <>
      <PageHeader
        title="Check-in locations"
        description="Where staff may check in: the school (and any other campus) with a radius. Checking in outside goes for the office’s approval (or is refused). Switch it on in System Settings → Attendance."
        actions={
          <Link href="/settings" className="text-xs font-bold uppercase tracking-widest text-primary hover:opacity-70">
            Attendance settings
          </Link>
        }
      />
      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] gap-6 items-start">
        <Card>
          <h3 className="font-black text-primary mb-1">{editing ? "Change the location" : "Add a location"}</h3>
          <p className="text-xs text-on-surface-variant mb-4">Easiest: stand at the school gate with your phone and press “Use my current location”.</p>
          <div className="space-y-4">
            <Input label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Main campus" />
            <Button variant="secondary" onClick={here} disabled={finding}>
              <span className="material-symbols-outlined text-lg align-middle mr-1">my_location</span>
              {finding ? "Finding…" : "Use my current location"}
            </Button>
            <div className="grid grid-cols-2 gap-4">
              <Input label="Latitude" value={form.latitude} onChange={(e) => setForm({ ...form, latitude: e.target.value })} placeholder="30.555000" />
              <Input label="Longitude" value={form.longitude} onChange={(e) => setForm({ ...form, longitude: e.target.value })} placeholder="79.566000" />
            </div>
            <Input label="Radius (metres)" type="number" min={20} max={5000} value={form.radius} onChange={(e) => setForm({ ...form, radius: e.target.value })} />
            <Checkbox label="In use" checked={form.isActive} onChange={(v) => setForm({ ...form, isActive: v })} />
            {form.latitude && form.longitude && (
              <a href={mapLink(Number(form.latitude), Number(form.longitude))} target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-primary underline">
                Check this point on the map
              </a>
            )}
            {error && <FormAlert>{error}</FormAlert>}
            <div className="flex gap-3">
              <Button onClick={save} disabled={!ok}>
                {editing ? "Save" : "Add"}
              </Button>
              {editing && (
                <Button
                  variant="secondary"
                  onClick={() => {
                    setEditing(null);
                    setForm(EMPTY);
                  }}
                >
                  Cancel
                </Button>
              )}
            </div>
          </div>
        </Card>
        <Card padding="none" className="overflow-hidden">
          <table className="w-full text-sm">
            <tbody>
              {list.data.map((l) => (
                <tr key={l.id} className="border-t border-outline-variant/10 first:border-t-0">
                  <td className="px-5 py-3">
                    <p className="font-semibold">{l.name}</p>
                    <a href={mapLink(l.latitude, l.longitude)} target="_blank" rel="noopener noreferrer" className="text-[11px] font-mono text-primary underline">
                      {l.latitude.toFixed(5)}, {l.longitude.toFixed(5)}
                    </a>
                  </td>
                  <td className="px-5 py-3 tabular-nums">{l.radius} m</td>
                  <td className="px-5 py-3">{l.isActive ? <Pill tone="success">In use</Pill> : <Pill>Off</Pill>}</td>
                  <td className="px-5 py-3 text-right whitespace-nowrap">
                    <div className="flex justify-end gap-4 text-xs font-bold uppercase tracking-widest">
                      <button type="button" className="text-primary hover:opacity-70" onClick={() => edit(l)}>
                        Change
                      </button>
                      <button
                        type="button"
                        className="text-error hover:opacity-70"
                        onClick={async () => {
                          if (!(await confirm({ title: `Remove ${l.name}?`, message: "Staff can no longer check in there without approval.", confirmLabel: "Remove", danger: true }))) return;
                          try {
                            queryClient.setQueryData(["check-in-locations"], await checkInApi.deleteLocation(l.id));
                          } catch (err) {
                            showToast(errorMessage(err), "error");
                          }
                        }}
                      >
                        Remove
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!list.data.length && (
                <tr>
                  <td className="px-5 py-12 text-center text-on-surface-variant/70">No locations yet. Add the school first.</td>
                </tr>
              )}
            </tbody>
          </table>
        </Card>
      </div>
    </>
  );
}

export default function CheckInLocationsPage() {
  return (
    <RequirePermission permission="attendance.staff">
      <Locations />
    </RequirePermission>
  );
}
