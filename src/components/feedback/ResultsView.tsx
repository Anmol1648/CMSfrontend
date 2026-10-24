"use client";

import { Pill } from "@/components/forms";
import { Results, TeacherResult } from "@/lib/api/feedback";
import { cn } from "@/lib/utils";

const label = "text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-widest";

/** A bar for a score out of the scale, with the school average marked. */
export function ScoreBar({ value, school, scale }: { value: number | null; school?: number | null; scale: number }) {
  const pct = value !== null ? (value / scale) * 100 : 0;
  return (
    <div className="relative h-2.5 w-full rounded-full bg-surface-container-high">
      <div className={cn("h-full rounded-full", value === null ? "" : value / scale >= 0.8 ? "bg-green-600" : value / scale >= 0.6 ? "bg-primary" : "bg-amber-500")} style={{ width: `${pct}%` }} />
      {school != null && <div className="absolute -top-1 w-0.5 bg-on-surface/60" style={{ left: `${(school / scale) * 100}%`, height: "18px" }} title={`School average ${school}`} />}
    </div>
  );
}

/** One teacher's results: each question against the school average, by section, and the comments. */
export function TeacherDetail({ r, t, showStatus = false }: { r: Results; t: TeacherResult; showStatus?: boolean }) {
  if (!t.enough)
    return (
      <p className="text-sm text-on-surface-variant">
        Only {t.responses} response{t.responses === 1 ? "" : "s"}: results are shown from {r.minResponses} (so no one can tell who wrote what).
      </p>
    );
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-3xl font-extrabold">
          {t.overall}
          <span className="text-base text-on-surface-variant"> / {r.scale}</span>
        </p>
        <span className="text-sm text-on-surface-variant">
          from {t.responses} responses · school average {r.school.overall ?? "—"}
        </span>
      </div>
      <div className="space-y-3">
        {r.questions
          .filter((q) => q.kind !== "text")
          .map((q) => {
            const mine = t.per[q.id];
            const sch = r.school.per[q.id];
            return (
              <div key={q.id}>
                <div className="flex items-baseline justify-between gap-3">
                  <p className="text-sm">{q.text}</p>
                  <p className="text-sm font-bold whitespace-nowrap">{q.kind === "rating" ? `${mine?.avg ?? "—"}` : `${mine?.yes ?? "—"}% yes`}</p>
                </div>
                {q.kind === "rating" ? <ScoreBar value={mine?.avg ?? null} school={sch?.avg} scale={r.scale} /> : <ScoreBar value={mine?.yes ?? null} school={sch?.yes} scale={100} />}
              </div>
            );
          })}
      </div>
      {t.bySection.length > 1 && (
        <div>
          <p className={label}>By section</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {t.bySection.map((s) => (
              <Pill key={s.section} tone="primary">
                {s.section}: {s.overall ?? `${s.responses} responses`}
              </Pill>
            ))}
          </div>
        </div>
      )}
      <div>
        <p className={label}>Comments ({t.comments.length})</p>
        {!t.comments.length && <p className="mt-2 text-sm text-on-surface-variant">No comments.</p>}
        <ul className="mt-2 space-y-1.5">
          {t.comments.map((c, i) => (
            <li key={`${c.responseId}-${i}`} className={cn("rounded-xl px-3 py-2 text-sm", c.status === "hidden" ? "bg-error/5 line-through text-on-surface-variant" : c.status === "pending" ? "bg-amber-50" : "bg-surface-container-low")}>
              “{c.text}”
              {showStatus && c.status !== "shown" && <span className="ml-2 text-[11px] font-bold">{c.status === "hidden" ? "hidden from the teacher" : "waiting to be screened"}</span>}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
