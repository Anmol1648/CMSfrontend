"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/Input";

/**
 * A search box that looks people up as you type (two letters or more) and lists them to pick one.
 * `search` is the API call; `render` shows a result row.
 */
export function SearchPick<T extends { id: string }>({ label, placeholder = "Type a name or admission no.", search, render, onPick, className }: { label?: string; placeholder?: string; search: (q: string) => Promise<T[]>; render: (x: T) => React.ReactNode; onPick: (x: T) => void; className?: string }) {
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<T[]>([]);
  useEffect(() => {
    if (q.trim().length < 2) {
      setRows([]);
      return;
    }
    let live = true;
    const t = setTimeout(() => {
      search(q)
        .then((r) => live && setRows(r))
        .catch(() => live && setRows([]));
    }, 250);
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [q, search]);
  return (
    <div className={`relative ${className ?? ""}`}>
      <Input label={label} placeholder={placeholder} value={q} onChange={(e) => setQ(e.target.value)} icon="search" />
      {rows.length > 0 && (
        <div className="absolute z-20 mt-1 w-full max-h-72 overflow-y-auto rounded-xl border border-outline-variant/30 bg-surface-container-lowest shadow-lg">
          {rows.map((r) => (
            <button
              key={r.id}
              type="button"
              className="block w-full px-4 py-2 text-left text-sm hover:bg-surface-container"
              onClick={() => {
                onPick(r);
                setQ("");
                setRows([]);
              }}
            >
              {render(r)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
