/** Centred spinner shown while the session is being checked. */
export function FullPageLoader({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-surface" role="status" aria-live="polite">
      <span className="w-8 h-8 border-[3px] border-primary/15 border-t-primary rounded-full animate-spin" />
      <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant/50">{label}</span>
    </div>
  );
}
