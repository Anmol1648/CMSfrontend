"use client";

import { useEffect, useState } from "react";
import { authedImageUrl } from "@/lib/api/client";
import { photoPath } from "@/lib/api/attendance";
import { cn } from "@/lib/utils";

/** A check-in selfie or enrolled face (fetched with the person's login); click to see it large. */
export function AuthedPhoto({ fileId, alt, className, onOpen }: { fileId: string | null | undefined; alt: string; className?: string; onOpen?: (url: string) => void }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    setUrl(null);
    if (fileId)
      authedImageUrl(photoPath(fileId))
        .then((u) => alive && setUrl(u))
        .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [fileId]);
  if (!fileId) return <div className={cn("flex items-center justify-center rounded-lg bg-surface-container text-[10px] text-on-surface-variant/60", className)}>No photo</div>;
  if (!url) return <div className={cn("animate-pulse rounded-lg bg-surface-container", className)} />;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt={alt} onClick={() => onOpen?.(url)} className={cn("rounded-lg object-cover", onOpen && "cursor-zoom-in", className)} />
  );
}
