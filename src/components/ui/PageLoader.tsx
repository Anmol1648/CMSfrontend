/** Shown in a page (or part of one) while its data loads: a spinner with a faint outline of content. */
export function PageLoader({ label = "Loading…", compact = false }: { label?: string; compact?: boolean }) {
  if (compact) {
    return (
      <span className="inline-flex items-center gap-2 text-sm text-on-surface-variant/70" role="status" aria-live="polite">
        <span className="w-4 h-4 border-2 border-primary/15 border-t-primary rounded-full animate-spin" />
        {label}
      </span>
    );
  }
  return (
    <div className="space-y-6" role="status" aria-live="polite">
      <div className="flex items-center gap-3 py-2">
        <span className="w-6 h-6 border-[3px] border-primary/15 border-t-primary rounded-full animate-spin" />
        <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant/50">{label}</span>
      </div>
      <div className="space-y-3 animate-pulse">
        <div className="h-8 w-1/3 rounded-xl bg-surface-container-high/60" />
        <div className="h-4 w-2/3 rounded-lg bg-surface-container-high/50" />
        <div className="h-40 w-full rounded-2xl bg-surface-container-high/40" />
      </div>
    </div>
  );
}
