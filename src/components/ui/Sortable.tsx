"use client";

/**
 * Drag and drop to reorder a list: mouse (drag the ⋮⋮ grip), touch (press and hold the grip, then
 * drag) and keyboard (Tab to the grip, Space, ↑ ↓, Space).
 *
 *   <SortableList ids={rows.map((r) => r.id)} onDrop={...}>
 *     {rows.map((r) => <SortableItem key={r.id} id={r.id} as="tr">… <MoveButtons …/> …</SortableItem>)}
 *   </SortableList>
 *
 * MoveButtons inside a SortableItem shows the grip by itself (or put <DragHandle /> anywhere in the row).
 * onDrop says where the item went: next to another one ({ before } / { after }), its old and new
 * index, and the new order of ids.
 */
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { closestCenter, DndContext, DragEndEvent, KeyboardSensor, MouseSensor, TouchSensor, useSensor, useSensors } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import { CSS } from "@dnd-kit/utilities";
import type { Move } from "@/lib/order";
import { errorMessage } from "@/lib/api/client";
import { useToast } from "./ToastProvider";

export { arrayMove };

export interface Drop {
  id: string;
  place: Exclude<Move, "up" | "down">;
  from: number;
  to: number;
  /** All ids in their new order. */
  ids: string[];
}

const ListContext = createContext<{ disabled: boolean } | null>(null);
type Grip = Pick<ReturnType<typeof useSortable>, "attributes" | "listeners" | "setActivatorNodeRef">;
const ItemContext = createContext<(Grip & { disabled: boolean }) | null>(null);

export function SortableList({ ids, onDrop, disabled = false, children }: { ids: string[]; onDrop: (drop: Drop) => void; disabled?: boolean; children: React.ReactNode }) {
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 4 } }),
    // A short hold first, so scrolling the page with a finger doesn't move rows.
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );
  const end = ({ active, over }: DragEndEvent) => {
    if (!over) return;
    const id = String(active.id);
    const from = ids.indexOf(id);
    const to = ids.indexOf(String(over.id));
    if (from < 0 || to < 0 || from === to) return;
    onDrop({ id, place: from < to ? { after: String(over.id) } : { before: String(over.id) }, from, to, ids: arrayMove(ids, from, to) });
  };
  return (
    <ListContext.Provider value={{ disabled }}>
      <DndContext sensors={sensors} collisionDetection={closestCenter} modifiers={[restrictToVerticalAxis]} onDragEnd={end}>
        <SortableContext items={ids} strategy={verticalListSortingStrategy} disabled={disabled}>
          {children}
        </SortableContext>
      </DndContext>
    </ListContext.Provider>
  );
}

type ItemProps = { id: string; as?: "div" | "tr" | "li"; children: React.ReactNode } & Omit<React.HTMLAttributes<HTMLElement>, "id">;

export function SortableItem({ id, as = "div", className, style, children, ...rest }: ItemProps) {
  const list = useContext(ListContext);
  const disabled = !list || list.disabled;
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id, disabled });
  const grip = useMemo(() => ({ attributes, listeners, setActivatorNodeRef, disabled }), [attributes, listeners, setActivatorNodeRef, disabled]);
  return (
    <ItemContext.Provider value={grip}>
      {React.createElement(
        as,
        {
          ...rest,
          ref: setNodeRef,
          style: { ...style, transform: CSS.Translate.toString(transform), transition, ...(isDragging ? { position: "relative", zIndex: 20 } : {}) },
          className: `${className ?? ""}${isDragging ? " bg-surface-lowest shadow-lg ring-1 ring-primary/20" : ""}`,
        },
        children
      )}
    </ItemContext.Provider>
  );
}

/** The ⋮⋮ grip that starts a drag (nothing outside a sortable list, or when it is switched off). */
export function DragHandle({ label }: { label?: string }) {
  const g = useContext(ItemContext);
  if (!g || g.disabled) return null;
  return (
    <button
      type="button"
      ref={g.setActivatorNodeRef}
      {...g.attributes}
      {...g.listeners}
      aria-label={label ? `Drag ${label} to a new place` : "Drag to a new place"}
      title="Drag to a new place"
      onClick={(e) => e.stopPropagation()}
      className="flex h-7 w-6 cursor-grab touch-manipulation items-center justify-center rounded-lg text-on-surface-variant/60 hover:bg-surface-container-high hover:text-on-surface active:cursor-grabbing"
    >
      <span className="material-symbols-outlined text-lg">drag_indicator</span>
    </button>
  );
}

/**
 * The rows to show: the dropped order straight away, until the list comes back from the server
 * in a different order (or `reset()` after a failed save).
 */
export function useDropOrder<T extends { id: string }>(rows: T[]) {
  const [ids, setIds] = useState<string[] | null>(null);
  const key = rows.map((r) => r.id).join(",");
  useEffect(() => setIds(null), [key]);
  const view = useMemo(() => {
    if (!ids) return rows;
    const byId = new Map(rows.map((r) => [r.id, r]));
    const out = ids.map((id) => byId.get(id)).filter((r): r is T => !!r);
    return out.length === rows.length ? out : rows;
  }, [rows, ids]);
  return { rows: view, show: setIds, reset: () => setIds(null) };
}

/**
 * A list the server keeps in order: shows the drop at once, saves it ("Order saved"), and puts the
 * row back if saving fails. `save` should also reload the list.
 */
export function useSortableRows<T extends { id: string }>(rows: T[], save: (id: string, place: Drop["place"]) => Promise<unknown>) {
  const order = useDropOrder(rows);
  const { showToast } = useToast();
  const onDrop = async (d: Drop) => {
    order.show(d.ids);
    try {
      await save(d.id, d.place);
      showToast("Order saved", "success");
    } catch (err) {
      order.reset();
      showToast(errorMessage(err), "error");
    }
  };
  return { rows: order.rows, ids: order.rows.map((r) => r.id), onDrop };
}
