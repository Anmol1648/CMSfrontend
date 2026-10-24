"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Checkbox, FormAlert, Pill } from "@/components/forms";
import { MasterSelect } from "@/components/masters/MasterSelect";
import { PageHeader } from "@/components/layout/AppShell";
import { FindMember } from "@/components/library/FindMember";
import { CameraScan } from "@/components/library/CameraScan";
import { useToast } from "@/components/ui/ToastProvider";
import { useConfirm } from "@/components/ui/ConfirmProvider";
import { RequirePermission } from "@/lib/auth/RequirePermission";
import { useAuth } from "@/lib/auth/AuthProvider";
import { ApiError, errorMessage } from "@/lib/api/client";
import { libraryApi, Member, MemberHit, rupees, showDate } from "@/lib/api/library";
import { cn } from "@/lib/utils";

const label = "text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-widest";

function Stats() {
  const q = useQuery({ queryKey: ["library", "summary"], queryFn: libraryApi.summary, refetchInterval: 60_000 });
  const s = q.data;
  const items: [string, number | undefined, string?, string?][] = [
    ["Books out", s?.out, undefined, "/library/loans"],
    ["Overdue", s?.overdue, s?.overdue ? "text-error" : undefined, "/library/loans?show=overdue"],
    ["Due today", s?.dueToday, undefined, "/library/loans?show=due_today"],
    ["Issued today", s?.issuedToday],
    ["Returned today", s?.returnedToday],
    ["Reserved, waiting", s?.ready, undefined, "/library/reservations"],
  ];
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {items.map(([t, v, cls, href]) => {
        const body = (
          <>
            <p className={label}>{t}</p>
            <p className={cn("text-2xl font-extrabold text-on-surface mt-1", cls)}>{v ?? "—"}</p>
          </>
        );
        return href ? (
          <Link key={t} href={href} className="rounded-2xl bg-surface-container-lowest p-4 shadow-sm hover:shadow-md">
            {body}
          </Link>
        ) : (
          <div key={t} className="rounded-2xl bg-surface-container-lowest p-4 shadow-sm">
            {body}
          </div>
        );
      })}
    </div>
  );
}

