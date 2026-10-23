"use client";

import { Card } from "@/components/ui/Card";
import { Pill } from "@/components/forms";
import { Progress } from "@/lib/api/learn";
import { cn } from "@/lib/utils";

/** A student's AI learning: practice scores by chapter, weak chapters, conversations. */
export function ProgressView({ p, onOpenChat }: { p: Progress; onOpenChat?: (id: string) => void }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Practice quizzes", value: p.quizzes },
          { label: "Average score", value: p.average === null ? "—" : `${p.average}%` },
          { label: "Tutor conversations", value: p.chats },
          { label: "Chapters practised", value: p.chapters.length },
        ].map((x) => (
          <Card key={x.label} padding="sm">
            <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/60">{x.label}</p>
            <p className="text-2xl font-extrabold text-primary">{x.value}</p>
          </Card>
        ))}
      </div>
      {!!p.weak.length && (
        <Card className="space-y-1">
          <p className="text-sm font-black uppercase tracking-widest text-amber-700">To revise</p>
          {p.weak.map((w) => (
            <p key={`${w.subject}${w.chapter}`} className="flex justify-between text-sm">
              <span>
                {w.subject} · {w.chapter}
              </span>
              <b className="text-error">{w.percent}%</b>
            </p>
          ))}
        </Card>
      )}
      <Card padding="none" className="overflow-hidden">
        <h3 className="px-5 pt-4 text-sm font-black uppercase tracking-widest text-primary">Chapters</h3>
        <table className="w-full text-sm mt-2">
          <tbody>
            {p.chapters.map((c) => (
              <tr key={`${c.subject}${c.chapter}`} className="border-t border-outline-variant/10">
                <td className="px-5 py-2">
                  <p className="font-semibold">{c.chapter}</p>
                  <p className="text-[10px] text-on-surface-variant/60">{c.subject}</p>
                </td>
                <td className="px-3 py-2 text-xs">
                  {c.quizzes} quiz{c.quizzes === 1 ? "" : "zes"} · {c.chats} chat{c.chats === 1 ? "" : "s"}
                </td>
                <td className={cn("px-5 py-2 text-right font-bold", c.percent !== null && c.percent < 60 ? "text-error" : "text-emerald-700")}>{c.percent === null ? "—" : `${c.percent}%`}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!p.chapters.length && <p className="px-5 py-6 text-sm text-on-surface-variant/70">Nothing practised yet.</p>}
      </Card>
      {onOpenChat && !!p.conversations.length && (
        <Card padding="none" className="overflow-hidden">
          <h3 className="px-5 pt-4 text-sm font-black uppercase tracking-widest text-primary">Conversations</h3>
          <div className="mt-2">
            {p.conversations.map((c) => (
              <button key={c.id} type="button" onClick={() => onOpenChat(c.id)} className="w-full text-left px-5 py-2.5 border-t border-outline-variant/10 hover:bg-surface-container-low">
                <span className="flex items-center gap-2">
                  <span className="text-sm font-semibold">{c.title}</span>
                  {c.flagged && <Pill tone="danger">flagged</Pill>}
                </span>
                <span className="block text-[11px] text-on-surface-variant/60">
                  {c.subject}
                  {c.chapter ? ` · ${c.chapter}` : ""} · {c.messages} messages · {new Date(c.updatedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                </span>
              </button>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
