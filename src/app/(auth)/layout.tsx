"use client";

/**
 * Sign-in pages: the school's name on the left, the form on the right.
 * The school is found from this page's address (or the backend's default school).
 */
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { logoSrc, PublicSchool, readCachedBranding, saveCachedBranding, schoolApi } from "@/lib/api/school";
import { LoginBrandPanel } from "@/components/branding/LoginBrandPanel";
import { ApiError } from "@/lib/api/client";
import { PoweredBy } from "@/components/branding/PoweredBy";

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
      <LoginBrandPanel
        className="hidden lg:flex lg:w-[45%] xl:w-[42%]"
        name={name}
        legalName={branding?.legalName}
        logoSrc={logoSrc(branding?.logoUrl)}
        backgroundSrc={logoSrc(branding?.login?.backgroundUrl)}
        focus={branding?.login?.backgroundFocus}
        overlay={branding?.login?.overlay}
        quote={branding?.login?.quote}
        quoteAuthor={branding?.login?.quoteAuthor}
      />
      <div className="flex-1 flex items-center justify-center p-5 sm:p-8 lg:p-16 bg-surface-lowest">
        <div className="w-full max-w-[420px] space-y-8">
          {school.isError && (
            <p className="text-xs font-semibold text-error">
              {school.error instanceof ApiError && school.error.status === 404
                ? "This school isn't set up yet. Please contact the school office."
                : "Can't reach the school's server right now. Please try again in a moment."}
            </p>
          )}
          {children}
          <PoweredBy className="justify-center pt-6 border-t border-outline-variant/15" />
        </div>
      </div>
    </div>
  );
}
