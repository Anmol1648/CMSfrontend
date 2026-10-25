"use client";

/**
 * Sign-in pages: the school's name on the left, the form on the right.
 * The school is found from this page's address (or the backend's default school).
 */
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { logoSrc, PublicSchool, readCachedBranding, saveCachedBranding, schoolApi } from "@/lib/api/school";
import { LoginBrandPanel } from "@/components/branding/LoginBrandPanel";
import { ApiError, SCHOOL_CODE_KEY, savedSchoolCode } from "@/lib/api/client";
import { PoweredBy } from "@/components/branding/PoweredBy";
import { ChangeSchoolLink, SchoolCodePicker } from "@/components/branding/SchoolCodePicker";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const school = useQuery({ queryKey: ["public-school"], queryFn: schoolApi.publicInfo, staleTime: Infinity });
  // The remembered branding is read only after the page has loaded in the browser: the server can't
  // see it, and the first browser render must match the server's HTML.
  const [remembered, setRemembered] = useState<PublicSchool | undefined>(undefined);
  useEffect(() => setRemembered(readCachedBranding()), []);
  useEffect(() => {
    if (school.data) saveCachedBranding(school.data);
    // The school's code has changed: go to its new address, or remember the new code.
    const moved = school.data?.moved;
    if (!moved) return;
    if (moved.address) {
      const to = new URL(moved.address);
      if (to.host !== window.location.host) window.location.replace(`${to.origin}${window.location.pathname}${window.location.search}`);
    } else if (savedSchoolCode() === moved.from) {
      try {
        localStorage.setItem(SCHOOL_CODE_KEY, school.data!.code);
      } catch {
        // storage blocked: the old code keeps working
      }
    }
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
          {school.isError && !(school.error instanceof ApiError && school.error.status === 404) && <p className="text-xs font-semibold text-error">Can&apos;t reach the school&apos;s server right now. Please try again in a moment.</p>}
          {/* No school at this address (a shared one): ask for the school code. */}
          {school.isError && school.error instanceof ApiError && school.error.status === 404 ? (
            <SchoolCodePicker />
          ) : (
            <>
              {children}
              <div className="text-center">
                <ChangeSchoolLink />
              </div>
            </>
          )}
          <PoweredBy className="justify-center pt-6 border-t border-outline-variant/15" />
        </div>
      </div>
    </div>
  );
}
