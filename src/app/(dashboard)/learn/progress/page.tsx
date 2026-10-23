"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { FormAlert, Pill, Select } from "@/components/forms";
import { PageHeader } from "@/components/layout/AppShell";
import { PageLoader } from "@/components/ui/PageLoader";
import { ChatBubbles } from "@/components/learn/ChatBubbles";
import { ProgressView } from "@/components/learn/ProgressView";
import { RequirePermission } from "@/lib/auth/RequirePermission";
import { errorMessage } from "@/lib/api/client";
import { learnApi } from "@/lib/api/learn";
import { cn } from "@/lib/utils";

function ChatModal({ id, onClose }: { id: string; onClose: () => void }) {
  const q = useQuery({ queryKey: ["learn-view-chat", id], queryFn: () => learnApi.viewChat(id) });
  return (
    <Modal isOpen onClose={onClose} title={q.data?.title ?? "Conversation"} width="max-w-2xl">
      {q.isError ? <FormAlert>{errorMessage(q.error)}</FormAlert> : q.data ? <div className="max-h-[65vh] overflow-y-auto"><ChatBubbles chat={q.data} /></div> : <PageLoader />}
    </Modal>
  );
}

function Student({ id, onBack }: { id: string; onBack?: () => void }) {
  const q = useQuery({ queryKey: ["learn-student", id], queryFn: () => learnApi.student(id) });
  const [chat, setChat] = useState<string | null>(null);
  if (q.isError) return <FormAlert>{errorMessage(q.error)}</FormAlert>;
  if (!q.data) return <PageLoader />;
  return (
    <div className="space-y-4">
      {onBack && (
        <button type="button" onClick={onBack} className="text-sm font-bold text-primary flex items-center gap-1">
          <span className="material-symbols-outlined text-base">arrow_back</span> The section
        </button>
      )}
      <p className="font-extrabold text-primary text-lg">{q.data.student}</p>
      {!!q.data.flagged && <FormAlert tone="warning">{q.data.flagged} conversation(s) had questions the tutor refused (off-topic or unsafe). Open them below.</FormAlert>}
      <ProgressView p={q.data} onOpenChat={setChat} />
      {chat && <ChatModal id={chat} onClose={() => setChat(null)} />}
    </div>
  );
}

function Progress() {
  const choices = useQuery({ queryKey: ["learn-choices"], queryFn: learnApi.choices });
  const [section, setSection] = useState("");
  const [child, setChild] = useState("");
  const [student, setStudent] = useState<string | null>(null);
  const c = choices.data;
  useEffect(() => {
    if (c?.sections.length && !section) setSection(c.sections[0].id);
    if (c?.children.length && !child) setChild(c.children[0].id);
  }, [c, section, child]);
  const rows = useQuery({ queryKey: ["learn-section", section], queryFn: () => learnApi.section(section), enabled: !!section && !student });
  if (!c) return <PageLoader />;
  if (c.children.length)
    return (
      <div className="space-y-4">
        {c.children.length > 1 && (
          <div className="flex flex-wrap gap-2">
            {c.children.map((k) => (
              <button key={k.id} type="button" onClick={() => setChild(k.id)} className={cn("rounded-full px-4 py-1.5 text-sm font-bold border", k.id === child ? "bg-primary text-white border-primary" : "border-outline-variant/40 text-on-surface-variant")}>
                {k.name}
              </button>
            ))}
          </div>
        )}
        {child && <Student key={child} id={child} />}
      </div>
    );
  if (!c.sections.length) return <FormAlert tone="info">No sections to show.</FormAlert>;
  if (student) return <Student id={student} onBack={() => setStudent(null)} />;
  return (
    <div className="space-y-4">
      <Card className="flex flex-wrap items-end gap-3">
        <Select label="Section" value={section} onChange={setSection} className="w-full sm:w-48" options={c.sections.map((s) => ({ value: s.id, label: s.label }))} />
      </Card>
      {rows.isError && <FormAlert>{errorMessage(rows.error)}</FormAlert>}
      {!rows.data && !rows.isError && <PageLoader />}
      {rows.data && (
        <Card padding="none" className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-widest text-on-surface-variant/60 border-b border-outline-variant/20">
                  <th className="px-4 py-3 font-bold">Roll</th>
                  <th className="px-4 py-3 font-bold">Student</th>
                  <th className="px-4 py-3 font-bold">Practice quizzes</th>
                  <th className="px-4 py-3 font-bold">Average</th>
                  <th className="px-4 py-3 font-bold">Tutor chats (30 days)</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {rows.data.map((s) => (
                  <tr key={s.id} className="border-t border-outline-variant/10">
                    <td className="px-4 py-2 text-xs">{s.roll ?? "—"}</td>
                    <td className="px-4 py-2">
                      <p className="font-semibold">{s.name}</p>
                      <p className="text-[10px] text-on-surface-variant/60">{s.admissionNo}</p>
                    </td>
                    <td className="px-4 py-2 text-xs">{s.quizzes}</td>
                    <td className={cn("px-4 py-2 font-bold", s.percent !== null && s.percent < 60 ? "text-error" : "text-emerald-700")}>{s.percent === null ? "—" : `${s.percent}%`}</td>
                    <td className="px-4 py-2 text-xs">
                      {s.chats30}
                      {!!s.flagged && <Pill tone="danger">{s.flagged} flagged</Pill>}
                    </td>
                    <td className="px-4 py-2 text-right">
                      <Button variant="secondary" onClick={() => setStudent(s.id)}>
                        See
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

export default function LearnProgressPage() {
  return (
    <RequirePermission permission="learn.view">
      <PageHeader title="AI Learning Progress" description="How students use the AI tutor and practice quizzes: scores by chapter, chapters to revise, and their conversations." />
      <Progress />
    </RequirePermission>
  );
}
