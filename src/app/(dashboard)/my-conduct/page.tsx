"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { FormAlert, Pill } from "@/components/forms";
import { PageHeader } from "@/components/layout/AppShell";
import { PageLoader } from "@/components/ui/PageLoader";
import { useToast } from "@/components/ui/ToastProvider";
import { RequirePermission } from "@/lib/auth/RequirePermission";
import { errorMessage } from "@/lib/api/client";
import { disciplineApi, MyConduct, SEVERITY, when } from "@/lib/api/discipline";
import { cn } from "@/lib/utils";

type Item = MyConduct["children"][number]["items"][number];

function Row({ item }: { item: Item }) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [reply, setReply] = useState("");
  const [open, setOpen] = useState(false);
  const ack = async () => {
    try {
      await disciplineApi.acknowledge(item.id, reply.trim() || null);
      queryClient.invalidateQueries({ queryKey: ["discipline", "mine"] });
      showToast("Thank you: the school sees you have read it", "success");
      setOpen(false);
    } catch (err) {
      showToast(errorMessage(err), "error");
    }
  };
  return (
    <li className={cn("rounded-xl px-4 py-3", item.positive ? "bg-green-50" : "bg-surface-container-low")}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="flex-1 font-bold text-sm">
          {item.positive ? "🌟 " : ""}
          {item.title}
        </span>
        {!item.positive && <Pill tone={SEVERITY[item.severity].tone}>{SEVERITY[item.severity].label}</Pill>}
        {item.points !== 0 && <span className={cn("text-xs font-bold", item.points < 0 ? "text-error" : "text-green-700")}>{item.points > 0 ? `+${item.points}` : item.points}</span>}
      </div>
      <p className="text-xs text-on-surface-variant/70">
        {when(item.occurredAt)} · {item.type}
        {item.place ? ` · ${item.place}` : ""}
        {item.role !== "Involved" ? ` · ${item.role}` : ""}
      </p>
      {item.details && <p className="text-sm mt-1">{item.details}</p>}
      {item.actions.length > 0 && <p className="text-xs mt-1">Action: {item.actions.join(", ")}</p>}
      {!item.positive &&
        (item.acknowledgedAt ? (
          <p className="text-xs text-green-700 mt-1">
            ✓ You acknowledged on {when(item.acknowledgedAt)}
            {item.parentReply ? `: “${item.parentReply}”` : ""}
          </p>
        ) : open ? (
          <div className="mt-2 space-y-2">
            <textarea value={reply} onChange={(e) => setReply(e.target.value)} rows={2} maxLength={1000} placeholder="A reply to the school (optional)" className="w-full rounded-xl bg-white px-3 py-2 text-sm outline-none" aria-label="Reply" />
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setOpen(false)}>
                Back
              </Button>
              <Button onClick={ack}>I have read this</Button>
            </div>
          </div>
        ) : (
          <div className="mt-2">
            <Button variant="tertiary" onClick={() => setOpen(true)}>
              Acknowledge
            </Button>
          </div>
        ))}
    </li>
  );
}

function Mine() {
  const q = useQuery({ queryKey: ["discipline", "mine"], queryFn: disciplineApi.mine });
  const [pick, setPick] = useState<string | null>(null);
  if (q.isLoading) return <PageLoader />;
  if (q.error) return <FormAlert>{errorMessage(q.error)}</FormAlert>;
  const d = q.data!;
  if (!d.visible) return <FormAlert tone="info">The school shares conduct notes in person.</FormAlert>;
  if (!d.children.length) return <FormAlert tone="info">No student is linked to your login.</FormAlert>;
  const c = d.children.find((x) => x.id === pick) ?? d.children[0];
  return (
    <div className="space-y-4 max-w-3xl">
      {d.children.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {d.children.map((x) => (
            <button key={x.id} type="button" onClick={() => setPick(x.id)} className={cn("rounded-full px-4 py-1.5 text-xs font-bold border", x.id === c.id ? "bg-primary text-white border-primary" : "border-outline-variant/40 text-on-surface-variant")}>
              {x.name}
            </button>
          ))}
        </div>
      )}
      <Card>
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-lg font-extrabold flex-1">{c.name}</p>
          {d.points && <Pill tone={c.points < 0 ? "danger" : "success"}>{c.points} conduct points</Pill>}
          <Pill tone="success">{c.items.filter((i) => i.positive).length} positive notes</Pill>
        </div>
        <ul className="mt-4 space-y-2">
          {c.items.map((i) => (
            <Row key={i.id} item={i} />
          ))}
          {!c.items.length && <li className="text-sm text-on-surface-variant">Nothing recorded this session. 👍</li>}
        </ul>
      </Card>
    </div>
  );
}

export default function MyConductPage() {
  return (
    <RequirePermission permission="discipline.mine">
      <PageHeader title="Conduct" description="Conduct notes and praise from the school this session. Acknowledge a note to tell the school you have read it." />
      <Mine />
    </RequirePermission>
  );
}
