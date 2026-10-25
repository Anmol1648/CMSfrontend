"use client";

import { DragHandle } from "./Sortable";

/**
 * ↑ ↓ buttons to reorder an item by hand, with its position (1, 2, 3…) in front. Inside a
 * SortableItem the drag grip comes first. Clicks don't reach the row underneath (rows open the item).
 */
export function MoveButtons({
  label,
  position,
  first,
  last,
  disabled,
  onMove,
}: {
  label: string;
  /** 1-based place in the list, shown before the arrows. */
  position?: number;
  first: boolean;
  last: boolean;
  disabled?: boolean;
  onMove: (direction: "up" | "down") => void;
}) {
  return (
    <div className="flex items-center gap-1">
      <DragHandle label={label} />
      {position !== undefined && <span className="w-6 text-right text-xs font-bold tabular-nums text-on-surface-variant/60 mr-1">{position}</span>}
      {(["up", "down"] as const).map((d) => (
        <button
          key={d}
          type="button"
          aria-label={`Move ${label} ${d}`}
          title={d === "up" ? "Move up one place" : "Move down one place"}
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

/** The one-line explanation shown above a list that is ordered by hand. */
export function OrderHint({ children }: { children: React.ReactNode }) {
  return (
    <p className="flex items-center gap-1.5 text-xs text-on-surface-variant/70">
      <span className="material-symbols-outlined text-base">swap_vert</span>
      {children}
    </p>
  );
}
