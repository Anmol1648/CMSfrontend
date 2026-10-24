"use client";

import { Head, Line, MODES, Mode } from "@/lib/api/payroll";

/** The pay heads of a salary or structure: each with ₹ a month or a % of basic (basic itself is set apart). */
export function SalaryLines({ heads, lines, setLines, disabled }: { heads: Head[]; lines: Line[]; setLines: (l: Line[]) => void; disabled?: boolean }) {
  const usable = heads.filter((h) => h.code !== "BASIC" && !["PF", "ESI", "PT", "TDS", "LOAN", "ADV"].includes(h.code));
  const missing = usable.filter((h) => !lines.some((l) => l.headId === h.id));
  const set = (i: number, patch: Partial<Line>) => setLines(lines.map((l, k) => (k === i ? { ...l, ...patch } : l)));
  return (
    <div className="space-y-2">
      {lines.map((l, i) => {
        const h = heads.find((x) => x.id === l.headId);
        return (
          <div key={l.headId} className="flex flex-wrap items-center gap-2 text-sm">
            <span className="w-48 font-semibold">
              {h?.name ?? "?"} <span className={h?.kind === "deduction" ? "text-error text-xs" : "text-xs text-on-surface-variant"}>{h?.kind === "deduction" ? "(deduction)" : ""}</span>
            </span>
            <select value={l.mode} disabled={disabled} onChange={(e) => set(i, { mode: e.target.value as Mode })} className="rounded-lg bg-surface-container-low px-2 py-1.5" aria-label={`${h?.name} how`}>
              {MODES.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
            <input type="number" min={0} step="any" value={l.value} disabled={disabled} onChange={(e) => set(i, { value: Number(e.target.value) || 0 })} className="w-28 rounded-lg bg-surface-container-low px-2 py-1.5" aria-label={`${h?.name} value`} />
            {!disabled && (
              <button type="button" className="text-error" aria-label="Remove" onClick={() => setLines(lines.filter((_, k) => k !== i))}>
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            )}
          </div>
        );
      })}
      {!disabled && missing.length > 0 && (
        <select value="" onChange={(e) => e.target.value && setLines([...lines, { headId: e.target.value, mode: "fixed", value: 0 }])} className="rounded-lg bg-surface-container-low px-2 py-1.5 text-sm" aria-label="Add a pay head">
          <option value="">+ Add a pay head…</option>
          {missing.map((h) => (
            <option key={h.id} value={h.id}>
              {h.name} ({h.kind})
            </option>
          ))}
        </select>
      )}
      <p className="text-[11px] text-on-surface-variant">PF, ESI, professional tax, TDS and loans are worked out by themselves (System Settings → Payroll). Pay heads are in Masters → Payroll.</p>
    </div>
  );
}
