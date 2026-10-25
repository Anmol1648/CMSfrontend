"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { Pill } from "@/components/forms";
import { authedImageUrl } from "@/lib/api/client";
import { Activities, cocurricularApi, day, MEDAL, place, StudentHit } from "@/lib/api/cocurricular";
import { cn } from "@/lib/utils";

/** Pieces shared by the co-curricular screens. */

export const LABEL = "text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-widest";

/** A house's colour dot and name. */
export function HouseChip({ name, colour, className }: { name: string; colour: string; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs font-bold", className)}>
      <span className="h-2.5 w-2.5 rounded-full ring-1 ring-black/10" style={{ background: colour }} />
      {name}
    </span>
  );
}

/** Search a student (this year, optionally of some classes) and pick one. */
export function StudentSearch({ onPick, classIds = [], placeholder = "Add a student: name or admission no", exclude = [] }: { onPick: (s: StudentHit) => void; classIds?: string[]; placeholder?: string; exclude?: string[] }) {
  const [text, setText] = useState("");
  const [hits, setHits] = useState<StudentHit[] | null>(null);
  const classes = classIds.join(",");
  useEffect(() => {
    const t = text.trim();
    if (t.length < 2) {
      setHits(null);
      return;
    }
    const timer = setTimeout(() => {
      cocurricularApi
        .students(t, classes ? classes.split(",") : [])
        .then(setHits)
        .catch(() => setHits([]));
    }, 250);
    return () => clearTimeout(timer);
  }, [text, classes]);
  const shown = (hits ?? []).filter((h) => !exclude.includes(h.id));
  return (
    <div className="relative">
      <Input value={text} onChange={(e) => setText(e.target.value)} placeholder={placeholder} icon="person_add" />
      {hits && (
        <div className="absolute z-30 mt-1 w-full max-h-60 overflow-y-auto rounded-xl bg-surface-container-lowest shadow-lg">
          {!shown.length && <p className="px-4 py-3 text-sm text-on-surface-variant">No student found.</p>}
          {shown.map((h) => (
            <button
              key={h.id}
              type="button"
              onClick={() => {
                onPick(h);
                setText("");
                setHits(null);
              }}
              className="w-full px-4 py-2.5 text-left hover:bg-surface-container-high"
            >
              <span className="block text-sm font-bold">{h.name}</span>
              <span className="block text-xs text-on-surface-variant/70">
                {h.section} · {h.admissionNo}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** An image from the server (meeting photo, certificate), fetched with the person's login. */
export function ServerImage({ path, alt, className }: { path: string; alt: string; className?: string }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    authedImageUrl(path)
      .then((u) => alive && setUrl(u))
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [path]);
  if (!url) return <div className={cn("animate-pulse rounded-lg bg-surface-container", className)} />;
  return (
    <a href={url} target="_blank" rel="noreferrer">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt={alt} className={cn("rounded-lg object-cover", className)} />
    </a>
  );
}

export const openServerFile = async (path: string) => window.open(await authedImageUrl(path), "_blank", "noopener");

const ROLE: Record<string, string> = { captain: "Captain", vice_captain: "Vice-captain", prefect: "Prefect" };

/** A student's house, clubs, competitions and achievements (profile tab and the family's page). */
export function ActivitiesView({ a, family = false }: { a: Activities; family?: boolean }) {
  const wins = a.competitions.filter((c) => c.position);
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="space-y-1">
          <p className={LABEL}>House</p>
          {a.house ? (
            <>
              <p className="text-xl font-extrabold" style={{ color: a.house.colour }}>
                {a.house.name}
              </p>
              <p className="text-xs text-on-surface-variant">
                {a.house.rank ? `${place(a.house.rank)} of ${a.house.of} · ${a.house.points} points` : ""}
                {a.house.role ? ` · ${ROLE[a.house.role] ?? a.house.role}` : ""}
              </p>
              {a.house.myPoints !== 0 && <p className="text-xs font-bold text-green-700">Won {a.house.myPoints} points for the house this session</p>}
            </>
          ) : (
            <p className="text-sm text-on-surface-variant">No house yet</p>
          )}
        </Card>
        <Card className="space-y-1">
          <p className={LABEL}>Clubs</p>
          <p className="text-xl font-extrabold">{a.clubs.filter((c) => c.current && c.status === "active").length}</p>
          <p className="text-xs text-on-surface-variant">this session</p>
        </Card>
        <Card className="space-y-1">
          <p className={LABEL}>Places won</p>
          <p className="text-xl font-extrabold">{wins.length + a.achievements.length}</p>
          <p className="text-xs text-on-surface-variant">
            {wins.filter((w) => w.position === 1).length} first places · {a.achievements.length} outside the school
          </p>
        </Card>
      </div>

      <Card className="space-y-2">
        <p className="font-bold">Clubs</p>
        {a.clubs.map((c) => (
          <div key={c.id} className="flex flex-wrap items-center gap-2 border-b border-outline-variant/10 py-1.5 text-sm last:border-0">
            <span className="flex-1 font-semibold">
              {c.club}
              {c.role !== "Member" && <span className="font-normal text-on-surface-variant"> · {c.role}</span>}
            </span>
            <span className="text-xs text-on-surface-variant">{c.year}</span>
            {c.status === "requested" && <Pill tone="warning">Asked to join</Pill>}
            {c.status === "left" && <Pill>Left</Pill>}
            {c.grade && <Pill tone="primary">Grade {c.grade}</Pill>}
            {c.remark && <p className="w-full text-xs text-on-surface-variant">{c.remark}</p>}
          </div>
        ))}
        {!a.clubs.length && <p className="text-sm text-on-surface-variant">Not in a club.</p>}
      </Card>

      <Card className="space-y-2">
        <p className="font-bold">Competitions</p>
        {a.competitions.map((c) => (
          <div key={c.id} className="flex flex-wrap items-center gap-2 border-b border-outline-variant/10 py-1.5 text-sm last:border-0">
            <span className="w-6 text-lg">{c.position ? (MEDAL[c.position] ?? "🏅") : ""}</span>
            <span className="flex-1">
              <b>{c.name}</b>
              {c.team ? <span className="text-on-surface-variant"> · {c.team}</span> : null}
              <span className="block text-xs text-on-surface-variant">
                {day(c.date)}
                {c.level ? ` · ${c.level}` : ""}
                {c.category ? ` · ${c.category}` : ""}
              </span>
            </span>
            {c.position ? <Pill tone="success">{place(c.position)}{c.award ? ` · ${c.award}` : ""}</Pill> : c.award ? <Pill tone="primary">{c.award}</Pill> : c.status === "upcoming" ? <Pill tone="primary">Coming up</Pill> : c.status === "cancelled" ? <Pill>Cancelled</Pill> : family && !c.resultsOut ? <Pill>Results soon</Pill> : <Pill>Took part</Pill>}
          </div>
        ))}
        {!a.competitions.length && <p className="text-sm text-on-surface-variant">No competitions yet.</p>}
      </Card>

      <Card className="space-y-2">
        <p className="font-bold">Achievements outside the school</p>
        {a.achievements.map((x) => (
          <div key={x.id} className="flex flex-wrap items-center gap-2 border-b border-outline-variant/10 py-1.5 text-sm last:border-0">
            <span className="w-6 text-lg">🏆</span>
            <span className="flex-1">
              <b>{x.title}</b>
              <span className="block text-xs text-on-surface-variant">
                {day(x.date)}
                {x.level ? ` · ${x.level}` : ""}
                {x.organiser ? ` · ${x.organiser}` : ""}
              </span>
            </span>
            {x.result && <Pill tone="success">{x.result}</Pill>}
            {x.hasCertificate && (
              <button type="button" onClick={() => openServerFile(cocurricularApi.certificatePath(x.id))} className="text-xs font-bold text-primary hover:opacity-70">
                Certificate
              </button>
            )}
          </div>
        ))}
        {!a.achievements.length && <p className="text-sm text-on-surface-variant">None recorded.</p>}
      </Card>
    </div>
  );
}