function MemberPanel({ member, onChange, onClear }: { member: Member; onChange: (m: Member) => void; onClear: () => void }) {
  const { can } = useAuth();
  const { showToast } = useToast();
  const confirm = useConfirm();
  const queryClient = useQueryClient();
  const [accession, setAccession] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [last, setLast] = useState<string | null>(null);
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    ref.current?.focus();
  }, [member.id]);
  const reload = async () => onChange(await libraryApi.member(member.kind, member.id));
  const issue = async (override = false, scanned?: string) => {
    const acc = (scanned ?? accession).trim();
    if (!acc) return;
    setError(null);
    try {
      const r = await libraryApi.issue({ memberKind: member.kind, memberId: member.id, accessionNo: acc, override });
      onChange(r.member);
      setLast(`${r.title} (${r.accessionNo}) — due ${showDate(r.dueOn)}`);
      setAccession("");
      queryClient.invalidateQueries({ queryKey: ["library"] });
      ref.current?.focus();
    } catch (err) {
      const fields = err instanceof ApiError ? err.fieldErrors() : {};
      if (fields.override && !override) {
        if (await confirm({ title: "Lend anyway?", message: errorMessage(err), confirmLabel: "Lend anyway" })) return issue(true, acc);
        return;
      }
      setError(errorMessage(err));
    }
  };
  const act = async (fn: () => Promise<unknown>, done: string) => {
    try {
      await fn();
      showToast(done, "success");
      await reload();
      queryClient.invalidateQueries({ queryKey: ["library"] });
    } catch (err) {
      showToast(errorMessage(err), "error");
    }
  };
  const full = member.loans.length >= member.limits.books;
  return (
    <div className="space-y-4">
      <Card>
        <div className="flex items-start gap-4">
          <span className="material-symbols-outlined rounded-2xl bg-primary/10 p-3 text-primary text-3xl">{member.kind === "staff" ? "badge" : "school"}</span>
          <div className="flex-1 min-w-0">
            <p className="text-lg font-extrabold text-on-surface">{member.name}</p>
            <p className="text-sm text-on-surface-variant">
              {member.code} · {member.detail}
            </p>
            <p className="text-xs text-on-surface-variant/70 mt-1">
              {member.limits.type}: up to {member.limits.books} book{member.limits.books === 1 ? "" : "s"} for {member.limits.days} days, renew {member.limits.renewals}×
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {!member.active && <Pill tone="danger">Not active</Pill>}
              <Pill tone={full ? "warning" : "success"}>
                {member.loans.length} of {member.limits.books} books
              </Pill>
              {member.loans.some((l) => l.overdue) && <Pill tone="danger">Has an overdue book</Pill>}
              {member.fines.total > 0 && <Pill tone="warning">Owes {rupees(member.fines.total)}{member.fines.fees ? ` (${rupees(member.fines.fees)} in fees)` : ""}</Pill>}
            </div>
          </div>
          <button type="button" onClick={onClear} className="text-xs font-bold text-primary">
            Another member
          </button>
        </div>
        <div className="mt-5 flex items-end gap-3">
          <Input ref={ref} label="Book: scan or type its accession number" value={accession} onChange={(e) => setAccession(e.target.value)} onKeyDown={(e) => e.key === "Enter" && void issue()} icon="qr_code_scanner" placeholder="LIB-00012" />
          <CameraScan onScan={(code) => void issue(false, code)} label="Scan the book with the camera" />
          <Button onClick={() => issue()} disabled={!accession.trim()}>
            Issue
          </Button>
        </div>
        {error && (
          <div className="mt-3">
            <FormAlert>{error}</FormAlert>
          </div>
        )}
        {last && (
          <div className="mt-3">
            <FormAlert tone="success">Issued: {last}</FormAlert>
          </div>
        )}
      </Card>
      <Card>
        <p className={label}>Books they have</p>
        {!member.loans.length && <p className="mt-2 text-sm text-on-surface-variant">None.</p>}
        <ul className="mt-2 space-y-2">
          {member.loans.map((l) => (
            <li key={l.id} className="flex flex-wrap items-center gap-3 rounded-xl bg-surface-container-low px-4 py-2.5">
              <div className="flex-1 min-w-[12rem]">
                <p className="text-sm font-bold">{l.title}</p>
                <p className="text-xs text-on-surface-variant/70">
                  {l.accessionNo} · issued {showDate(l.issuedOn)} · due {showDate(l.dueOn)}
                  {l.renewals ? ` · renewed ${l.renewals}×` : ""}
                </p>
              </div>
              {l.overdue && <Pill tone="danger">Overdue</Pill>}
              <Button variant="tertiary" onClick={() => act(() => libraryApi.returnBook({ accessionNo: l.accessionNo }), `${l.title} returned`)}>
                Return
              </Button>
              <Button variant="tertiary" onClick={() => act(() => libraryApi.renew(l.id), "Renewed")}>
                Renew
              </Button>
              {can("library.fines") && (
                <Button
                  variant="tertiary"
                  onClick={async () => {
                    if (await confirm({ title: `Mark “${l.title}” lost?`, message: "The member is charged for it (System Settings → Library), plus any late fine.", confirmLabel: "Mark lost", danger: true })) await act(() => libraryApi.lost(l.id), "Marked lost and charged");
                  }}
                >
                  Lost
                </Button>
              )}
            </li>
          ))}
        </ul>
        {member.reservations.length > 0 && (
          <>
            <p className={cn(label, "mt-5")}>Reserved</p>
            <ul className="mt-2 space-y-1 text-sm">
              {member.reservations.map((r) => (
                <li key={r.id} className="flex items-center gap-2">
                  {r.title} {r.status === "ready" ? <Pill tone="success">Ready till {showDate(r.holdUntil)}</Pill> : <Pill>Waiting</Pill>}
                </li>
              ))}
            </ul>
          </>
        )}
      </Card>
    </div>
  );
}

