"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth/AuthProvider";
import { api } from "@/lib/api/client";

/** Pages a person can still open while they have feedback to give (the form itself, and their account). */
const OPEN = ["/my-feedback", "/account"];

/**
 * When a feedback round that must be finished first is open (Teacher Feedback → the round's
 * “must be filled before using the app”), a student or parent with forms left is taken to
 * Teacher Feedback from any other page until every teacher is done.
 */
export function FeedbackGate({ children }: { children: React.ReactNode }) {
  const { can } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const gives = can("feedback.give");
  const q = useQuery({ queryKey: ["feedback", "pending"], queryFn: () => api.get<{ blocking: boolean; left: number; round: string | null }>("/feedback/pending", { quiet: true }), enabled: gives, staleTime: 30_000, retry: false });
  const blocked = gives && !!q.data?.blocking && !OPEN.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  useEffect(() => {
    if (blocked) router.replace("/my-feedback");
  }, [blocked, router]);
  if (blocked)
    return (
      <div className="max-w-lg mx-auto text-center mt-20 space-y-3">
        <span className="material-symbols-outlined text-5xl text-primary">rate_review</span>
        <p className="text-lg font-extrabold">Please give your teacher feedback first</p>
        <p className="text-sm text-on-surface-variant">Opening Teacher Feedback…</p>
      </div>
    );
  return <>{children}</>;
}
