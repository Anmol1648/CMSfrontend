import { COMPANY } from "@/lib/brand";
import { cn } from "@/lib/utils";

/** "Powered by Klytos Labs" with the company's logo (the maker of the ERP, not the school). */
export function PoweredBy({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <div className={cn("flex items-center gap-2.5 text-on-surface-variant/70", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={COMPANY.logo} alt={COMPANY.name} className={cn("object-contain shrink-0", compact ? "h-7 w-7" : "h-9 w-9")} />
      <div className="leading-tight">
        <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-on-surface-variant/50">Powered by</p>
        <p className={cn("font-black tracking-wide text-on-surface", compact ? "text-xs" : "text-sm")}>{COMPANY.name}</p>
      </div>
    </div>
  );
}