function ReturnDesk() {
  const { can } = useAuth();
  const queryClient = useQueryClient();
  const [accession, setAccession] = useState("");
  const [conditionId, setConditionId] = useState("");
  const [waive, setWaive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ text: string; tone: "success" | "warning" }[]>([]);
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    ref.current?.focus();
  }, []);
  const back = async (scanned?: string) => {
    const acc = (scanned ?? accession).trim();
    if (!acc) return;
    setError(null);
    try {
      const r = await libraryApi.returnBook({ accessionNo: acc, conditionId: conditionId || null, waiveLate: waive });
      const lines: { text: string; tone: "success" | "warning" }[] = [{ text: `${r.title} (${r.accessionNo}) returned by ${r.member.name}`, tone: "success" }];
      if (r.lateDays) lines.push({ text: r.lateFine ? `${r.lateDays} days late: fine ${rupees(r.lateFine)} charged` : `${r.lateDays} days late: fine waived`, tone: "warning" });
      for (const f of r.fines.filter((x) => x.kind === "damaged")) lines.push({ text: `Damaged: ${rupees(f.amount)} charged`, tone: "warning" });
      if (r.heldFor) lines.push({ text: `Keep it aside: reserved for ${r.heldFor.member} (till ${showDate(r.heldFor.until)}); they were told`, tone: "warning" });
      setDone(lines);
      setAccession("");
      setConditionId("");
      setWaive(false);
      queryClient.invalidateQueries({ queryKey: ["library"] });
      ref.current?.focus();
    } catch (err) {
      setError(errorMessage(err));
    }
  };
  return (
    <Card>
      <div className="grid gap-4 sm:grid-cols-[1fr_220px_auto] items-end">
        <Input ref={ref} label="Book: scan or type its accession number" value={accession} onChange={(e) => setAccession(e.target.value)} onKeyDown={(e) => e.key === "Enter" && void back()} icon="qr_code_scanner" placeholder="LIB-00012" />
        <MasterSelect master="book_condition" label="Condition now (if changed)" value={conditionId} onChange={(id) => setConditionId(id)} />
        <div className="flex gap-2">
          <CameraScan onScan={(code) => void back(code)} label="Scan the book with the camera" />
          <Button onClick={() => back()} disabled={!accession.trim()}>
            Return
          </Button>
        </div>
      </div>
      {can("library.fines") && (
        <div className="mt-3">
          <Checkbox checked={waive} onChange={setWaive} label="Don’t charge the late fine for this one" />
        </div>
      )}
      {error && (
        <div className="mt-3">
          <FormAlert>{error}</FormAlert>
        </div>
      )}
      <div className="mt-3 space-y-2">
        {done.map((d, i) => (
          <FormAlert key={i} tone={d.tone}>
            {d.text}
          </FormAlert>
        ))}
      </div>
    </Card>
  );
}

function Counter() {
  const [tab, setTab] = useState<"issue" | "return">("issue");
  const [member, setMember] = useState<Member | null>(null);
  const { showToast } = useToast();
  const pick = async (m: MemberHit) => {
    try {
      setMember(await libraryApi.member(m.kind, m.id));
    } catch (err) {
      showToast(errorMessage(err), "error");
    }
  };
  return (
    <div className="space-y-5">
      <Stats />
      <div className="flex gap-2">
        {(["issue", "return"] as const).map((t) => (
          <button key={t} type="button" onClick={() => setTab(t)} className={cn("rounded-full px-5 py-2 text-sm font-bold", tab === t ? "bg-primary text-white" : "bg-surface-container-high text-on-surface-variant")}>
            {t === "issue" ? "Issue (and the member’s books)" : "Return a book"}
          </button>
        ))}
      </div>
      {tab === "issue" ? member ? <MemberPanel member={member} onChange={setMember} onClear={() => setMember(null)} /> : <Card><FindMember onPick={pick} /></Card> : <ReturnDesk />}
    </div>
  );
}

export default function LibraryCounterPage() {
  return (
    <RequirePermission permission="library.issue">
      <PageHeader title="Issue & Return" description="Scan the member’s card and the book to lend it; scan a book to take it back. Late fines are worked out for you." />
      <Counter />
    </RequirePermission>
  );
}
