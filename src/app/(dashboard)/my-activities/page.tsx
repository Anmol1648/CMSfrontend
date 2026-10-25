"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { FormAlert } from "@/components/forms";
import { PageHeader } from "@/components/layout/AppShell";
import { PageLoader } from "@/components/ui/PageLoader";
import { useToast } from "@/components/ui/ToastProvider";
import { useConfirm } from "@/components/ui/ConfirmProvider";
import { RequirePermission } from "@/lib/auth/RequirePermission";
import { errorMessage } from "@/lib/api/client";
import { cocurricularApi, day, MyActivities, place } from "@/lib/api/cocurricular";
import { ActivitiesView, HouseChip } from "@/components/cocurricular/Parts";
import { cn } from "@/lib/utils";

type Child = MyActivities["children"][number];

function Ask({ child, club, onClose }: { child: Child; club: Child["openClubs"][number]; onClose: () => void }) {
  const qc = useQueryClient();
  const { showToast } = useToast();
  const [note, setNote] = useState("");
  const send = async () => {
    try {
      await cocurricularApi.requestJoin(club.id, child.id, note.trim() || null);
      qc.invalidateQueries({ queryKey: ["cocurricular", "mine"] });
      showToast("Request sent to the teacher in-charge", "success");
      onClose();
    } catch (e) {
      showToast(errorMessage(e), "error");
    }
  };
  return (
    <Modal isOpen onClose={onClose} title={`Ask to join ${club.name}`} width="max-w-md">
      <div className="space-y-3 text-sm">
        <p>
          For <b>{child.name}</b>. The teacher in-charge accepts or refuses; you are told either way.
        </p>
        <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} maxLength={300} placeholder="Why they would like to join (optional)" className="w-full rounded-xl bg-surface-container-low px-3 py-2 outline-none" aria-label="Note" />
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={send}>Send request</Button>
        </div>
      </div>
    </Modal>
  );
}

function Mine() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  const confirm = useConfirm();
  const q = useQuery({ queryKey: ["cocurricular", "mine"], queryFn: cocurricularApi.mine });
  const [pick, setPick] = useState<string | null>(null);
  const [asking, setAsking] = useState<Child["openClubs"][number] | null>(null);
  if (q.isLoading) return <PageLoader />;
  if (q.error) return <FormAlert>{errorMessage(q.error)}</FormAlert>;
  const d = q.data!;
  if (!d.children.length) return <FormAlert tone="info">No student is linked to your login.</FormAlert>;
  const c = d.children.find((x) => x.id === pick) ?? d.children[0];
  const pending = c.clubs.filter((x) => x.status === "requested" && x.current);
  const cancel = async (memberId: string, club: string) => {
    if (!(await confirm({ title: `Cancel the request for ${club}?`, message: "You can ask again later.", confirmLabel: "Cancel request" }))) return;
    try {
      await cocurricularApi.cancelRequest(memberId);
      qc.invalidateQueries({ queryKey: ["cocurricular", "mine"] });
    } catch (e) {
      showToast(errorMessage(e), "error");
    }
  };
  return (
    <div className="max-w-4xl space-y-4">
      {d.children.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {d.children.map((x) => (
            <button key={x.id} type="button" onClick={() => setPick(x.id)} className={cn("rounded-full border px-4 py-1.5 text-xs font-bold", x.id === c.id ? "border-primary bg-primary text-white" : "border-outline-variant/40 text-on-surface-variant")}>
              {x.name}
            </button>
          ))}
        </div>
      )}

      {d.housesOn && d.standings.length > 0 && (
        <Card className="space-y-2">
          <p className="font-bold">House standings</p>
          <div className="grid gap-2 sm:grid-cols-4">
            {d.standings.map((h) => (
              <div key={h.id} className={cn("rounded-xl px-3 py-2", h.id === c.house?.id ? "ring-2" : "bg-surface-container-low")} style={h.id === c.house?.id ? { boxShadow: `0 0 0 2px ${h.colour}` } : undefined}>
                <HouseChip name={h.name} colour={h.colour} />
                <p className="text-lg font-black">
                  {h.points} <span className="text-xs font-bold text-on-surface-variant">{place(h.rank)}</span>
                </p>
              </div>
            ))}
          </div>
        </Card>
      )}

      <ActivitiesView a={c} family />

      {pending.length > 0 && (
        <Card className="space-y-2">
          <p className="font-bold">Waiting for the teacher</p>
          {pending.map((p) => (
            <div key={p.id} className="flex items-center gap-2 text-sm">
              <span className="flex-1">{p.club}</span>
              <button type="button" onClick={() => cancel(p.id, p.club)} className="text-xs font-bold text-error">
                Cancel request
              </button>
            </div>
          ))}
        </Card>
      )}

      {c.openClubs.length > 0 && (
        <Card className="space-y-2">
          <p className="font-bold">Clubs {c.name.split(" ")[0]} can join</p>
          {c.openClubs.map((x) => (
            <div key={x.id} className="flex flex-wrap items-center gap-3 border-b border-outline-variant/10 py-2 last:border-0">
              <div className="flex-1">
                <p className="text-sm font-bold">{x.name}</p>
                <p className="text-xs text-on-surface-variant">{[x.category, x.meets].filter(Boolean).join(" · ")}</p>
                {x.description && <p className="text-sm">{x.description}</p>}
              </div>
              <Button variant="secondary" onClick={() => setAsking(x)}>
                Ask to join
              </Button>
            </div>
          ))}
        </Card>
      )}

      {c.upcoming.length > 0 && (
        <Card className="space-y-2">
          <p className="font-bold">Coming up</p>
          {c.upcoming.map((u) => (
            <p key={u.id} className="text-sm">
              <b>{u.name}</b> <span className="text-on-surface-variant">· {day(u.date)}{u.venue ? ` · ${u.venue}` : ""}</span>
            </p>
          ))}
        </Card>
      )}

      {asking && <Ask child={c} club={asking} onClose={() => setAsking(null)} />}
    </div>
  );
}

export default function MyActivitiesPage() {
  return (
    <RequirePermission permission="cocurricular.mine">
      <PageHeader title="Activities" description="House, clubs, competitions and achievements. Ask to join a club here." />
      <Mine />
    </RequirePermission>
  );
}
