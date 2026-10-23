"use client";

/* eslint-disable @next/next/no-img-element */
import { useEffect, useState } from "react";
import { authedImageUrl } from "@/lib/api/client";
import { BookKind, libraryApi } from "@/lib/api/library";

/** A book's cover photo, or an icon for its type. */
export function BookCover({ book, className }: { book: { id: string; coverFileId: string | null; kind: BookKind }; className?: string }) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    if (!book.coverFileId) return;
    authedImageUrl(libraryApi.coverPath(book.id))
      .then(setSrc)
      .catch(() => setSrc(null));
  }, [book.id, book.coverFileId]);
  if (src) return <img src={src} alt="" className={className ?? "h-20 w-14 rounded-lg object-cover"} />;
  return (
    <span className={`${className ?? "h-20 w-14"} rounded-lg bg-primary/10 text-primary flex items-center justify-center`}>
      <span className="material-symbols-outlined">{book.kind === "magazine" ? "newspaper" : book.kind === "ebook" ? "tablet_mac" : book.kind === "cd" ? "album" : "menu_book"}</span>
    </span>
  );
}

