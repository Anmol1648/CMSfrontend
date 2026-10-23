"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { FormAlert, Pill } from "@/components/forms";
import { PageHeader } from "@/components/layout/AppShell";
import { PageLoader } from "@/components/ui/PageLoader";
import { useConfirm } from "@/components/ui/ConfirmProvider";
import { RequirePermission } from "@/lib/auth/RequirePermission";
import { errorMessage } from "@/lib/api/client";
import { MyTestItem, STATE, testsApi, when } from "@/lib/api/tests";
import { cn } from "@/lib/utils";

function TestCard({ t, studentId, self }: { t: MyTestItem; studentId: string; self: boolean }) {
  const router = useRouter();
  const confirm = useConfirm();
  const start = async () => {
    if (!(await confirm({ title: `Start “${t.title}”?`, message: `You get ${t.durationMin} minutes once you start (until ${when(t.endsAt)} at the latest). It can be taken only once.`, confirmLabel: "Start" }))) return;
    router.push(`/my-tests/${t.id}`);
  };
  const done = t.attempt && t.attempt.status !== "in_progress";
  return (
    <Card className={cn("space-y-2", t.canStart && "ring-2 ring-primary/40")}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-[10px] font-black uppercase tracking-widest text-primary">{t.subject}</p>
        <Pill tone={done ? "success" : STATE[t.state].tone}>{done ? (t.result ? "Result out" : "Submitted") : STATE[t.state].label}</Pill>
      </div>
      <p className="font-bold">{t.title}</p>
      <p className="text-xs text-on-surface-variant/70">
        {t.questions} questions · {t.totalMarks} marks · {t.durationMin} min · {when(t.startsAt)} – {when(t.endsAt)}
      </p>
      {t.result && (
        <p className="text-sm">
          Score: <b className="text-primary">{t.result.score} / {t.result.totalMarks}</b>
        </p>
      )}
      <div className="flex flex-wrap gap-2 pt-1">
        {t.canStart && <Button onClick={start}>Start the test</Button>}
        {t.canContinue && <Button onClick={() => router.push(`/my-tests/${t.id}`)}>Continue</Button>}
        {done && (
          <Link href={`/my-tests/${t.id}?result=1&student=${studentId}`}>
            <Button variant="secondary">{t.result ? "See the answers" : "See"}</Button>
          </Link>
        )}
        {!self && !done && t.state === "open" && <p className="text-xs text-on-surface-variant/70">The student takes it from their own login.</p>}
        {!t.attempt && t.state === "closed" && <p className="text-xs text-error">Not taken.</p>}
      </div>
    </Card>
  );
}

function Mine() {
  const q = useQuery({ queryKey: ["my-tests"], queryFn: testsApi.mine, refetchInterval: 60_000 });
  const [who, setWho] = useState(0);
  if (q.isError) return <FormAlert>{errorMessage(q.error)}</FormAlert>;
  if (!q.data) return <PageLoader />;
  if (!q.data.length) return <Card className="text-center text-sm text-on-surface-variant/70">No student found for your login this session.</Card>;
  const c = q.data[Math.min(who, q.data.length - 1)];
  const now = c.tests.filter((t) => t.state === "open" || t.state === "upcoming");
  const past = c.tests.filter((t) => !(t.state === "open" || t.state === "upcoming"));
  return (
    <div className="space-y-4">
      {q.data.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {q.data.map((x, i) => (
            <button key={x.student.id} type="button" onClick={() => setWho(i)} className={cn("rounded-full px-4 py-1.5 text-sm font-bold border", i === who ? "bg-primary text-white border-primary" : "border-outline-variant/40 text-on-surface-variant")}>
              {x.student.name} · {x.student.section}
            </button>
          ))}
        </div>
      )}
      <h3 className="text-sm font-black uppercase tracking-widest text-primary">Open and coming</h3>
      <div className="grid gap-3 md:grid-cols-2">
        {now.map((t) => (
          <TestCard key={t.id} t={t} studentId={c.student.id} self={c.student.self} />
        ))}
      </div>
      {!now.length && <Card className="text-center text-sm text-on-surface-variant/70">No test open or coming.</Card>}
      <h3 className="text-sm font-black uppercase tracking-widest text-primary pt-2">Earlier</h3>
      <div className="grid gap-3 md:grid-cols-2">
        {past.map((t) => (
          <TestCard key={t.id} t={t} studentId={c.student.id} self={c.student.self} />
        ))}
      </div>
      {!past.length && <Card className="text-center text-sm text-on-surface-variant/70">None yet.</Card>}
    </div>
  );
}

export default function MyTestsPage() {
  return (
    <RequirePermission permission="test.take">
      <PageHeader title="My Tests" description="Online tests: start one when it opens, and see the answers when the results are out." />
      <Mine />
    </RequirePermission>
  );
}
