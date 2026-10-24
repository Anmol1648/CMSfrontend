"use client";

import { useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { FormAlert, Pill } from "@/components/forms";
import { PageHeader } from "@/components/layout/AppShell";
import { PageLoader } from "@/components/ui/PageLoader";
import { useToast } from "@/components/ui/ToastProvider";
import { RequirePermission } from "@/lib/auth/RequirePermission";
import { errorMessage } from "@/lib/api/client";
import { idCardsApi, Mine } from "@/lib/api/idcards";
import { IdCardSide, PrintCards } from "@/components/idcards/IdCard";
import { PassportCamera } from "@/components/idcards/PassportCamera";
import { cn } from "@/lib/utils";

type Person = Mine["people"][number];

function SendPhoto({ person, data, onSent }: { person: Person; data: Mine; onSent: () => void }) {
  const { showToast } = useToast();
  const [camera, setCamera] = useState(false);
  const [busy, setBusy] = useState(false);
  const file = useRef<HTMLInputElement>(null);
  const last = data.requests.find((r) => r.studentId === person.id);
  const send = async (f: File) => {
    setBusy(true);
    try {
      const r = await idCardsApi.sendPhoto(person.id, f);
      showToast(r.pending ? "Sent: the school will check it and you will be told" : "Photo saved", "success");
      setCamera(false);
      onSent();
    } catch (e) {
      showToast(errorMessage(e), "error");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="rounded-xl bg-surface-container-low p-3 space-y-2">
      <p className="text-sm font-bold">{person.photo ? "Send a new photo for the card" : "No photo yet: send one for the card"}</p>
      <p className="text-xs text-on-surface-variant">A recent passport-style photo: face clearly seen, plain light background, no cap or sunglasses.{data.approval ? " The school checks it before it is used." : ""}</p>
      {last && (
        <p className="text-xs">
          Last sent {new Date(last.at).toLocaleDateString("en-IN")}: <Pill tone={last.status === "approved" ? "success" : last.status === "rejected" ? "danger" : "warning"}>{last.status === "pending" ? "Waiting for the school" : last.status === "approved" ? "Accepted" : "Not accepted"}</Pill>
          {last.note ? ` ${last.note}` : ""}
        </p>
      )}
      <div className="flex gap-2">
        <Button variant="secondary" onClick={() => setCamera(true)} disabled={busy}>
          <span className="material-symbols-outlined text-lg">photo_camera</span> Camera
        </Button>
        <Button variant="secondary" onClick={() => file.current?.click()} disabled={busy}>
          <span className="material-symbols-outlined text-lg">upload</span> Choose a photo
        </Button>
      </div>
      <input ref={file} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) void send(f); }} />
      {camera && <PassportCamera title={`Photo: ${person.name}`} busy={busy} onClose={() => setCamera(false)} onShot={send} />}
    </div>
  );
}

function MyCards() {
  const q = useQuery({ queryKey: ["idcards", "mine"], queryFn: idCardsApi.mine });
  const [pick, setPick] = useState<string | null>(null);
  const [side, setSide] = useState<"front" | "back">("front");
  if (q.isLoading) return <PageLoader />;
  if (q.error) return <FormAlert>{errorMessage(q.error)}</FormAlert>;
  const d = q.data!;
  if (!d.people.length) return <FormAlert tone="info">No student or staff record is linked to your login.</FormAlert>;
  const p = d.people.find((x) => x.id === pick) ?? d.people[0];
  return (
    <div className="space-y-4 max-w-3xl">
      {d.people.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {d.people.map((x) => (
            <button key={x.id} type="button" onClick={() => setPick(x.id)} className={cn("rounded-full px-4 py-1.5 text-xs font-bold border", x.id === p.id ? "bg-primary text-white border-primary" : "border-outline-variant/40 text-on-surface-variant")}>
              {x.name}
            </button>
          ))}
        </div>
      )}
      <Card>
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <p className="flex-1 font-extrabold">{p.name}</p>
          {p.card ? <Pill tone="success">Card {p.card.cardNo}</Pill> : <Pill>No card printed yet</Pill>}
        </div>
        {!d.digital ? (
          <FormAlert tone="info">The school gives printed cards only.</FormAlert>
        ) : !p.design ? (
          <FormAlert tone="info">The school has not set up ID cards yet.</FormAlert>
        ) : (
          <div className="space-y-3">
            <div className="flex justify-center">
              <div className="origin-top scale-[1.35] sm:scale-150 mb-[45%] sm:mb-[55%]">
                <IdCardSide design={p.design} holder={p} school={d.school} side={side} />
              </div>
            </div>
            <div className="flex justify-center gap-2">
              {p.design.back && (
                <Button variant="secondary" onClick={() => setSide((s) => (s === "front" ? "back" : "front"))}>
                  <span className="material-symbols-outlined text-lg">flip</span> {side === "front" ? "Back" : "Front"}
                </Button>
              )}
              <Button variant="secondary" onClick={() => window.print()}>
                <span className="material-symbols-outlined text-lg">download</span> Save / print
              </Button>
            </div>
            <PrintCards design={p.design} holders={[p]} school={d.school} mode="single" backs />
            {!p.card && <p className="text-center text-xs text-on-surface-variant">This is how the card will look; it gets its number when the school prints it.</p>}
          </div>
        )}
        {p.type === "student" && d.parentPhotos && <div className="mt-4"><SendPhoto person={p} data={d} onSent={() => q.refetch()} /></div>}
      </Card>
    </div>
  );
}

export default function MyIdCardPage() {
  return (
    <RequirePermission permission="idcard.mine">
      <PageHeader title="My ID Card" description="Your school ID card on your phone. Parents see each child’s card and can send a photo for it." />
      <MyCards />
    </RequirePermission>
  );
}
