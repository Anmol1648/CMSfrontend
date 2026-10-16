"use client";

/** ↑ ↓ buttons to reorder an item by hand; clicks don't reach the row underneath. */
export function MoveButtons({ label, first, last, disabled, onMove }: { label: string; first: boolean; last: boolean; disabled?: boolean; onMove: (direction: "up" | "down") => void }) {
  return (
    <div className="flex gap-1">
      {(["up", "down"] as const).map((d) => (
        <button
          key={d}
          type="button"
          aria-label={`Move ${label} ${d}`}
          disabled={disabled || (d === "up" ? first : last)}
          onClick={(e) => {
            e.stopPropagation();
            onMove(d);
          }}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high disabled:opacity-30"
        >
          <span className="material-symbols-outlined text-lg">{d === "up" ? "arrow_upward" : "arrow_downward"}</span>
        </button>
      ))}
    </div>
  );
}
