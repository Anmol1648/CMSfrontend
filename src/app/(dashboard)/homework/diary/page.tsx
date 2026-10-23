"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { FormAlert, Pill, Select } from "@/components/forms";
import { PageHeader } from "@/components/layout/AppShell";
import { PageLoader } from "@/components/ui/PageLoader";
import { RequirePermission } from "@/lib/auth/RequirePermission";
import { errorMessage } from "@/lib/api/client";
import { DiaryItem, homeworkApi, showDate } from "@/lib/api/homework";

const today = () => new Date(Date.now() + 5.5 * 3_600_000).toISOString().slice(0, 10);

function Items({ title, items, empty }: { title: string; items: DiaryItem[]; empty: string }) {
  return (
    <Card padding="none" className="overflow-hidden">
      <h3 className="px-5 pt-4 text-sm font-black uppercase tracking-widest text-primary">
        {title} <span className="text-on-surface-variant/60">({items.length})</span>
      </h3>
      <div className="mt-2">
        {items.map((h) => (
          <Link key={h.id} href={`/homework?open=${h.id}`} className="block px-5 py-3 border-t border-outline-variant/10 hover:bg-surface-container-low">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-primary">{h.subject}</span>
              {h.type && <Pill>{h.type}</Pill>}
              <span className="text-[11px] text-on-surface-variant/60">{h.by}</span>
            </div>
            <p className="font-semibold mt-0.5">{h.title}</p>
            <p className="text-xs text-on-surface-variant/70">
              Given {showDate(h.givenOn)} · due {showDate(h.dueOn)} · {h.mode === "online" ? `${h.handedIn}/${h.students} handed in` : "checked in class"}
            </p>
          </Link>
        ))}
        {!items.length && <p className="px-5 py-6 text-sm text-on-surface-variant/70 border-t border-outline-variant/10">{empty}</p>}
      </div>
    </Card>
  );
}

function Diary() {
  const sections = useQuery({ queryKey: ["homework-diary-sections"], queryFn: homeworkApi.diarySections });
  const [section, setSection] = useState("");
  const [date, setDate] = useState(today());
  useEffect(() => {
    if (!section && sections.data?.length) setSection(sections.data[0].id);
  }, [sections.data, section]);
  const q = useQuery({ queryKey: ["homework-diary", section, date], queryFn: () => homeworkApi.diary(section, date), enabled: !!section });
  if (!sections.data) return <PageLoader />;
  if (!sections.data.length) return <FormAlert tone="info">You see the diary of the sections you teach or are class teacher of; none this session.</FormAlert>;
  return (
    <div className="space-y-4">
      <Card className="flex flex-wrap items-end gap-3">
        <Select label="Section" value={section} onChange={setSection} className="w-full sm:w-48" options={sections.data.map((s) => ({ value: s.id, label: `${s.label}${s.mine ? " (my class)" : ""}` }))} />
        <Input label="Day" type="date" value={date} onChange={(e) => setDate(e.target.value || today())} className="sm:w-44" />
      </Card>
      {q.isError && <FormAlert>{errorMessage(q.error)}</FormAlert>}
      {section && !q.data && !q.isError && <PageLoader />}
      {q.data && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Items title={`Given on ${showDate(q.data.date)}`} items={q.data.given} empty="No homework given this day." />
          <Items title={`Due on ${showDate(q.data.date)}`} items={q.data.due} empty="Nothing due this day." />
        </div>
      )}
    </div>
  );
}

export default function HomeworkDiaryPage() {
  return (
    <RequirePermission permission="homework.view">
      <PageHeader title="Homework Diary" description="A section’s day: every subject’s homework given and due, so the load can be seen at a glance." />
      <Diary />
    </RequirePermission>
  );
}
