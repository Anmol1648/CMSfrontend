"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/Card";
import { TextArea } from "@/components/ui/TextArea";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Tabs } from "@/components/ui/Tabs";
import { FormAlert, Pill } from "@/components/forms";
import { PageHeader } from "@/components/layout/AppShell";
import { PageLoader } from "@/components/ui/PageLoader";
import { FileLinks, FilePicker } from "@/components/homework/HomeworkFiles";
import { useToast } from "@/components/ui/ToastProvider";
import { RequirePermission } from "@/lib/auth/RequirePermission";
import { errorMessage } from "@/lib/api/client";
import { homeworkApi, MyHomework, MyHomeworkItem, showDate, STATUS_LABEL, STATUS_TONE } from "@/lib/api/homework";
import { cn } from "@/lib/utils";

const today = () => new Date(Date.now() + 5.5 * 3_600_000).toISOString().slice(0, 10);
const handedIn = (h: MyHomeworkItem) => ["submitted", "late", "checked", "done"].includes(h.status);

function HomeworkModal({ child, h, onClose }: { child: MyHomework; h: MyHomeworkItem; onClose: () => void }) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [answer, setAnswer] = useState(h.answer ?? "");
  const [files, setFiles] = useState<{ id: string; name: string }[]>(h.files);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      queryClient.setQueryData(["my-homework"], await homeworkApi.submit(h.id, { student: child.student.id, answer: answer || null, fileIds: files.map((f) => f.id) }));
      showToast("Handed in", "success");
      onClose();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal isOpen onClose={onClose} title={h.title} width="max-w-2xl">
      <div className="space-y-4 text-sm">
        <p className="text-on-surface-variant/80">
          {h.subject}
          {h.type ? ` · ${h.type}` : ""}
          {h.by ? ` · ${h.by}` : ""} · given {showDate(h.givenOn)} · due <b>{showDate(h.dueOn)}</b>
        </p>
        {h.details && <p className="whitespace-pre-line">{h.details}</p>}
        <FileLinks homeworkId={h.id} files={h.attachments} />
        <div className="flex flex-wrap items-center gap-2">
          <Pill tone={STATUS_TONE[h.status]}>{STATUS_LABEL[h.status]}</Pill>
          {h.grade && <Pill tone="success">{h.grade}</Pill>}
          {h.remark && <span className="text-on-surface-variant">“{h.remark}”</span>}
        </div>
        {h.mode === "class" && <FormAlert tone="info">This homework is checked in class; nothing to hand in here.</FormAlert>}
        {h.mode === "online" && (h.status === "submitted" || h.status === "late" || h.status === "checked") && (
          <div className="rounded-xl bg-surface-container-low p-3 space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60">Handed in{h.submittedAt ? ` ${new Date(h.submittedAt).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}` : ""}</p>
            {h.answer && <p className="whitespace-pre-line">{h.answer}</p>}
            <FileLinks homeworkId={h.id} files={h.files} />
          </div>
        )}
        {h.open && child.canSubmit && (
          <div className="space-y-3 border-t border-outline-variant/15 pt-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60">{h.status === "pending" ? "Hand it in" : h.status === "redo" ? "Do it again and hand it in" : "Change what you handed in"}</p>
            {h.late && <FormAlert tone="warning">The due date has passed: it will be marked late.</FormAlert>}
            <TextArea label="Your answer (optional)" rows={4} value={answer} onChange={(e) => setAnswer(e.target.value)} />
            <FilePicker files={files} onChange={setFiles} label="Attach a photo or PDF" />
            {error && <FormAlert>{error}</FormAlert>}
            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={onClose}>
                Close
              </Button>
              <Button onClick={submit} disabled={busy || (!answer.trim() && !files.length)}>
                Hand in
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

function Child({ child }: { child: MyHomework }) {
  const [tab, setTab] = useState("due");
  const [open, setOpen] = useState<MyHomeworkItem | null>(null);
  const t = today();
  const lists: Record<string, MyHomeworkItem[]> = {
    due: child.homework.filter((h) => h.dueOn >= t && !handedIn(h)),
    overdue: child.homework.filter((h) => h.dueOn < t && (h.status === "pending" || h.status === "redo" || h.status === "not_done")),
    done: child.homework.filter((h) => handedIn(h)),
    all: [...child.homework].sort((a, b) => b.dueOn.localeCompare(a.dueOn)),
  };
  const list = lists[tab];
  return (
    <div className="space-y-4">
      <Tabs
        tabs={[
          { id: "due", label: `To do (${lists.due.length})` },
          { id: "overdue", label: `Missed (${lists.overdue.length})` },
          { id: "done", label: `Done (${lists.done.length})` },
          { id: "all", label: "All" },
        ]}
        activeTab={tab}
        onChange={setTab}
      />
      <div className="grid gap-3 md:grid-cols-2">
        {list.map((h) => (
          <button key={h.id} type="button" onClick={() => setOpen(h)} className="text-left">
            <Card className={cn("h-full space-y-1.5 hover:shadow-premium transition-shadow", h.dueOn === t && !handedIn(h) && "ring-2 ring-amber-400/60")}>
              <div className="flex items-start justify-between gap-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-primary">{h.subject}</p>
                <Pill tone={STATUS_TONE[h.status]}>{STATUS_LABEL[h.status]}</Pill>
              </div>
              <p className="font-bold">{h.title}</p>
              <p className="text-xs text-on-surface-variant/70">
                Due {h.dueOn === t ? <b className="text-amber-700">today</b> : showDate(h.dueOn)}
                {h.mode === "class" ? " · checked in class" : ""}
                {h.grade ? ` · ${h.grade}` : ""}
              </p>
            </Card>
          </button>
        ))}
      </div>
      {!list.length && <Card className="text-center text-sm text-on-surface-variant/70">{tab === "due" ? "Nothing to do. ✓" : tab === "overdue" ? "Nothing missed. ✓" : "Nothing here."}</Card>}
      {open && <HomeworkModal child={child} h={open} onClose={() => setOpen(null)} />}
    </div>
  );
}

function Mine() {
  const q = useQuery({ queryKey: ["my-homework"], queryFn: homeworkApi.mine });
  const [who, setWho] = useState(0);
  if (q.isError) return <FormAlert>{errorMessage(q.error)}</FormAlert>;
  if (!q.data) return <PageLoader />;
  if (!q.data.length) return <Card className="text-center text-sm text-on-surface-variant/70">No student found for your login this session.</Card>;
  const child = q.data[Math.min(who, q.data.length - 1)];
  return (
    <div className="space-y-4">
      {q.data.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {q.data.map((c, i) => (
            <button key={c.student.id} type="button" onClick={() => setWho(i)} className={cn("rounded-full px-4 py-1.5 text-sm font-bold border", i === who ? "bg-primary text-white border-primary" : "border-outline-variant/40 text-on-surface-variant")}>
              {c.student.name} · {c.student.section}
            </button>
          ))}
        </div>
      )}
      {q.data.length === 1 && (
        <p className="text-sm text-on-surface-variant/80">
          {child.student.name} · {child.student.section}
        </p>
      )}
      <Child key={child.student.id} child={child} />
    </div>
  );
}

export default function MyHomeworkPage() {
  return (
    <RequirePermission permission="homework.mine">
      <PageHeader title="My Homework" description="Homework given, what is due, what was handed in and the teacher’s remarks." />
      <Mine />
    </RequirePermission>
  );
}
