"use client";

/**
 * Sign-in pages: the school's name on the left, the form on the right.
 * The school is found from this page's address (or the backend's default school).
 */
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { logoSrc, PublicSchool, readCachedBranding, saveCachedBranding, schoolApi } from "@/lib/api/school";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const school = useQuery({ queryKey: ["public-school"], queryFn: schoolApi.publicInfo, staleTime: Infinity });
  // The remembered branding is read only after the page has loaded in the browser: the server can't
  // see it, and the first browser render must match the server's HTML.
  const [remembered, setRemembered] = useState<PublicSchool | undefined>(undefined);
  useEffect(() => setRemembered(readCachedBranding()), []);
  useEffect(() => {
    if (school.data) saveCachedBranding(school.data);
  }, [school.data]);
  const branding = school.data ?? remembered;
  const name = branding?.name ?? (school.isError ? "School ERP" : "");

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-[45%] xl:w-[42%] bg-primary-gradient relative overflow-hidden flex-col justify-between p-12">
        <div className="absolute inset-0 pointer-events-none">
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)",
              backgroundSize: "60px 60px",
            }}
          />
          <div className="absolute top-[20%] left-[50%] -translate-x-1/2 w-[600px] h-[600px] bg-white/[0.03] rounded-full blur-3xl" />
        </div>

        <div className="relative z-10 flex items-center gap-3">
          <div className="w-10 h-10 bg-white flex items-center justify-center rounded-xl border border-white/10 overflow-hidden">
            {branding?.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoSrc(branding.logoUrl)!} alt="" className="w-full h-full object-contain" />
            ) : (
              <span className="material-symbols-outlined text-primary text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                school
              </span>
            )}
          </div>
          <h2 className="text-white font-bold text-lg tracking-tight leading-tight">{name}</h2>
        </div>

        <div className="relative z-10 -mt-8">
          <h1 className="text-white text-5xl xl:text-[3.5rem] font-extrabold leading-[1.1] tracking-tight">
            {name || " "}
          </h1>
          {branding && branding.legalName !== branding.name && (
            <p className="text-white/50 text-sm font-medium mt-6 max-w-[360px] leading-relaxed">{branding.legalName}</p>
          )}
        </div>

        <p className="relative z-10 text-white/30 text-[10px] font-bold uppercase tracking-widest">School management system</p>
      </div>

      <div className="flex-1 flex items-center justify-center p-8 lg:p-16 bg-surface-lowest">
        <div className="w-full max-w-[420px] space-y-8">
          {school.isError && (
            <p className="text-xs font-semibold text-error">
              No school is set up for this address yet. Ask the administrator to set DEFAULT_TENANT_CODE on the server.
            </p>
          )}
          {children}
        </div>
      </div>
    </div>
  );
}
