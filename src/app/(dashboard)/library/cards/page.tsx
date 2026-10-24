"use client";

/* eslint-disable @next/next/no-img-element */
import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import JsBarcode from "jsbarcode";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { FormAlert, Select } from "@/components/forms";
import { PageHeader } from "@/components/layout/AppShell";
import { PageLoader } from "@/components/ui/PageLoader";
import { RequirePermission } from "@/lib/auth/RequirePermission";
import { authedImageUrl, errorMessage } from "@/lib/api/client";
import { academicApi } from "@/lib/api/academic";
import { libraryApi, MemberKind, showDate } from "@/lib/api/library";

type CardRow = { kind: MemberKind; id: string; name: string; code: string; detail: string; type: string; books: number; days: number; hasPhoto: boolean };

function useImage(path: string | null) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    if (!path) return;
    authedImageUrl(path)
      .then(setSrc)
      .catch(() => setSrc(null));
  }, [path]);
  return src;
}

/** A card the size of a bank card: school, photo, name, class, the limits, and a barcode of the member's number. */
function LibraryCard({ c, school, logo, validTill, session }: { c: CardRow; school: string; logo: string | null; validTill: string | null; session: string | null }) {
  const svg = useRef<SVGSVGElement>(null);
  const photo = useImage(c.hasPhoto ? libraryApi.photoPath(c.kind, c.id) : null);
  useEffect(() => {
    if (svg.current) JsBarcode(svg.current, c.code, { format: "CODE128", height: 30, width: 1.3, fontSize: 10, margin: 0, displayValue: true });
  }, [c.code]);
  return (
    <div className="library-card relative overflow-hidden rounded-xl border border-outline-variant/50 bg-white text-[#1a202c]" style={{ width: "85.6mm", height: "54mm" }}>
      <div className="flex items-center gap-2 bg-[#1A365D] px-3 py-1.5 text-white">
        {logo ? <img src={logo} alt="" className="h-6 w-6 rounded bg-white object-contain" /> : <span className="material-symbols-outlined text-lg">local_library</span>}
        <div className="min-w-0 leading-tight">
          <p className="text-[9px] font-extrabold uppercase tracking-wider truncate">{school}</p>
          <p className="text-[8px] opacity-80">Library card{session ? ` · ${session}` : ""}</p>
        </div>
      </div>
      <div className="flex gap-2 px-3 pt-2">
        {photo ? (
          <img src={photo} alt="" className="h-[19mm] w-[15mm] rounded object-cover border border-outline-variant/40" />
        ) : (
          <span className="h-[19mm] w-[15mm] rounded bg-[#EDF2F7] flex items-center justify-center text-[#718096]">
            <span className="material-symbols-outlined">person</span>
          </span>
        )}
        <div className="min-w-0 flex-1 leading-tight">
          <p className="text-[11px] font-extrabold truncate">{c.name}</p>
          <p className="text-[9px] truncate">{c.detail}</p>
          <p className="text-[8px] text-[#4A5568] mt-0.5 truncate">
            {c.type}: {c.books} book{c.books === 1 ? "" : "s"}, {c.days} days
          </p>
          {validTill && <p className="text-[8px] text-[#4A5568]">Valid till {showDate(validTill)}</p>}
        </div>
      </div>
      <div className="absolute inset-x-0 bottom-1.5 flex justify-center">
        <svg ref={svg} className="max-w-[75mm]" />
      </div>
    </div>
  );
}

function Cards() {
  const params = useSearchParams();
  const student = params.get("student") ?? undefined;
  const staffId = params.get("staffId") ?? undefined;
  const one = !!student || !!staffId;
  const [who, setWho] = useState<"section" | "staff">("section");
  const [section, setSection] = useState("");
  const years = useQuery({ queryKey: ["academic", "years"], queryFn: academicApi.years, enabled: !one });
  const yearId = years.data?.find((y) => y.isCurrent)?.id;
  const sections = useQuery({ queryKey: ["academic", "section-options", yearId], queryFn: () => academicApi.sectionOptions(yearId!), enabled: !!yearId });
  const ready = one || (who === "staff" ? true : !!section);
  const q = useQuery({ queryKey: ["library", "cards", student, staffId, who, section], queryFn: () => libraryApi.cards(student ? { student } : staffId ? { staffId } : who === "staff" ? { staff: "1" } : { section }), enabled: ready });
  const logo = useImage(q.data?.school.hasLogo ? libraryApi.logoPath : null);
  return (
    <div className="space-y-4">
      <style>{`@media print { @page { size: A4; margin: 10mm; } body * { visibility: hidden; } #cards, #cards * { visibility: visible; } #cards { position: absolute; left: 0; top: 0; } .library-card { break-inside: avoid; -webkit-print-color-adjust: exact; print-color-adjust: exact; } }`}</style>
      {!one && (
        <Card>
          <div className="grid gap-4 sm:grid-cols-3">
            <Select label="Cards for" value={who} onChange={(w) => setWho(w as "section" | "staff")} options={[{ value: "section", label: "Students of a section" }, { value: "staff", label: "All staff" }]} />
            {who === "section" && <Select label="Section" value={section} onChange={setSection} options={[{ value: "", label: "Choose…" }, ...(sections.data ?? []).map((s) => ({ value: s.id, label: s.label }))]} />}
          </div>
          <p className="mt-3 text-xs text-on-surface-variant/70">The barcode is the admission number (staff: employee code): scan it at Library → Issue & Return to find the member. A single card: open the student or staff member and click “Library card”.</p>
        </Card>
      )}
      {!ready ? null : q.isLoading ? (
        <PageLoader />
      ) : q.error ? (
        <FormAlert>{errorMessage(q.error)}</FormAlert>
      ) : !q.data?.cards.length ? (
        <FormAlert tone="info">No one here.</FormAlert>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <p className="text-sm text-on-surface-variant">{q.data.cards.length} card{q.data.cards.length === 1 ? "" : "s"} · bank-card size, 10 on an A4 page. Print, cut, and laminate.</p>
            <Button onClick={() => window.print()}>Print</Button>
          </div>
          <div id="cards" className="grid gap-3 justify-start" style={{ gridTemplateColumns: "repeat(auto-fill, 85.6mm)" }}>
            {q.data.cards.map((c) => (
              <LibraryCard key={`${c.kind}:${c.id}`} c={c} school={q.data.school.name} logo={logo} validTill={q.data.validTill} session={q.data.session} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default function LibraryCardsPage() {
  return (
    <RequirePermission permission={["library.manage", "library.issue"]}>
      <PageHeader title="Library Cards" description="Print library cards with each member’s photo and a barcode to scan at the counter." />
      <Suspense fallback={<PageLoader />}>
        <Cards />
      </Suspense>
    </RequirePermission>
  );
}
