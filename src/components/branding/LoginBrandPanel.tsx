/**
 * The left panel of the sign-in page. Used by the sign-in page itself and by the live preview on
 * School Profile, so what the admin previews is exactly what people see.
 */
import type { LoginFocus } from "@/lib/api/school";
import { cn } from "@/lib/utils";

export interface LoginBrandPanelProps {
  name: string;
  legalName?: string | null;
  /** Full image addresses (not API-relative paths). */
  logoSrc?: string | null;
  backgroundSrc?: string | null;
  focus?: LoginFocus;
  /** Darkening over the photo, 0–90 (%). */
  overlay?: number;
  quote?: string | null;
  quoteAuthor?: string | null;
  className?: string;
}

const FOCUS: Record<LoginFocus, string> = {
  center: "center",
  top: "center top",
  bottom: "center bottom",
  left: "left center",
  right: "right center",
};

export function LoginBrandPanel({ name, legalName, logoSrc, backgroundSrc, focus = "center", overlay = 60, quote, quoteAuthor, className }: LoginBrandPanelProps) {
  return (
    <div className={cn("relative overflow-hidden flex flex-col justify-between p-12 bg-primary-gradient", className)}>
      {backgroundSrc ? (
        <>
          {/* The photo fills the panel at any size: cropped (never stretched), keeping the chosen part in view. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={backgroundSrc} alt="" className="absolute inset-0 w-full h-full object-cover" style={{ objectPosition: FOCUS[focus] }} />
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(180deg, rgba(0,32,69,${(overlay / 100) * 0.85}) 0%, rgba(0,32,69,${overlay / 100}) 55%, rgba(0,32,69,${Math.min(0.95, overlay / 100 + 0.15)}) 100%)`,
            }}
          />
        </>
      ) : (
        <div className="absolute inset-0 pointer-events-none">
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: "linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)",
              backgroundSize: "60px 60px",
            }}
          />
          <div className="absolute top-[20%] left-[50%] -translate-x-1/2 w-[600px] h-[600px] bg-white/[0.03] rounded-full blur-3xl" />
        </div>
      )}

      <div className="relative z-10 flex items-center gap-3">
        <div className="w-10 h-10 bg-white flex items-center justify-center rounded-xl border border-white/10 overflow-hidden shrink-0">
          {logoSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoSrc} alt="" className="w-full h-full object-contain" />
          ) : (
            <span className="material-symbols-outlined text-primary text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>
              school
            </span>
          )}
        </div>
        <h2 className="text-white font-bold text-lg tracking-tight leading-tight drop-shadow">{name}</h2>
      </div>

      <div className="relative z-10 -mt-8">
        <h1 className="text-white text-5xl xl:text-[3.5rem] font-extrabold leading-[1.1] tracking-tight drop-shadow-md">{name || " "}</h1>
        {legalName && legalName !== name && <p className="text-white/70 text-sm font-medium mt-6 max-w-[360px] leading-relaxed drop-shadow">{legalName}</p>}
        {quote && (
          <figure className="mt-10 max-w-[440px] border-l-2 border-white/40 pl-5">
            <blockquote className="text-white/90 text-xl font-semibold leading-snug italic drop-shadow">“{quote}”</blockquote>
            {quoteAuthor && <figcaption className="text-white/60 text-xs font-bold uppercase tracking-widest mt-3">— {quoteAuthor}</figcaption>}
          </figure>
        )}
      </div>

      <p className="relative z-10 text-white/40 text-[10px] font-bold uppercase tracking-widest">School management system</p>
    </div>
  );
}

/**
 * The panel drawn at real size (806 × 1080: the left 42% of a 1920 × 1080 screen) and scaled down,
 * so text, image crop and spacing look exactly as they will on the sign-in page.
 */
export function LoginBrandPreview({ width = 300, ...props }: LoginBrandPanelProps & { width?: number }) {
  const scale = width / 806;
  return (
    <div className="rounded-2xl overflow-hidden shadow-premium border border-outline-variant/30 shrink-0" style={{ width, height: 1080 * scale }}>
      <div style={{ width: 806, height: 1080, transform: `scale(${scale})`, transformOrigin: "top left" }}>
        <LoginBrandPanel {...props} className="w-full h-full" />
      </div>
    </div>
  );
}
