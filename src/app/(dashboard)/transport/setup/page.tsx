"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Checkbox, FormAlert, Pill, Select } from "@/components/forms";
import { PageHeader } from "@/components/layout/AppShell";
import { PageLoader } from "@/components/ui/PageLoader";
import { useToast } from "@/components/ui/ToastProvider";
import { RequirePermission } from "@/lib/auth/RequirePermission";
import { ApiError, errorMessage } from "@/lib/api/client";
import { Connect, ConnectInput, GpsTest, timeOf, transportApi } from "@/lib/api/transport";

const label = "text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-widest";

function Form({ info }: { info: Connect }) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [v, setV] = useState<ConnectInput>({ mapProvider: info.mapProvider, gpsProvider: info.gpsProvider, gpsUrl: info.gpsUrl, autoTrips: info.autoTrips });
  const [googleKey, setGoogleKey] = useState("");
  const [gpsKey, setGpsKey] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [test, setTest] = useState<GpsTest | null>(null);
  const set = (p: Partial<ConnectInput>) => setV((x) => ({ ...x, ...p }));
  useEffect(() => {
    setTest(null);
  }, [v.gpsProvider]);

  const save = async () => {
    setError(null);
    setFields({});
    try {
      await transportApi.saveConnect({ ...v, googleKey: googleKey.trim() || undefined, gpsKey: gpsKey.trim() || undefined });
      setGoogleKey("");
      setGpsKey("");
      queryClient.invalidateQueries({ queryKey: ["transport"] });
      showToast("Saved", "success");
    } catch (err) {
      setError(errorMessage(err));
      setFields(err instanceof ApiError ? err.fieldErrors() : {});
    }
  };
  const runTest = async () => {
    try {
      setTest(await transportApi.testGps());
    } catch (err) {
      showToast(errorMessage(err), "error");
    }
  };
  const removeKey = async (which: "googleKey" | "gpsKey") => {
    try {
      await transportApi.saveConnect({ ...v, mapProvider: which === "googleKey" ? "osm" : v.mapProvider, [which]: "-" });
      if (which === "googleKey") set({ mapProvider: "osm" });
      queryClient.invalidateQueries({ queryKey: ["transport"] });
      showToast("Key removed", "success");
    } catch (err) {
      showToast(errorMessage(err), "error");
    }
  };
  const withDevice = info.vehicles.filter((x) => x.gpsDeviceId);

  return (
    <div className="space-y-6 max-w-3xl">
      <Card>
        <h2 className="text-lg font-extrabold text-on-surface flex items-center gap-2">
          <span className="material-symbols-outlined text-primary">map</span> Map
        </h2>
        <div className="mt-4 space-y-4">
          <Select label="Map used on every transport screen" value={v.mapProvider} onChange={(x) => set({ mapProvider: x as ConnectInput["mapProvider"] })} options={[{ value: "osm", label: "OpenStreetMap (free, no key)" }, { value: "google", label: "Google Maps (needs the school’s key)" }]} />
          {v.mapProvider === "google" && (
            <>
              <div className="flex items-end gap-3">
                <Input label={info.googleKeySet ? "Google Maps key (saved; enter a new one to change it)" : "Google Maps key"} type="password" value={googleKey} onChange={(e) => setGoogleKey(e.target.value)} error={fields.googleKey} placeholder={info.googleKeySet ? "••••••••" : "AIza…"} autoComplete="off" />
                {info.googleKeySet && (
                  <Button variant="tertiary" onClick={() => removeKey("googleKey")}>
                    Remove
                  </Button>
                )}
              </div>
              <FormAlert tone="info">
                In Google Cloud Console: turn on the <b>Map Tiles API</b> for the project, make an API key, and limit it to your school’s web address (HTTP referrers). Google charges for map use beyond its free monthly quota.
              </FormAlert>
            </>
          )}
        </div>
      </Card>

      <Card>
        <h2 className="text-lg font-extrabold text-on-surface flex items-center gap-2">
          <span className="material-symbols-outlined text-primary">satellite_alt</span> GPS devices in vehicles
        </h2>
        <p className="text-sm text-on-surface-variant mt-1">Without a device, the driver’s phone sends the bus’s position (My Trip). With a GPS tracker fitted in the bus, its position comes from the tracker’s company.</p>
        <div className="mt-4 space-y-4">
          <Select label="Where positions come from" value={v.gpsProvider} onChange={(x) => set({ gpsProvider: x as ConnectInput["gpsProvider"] })} options={[{ value: "none", label: "The driver’s phone (no GPS devices)" }, { value: "traccar", label: "Traccar (or a tracker company with the Traccar API)" }, { value: "generic", label: "Another tracker company (a web address that lists the positions)" }]} />
          {v.gpsProvider !== "none" && (
            <>
              <Input label={v.gpsProvider === "traccar" ? "Traccar server address" : "Web address that lists the positions"} value={v.gpsUrl} onChange={(e) => set({ gpsUrl: e.target.value })} error={fields.gpsUrl} placeholder={v.gpsProvider === "traccar" ? "https://gps.example.com" : "https://api.example.com/v1/positions"} />
              <div className="flex items-end gap-3">
                <Input label={info.gpsKeySet ? "Key or login (saved; enter a new one to change it)" : "Key, or user:password"} type="password" value={gpsKey} onChange={(e) => setGpsKey(e.target.value)} placeholder={info.gpsKeySet ? "••••••••" : "token, or user@school.in:password"} autoComplete="off" />
                {info.gpsKeySet && (
                  <Button variant="tertiary" onClick={() => removeKey("gpsKey")}>
                    Remove
                  </Button>
                )}
              </div>
              <p className="text-xs text-on-surface-variant/70">A token is sent as “Bearer”; “user:password” as a login.{v.gpsProvider === "generic" ? " The field names in each position (device id, latitude, longitude, speed, time) and the speed unit are in System Settings → Transport." : ""}</p>
              <Checkbox checked={v.autoTrips} onChange={(x) => set({ autoTrips: x })} label="Trips start and end by themselves" hint="A bus with a device starts its trip when it moves near the route’s time (15 min before to 1 hour after), and ends at school (morning) or after the last stop (afternoon). Off: the driver or office starts it." />
            </>
          )}
          {error && <FormAlert>{error}</FormAlert>}
          <div className="flex flex-wrap justify-end gap-3">
            {v.gpsProvider !== "none" && info.gpsProvider !== "none" && (
              <Button variant="secondary" onClick={runTest}>
                Test it
              </Button>
            )}
            <Button onClick={save}>Save</Button>
          </div>
        </div>
      </Card>

      {test && (
        <Card>
          <p className="font-bold text-on-surface">The provider sent {test.positions} position{test.positions === 1 ? "" : "s"}.</p>
          {!test.vehicles.length && <FormAlert tone="warning">No vehicle has a GPS device id yet.</FormAlert>}
          <ul className="mt-3 space-y-2">
            {test.vehicles.map((x) => (
              <li key={x.deviceId} className="flex flex-wrap items-center gap-3 rounded-xl bg-surface-container-low px-4 py-2 text-sm">
                <span className="font-bold">{x.name}</span>
                <span className="text-xs text-on-surface-variant">device {x.deviceId}</span>
                {x.found ? <Pill tone="success">Found</Pill> : <Pill tone="danger">Not in the list</Pill>}
                {x.found && (
                  <span className="text-xs text-on-surface-variant">
                    {x.lat?.toFixed(5)}, {x.lng?.toFixed(5)} · {x.speed ?? 0} km/h · {timeOf(x.at)}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card>
        <p className={label}>Vehicles with a GPS device</p>
        {withDevice.length ? (
          <ul className="mt-2 space-y-1 text-sm">
            {withDevice.map((x) => (
              <li key={x.id}>
                {x.name} ({x.number}) · device <b>{x.gpsDeviceId}</b>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-on-surface-variant">None yet.</p>
        )}
        <p className="mt-2 text-xs text-on-surface-variant/70">
          Enter each tracker’s device id (or IMEI) on the vehicle:{" "}
          <Link href="/transport/vehicles" className="font-bold text-primary">
            Transport → Vehicles
          </Link>{" "}
          → edit → GPS device id.
        </p>
      </Card>
    </div>
  );
}

function Setup() {
  const q = useQuery({ queryKey: ["transport", "connect"], queryFn: transportApi.connect });
  if (q.isLoading) return <PageLoader />;
  if (q.error) return <FormAlert>{errorMessage(q.error)}</FormAlert>;
  return <Form key={q.dataUpdatedAt} info={q.data!} />;
}

export default function TransportSetupPage() {
  return (
    <RequirePermission permission="transport.setup">
      <PageHeader title="GPS & Maps" description="Use Google Maps instead of OpenStreetMap, and connect GPS trackers fitted in the buses. Keys are stored encrypted." />
      <Setup />
    </RequirePermission>
  );
}
