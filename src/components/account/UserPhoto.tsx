"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { FormAlert } from "@/components/forms";
import { authedImageUrl, errorMessage } from "@/lib/api/client";
import { resizeImage } from "@/lib/images";
import { cn } from "@/lib/utils";

export const initialsOf = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

const SIZES = { sm: "w-10 h-10 text-sm", md: "w-14 h-14 text-lg", lg: "w-28 h-28 text-3xl" };

/** Someone's photo, or their initials when there is none (photos need a signed-in request). */
export function UserPhoto({ name, avatarUrl, size = "sm", className }: { name: string; avatarUrl: string | null | undefined; size?: keyof typeof SIZES; className?: string }) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    setSrc(null);
    if (avatarUrl) authedImageUrl(avatarUrl).then((u) => live && setSrc(u)).catch(() => undefined);
    return () => {
      live = false;
    };
  }, [avatarUrl]);

  return (
    <div className={cn("rounded-full bg-primary text-white flex items-center justify-center font-black overflow-hidden shrink-0 select-none", SIZES[size], className)}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={name} className="w-full h-full object-cover" />
      ) : (
        initialsOf(name)
      )}
    </div>
  );
}

/** Photo with "Upload / Replace / Remove" (My account and the Users screen). */
export function PhotoEditor({
  name,
  avatarUrl,
  canEdit,
  onUpload,
  onRemove,
  note,
}: {
  name: string;
  avatarUrl: string | null;
  canEdit: boolean;
  onUpload: (file: File) => Promise<void>;
  onRemove: () => Promise<void>;
  note?: string;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-5">
      <UserPhoto name={name} avatarUrl={avatarUrl} size="lg" />
      <div className="space-y-2">
        {error && <FormAlert>{error}</FormAlert>}
        {canEdit ? (
          <>
            <input
              ref={input}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) run(async () => onUpload(await resizeImage(f, 512)));
              }}
            />
            <div className="flex flex-wrap gap-3">
              <Button type="button" variant="secondary" disabled={busy} onClick={() => input.current?.click()}>
                {busy ? "Saving…" : avatarUrl ? "Change photo" : "Upload photo"}
              </Button>
              {avatarUrl && (
                <Button type="button" variant="secondary" className="text-error" disabled={busy} onClick={() => run(onRemove)}>
                  Remove
                </Button>
              )}
            </div>
            <p className="text-xs text-on-surface-variant/60">PNG, JPG or WebP. A clear, front-facing photo works best.</p>
          </>
        ) : (
          note && <p className="text-xs text-on-surface-variant/60">{note}</p>
        )}
      </div>
    </div>
  );
}
