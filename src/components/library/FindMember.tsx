"use client";

import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/Input";
import { CameraScan } from "./CameraScan";
import { libraryApi, MemberHit } from "@/lib/api/library";

/** Finding the member: their card's barcode (admission no / employee code), or a name. */
export function FindMember({ onPick, label = "Member: scan the library card, or type a name / admission no / employee code" }: { onPick: (m: MemberHit) => void; label?: string }) {
  const [text, setText] = useState("");
  const [hits, setHits] = useState<MemberHit[] | null>(null);
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    ref.current?.focus();
  }, []);
  useEffect(() => {
    const t = text.trim();
    if (t.length < 2) {
      setHits(null);
      return;
    }
    const timer = setTimeout(() => {
      libraryApi
        .members(t)
        .then(setHits)
        .catch(() => setHits([]));
    }, 250);
    return () => clearTimeout(timer);
  }, [text]);
  const choose = (m: MemberHit) => {
    onPick(m);
    setText("");
    setHits(null);
  };
  /** A scanned card (or Enter): picks the member whose number it is at once, else shows the matches. */
  const lookup = async (code: string) => {
    const c = code.trim();
    if (c.length < 2) return;
    setText(c);
    try {
      const found = await libraryApi.members(c);
      const exact = found.filter((m) => m.code.toLowerCase() === c.toLowerCase() || m.code.replace(/\W/g, "").toLowerCase() === c.replace(/\W/g, "").toLowerCase());
      if (exact.length === 1) choose(exact[0]);
      else if (found.length === 1) choose(found[0]);
      else setHits(found);
    } catch {
      setHits([]);
    }
  };
  return (
    <div className="relative">
      <div className="flex items-end gap-2">
        <Input
          ref={ref}
          label={label}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void lookup(text);
          }}
          icon="badge"
          placeholder="2025/0235, or Shubham"
        />
        <CameraScan onScan={(code) => void lookup(code)} label="Scan the library card with the camera" />
      </div>
      {hits && (
        <div className="absolute z-20 mt-1 w-full rounded-xl bg-surface-container-lowest shadow-lg max-h-72 overflow-y-auto">
          {!hits.length && <p className="px-4 py-3 text-sm text-on-surface-variant">No member found.</p>}
          {hits.map((m) => (
            <button key={`${m.kind}:${m.id}`} type="button" onClick={() => choose(m)} className="w-full text-left px-4 py-2.5 hover:bg-surface-container-high flex items-center gap-3">
              <span className="material-symbols-outlined text-on-surface-variant">{m.kind === "staff" ? "badge" : "school"}</span>
              <span className="flex-1">
                <span className="block text-sm font-bold">{m.name}</span>
                <span className="block text-xs text-on-surface-variant/70">
                  {m.code} · {m.detail}
                </span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

