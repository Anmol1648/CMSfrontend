"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import JsBarcode from "jsbarcode";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { FormAlert } from "@/components/forms";
import { PageHeader } from "@/components/layout/AppShell";
import { PageLoader } from "@/components/ui/PageLoader";
import { RequirePermission } from "@/lib/auth/RequirePermission";
import { errorMessage } from "@/lib/api/client";
import { libraryApi } from "@/lib/api/library";
import { Qr } from "@/components/library/Qr";

/** One spine / inside-cover label: the school, the book, its shelf and the accession number as a barcode. */
function Label({ l, school }: { l: { accessionNo: string; title: string; callNumber: string | null; location: string | null }; school: string }) {
  const svg = useRef<SVGSVGElement>(null);
  useEffect(() => {
    if (svg.current) JsBarcode(svg.current, l.accessionNo, { format: "CODE128", height: 40, width: 1.8, fontSize: 11, margin: 0, displayValue: true });
  }, [l.accessionNo]);
  return (
    <div className="label border border-dashed border-outline-variant/60 rounded-md p-2 text-center break-inside-avoid">
      <p className="text-[9px] font-bold uppercase tracking-wider truncate">{school} Library</p>
      <p className="text-[10px] font-semibold truncate">{l.title}</p>
      <div className="flex items-center justify-center gap-2">
        <Qr text={l.accessionNo} size={52} />
        <svg ref={svg} className="max-w-[70%]" />
      </div>
      <p className="text-[9px] truncate">{[l.callNumber, l.location].filter(Boolean).join(" · ")}</p>
    </div>
  );
}

function Labels() {
  const params = useSearchParams();
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [range, setRange] = useState<{ from: string; to: string } | null>(null);
  const book = params.get("book") ?? undefined;
  const q = useQuery({ queryKey: ["library", "labels", book, range], queryFn: () => libraryApi.labels(book ? { book } : { from: range!.from, to: range!.to }), enabled: !!book || !!range });
  return (
    <div className="space-y-4">
      <style>{`@media print { body * { visibility: hidden; } #labels, #labels * { visibility: visible; } #labels { position: absolute; left: 0; top: 0; width: 100%; } .label { border-color: #999; } }`}</style>
      {!book && (
        <Card>
          <div className="grid gap-4 sm:grid-cols-[1fr_1fr_auto] items-end">
            <Input label="From accession no" value={from} onChange={(e) => setFrom(e.target.value)} placeholder="LIB-00001" />
            <Input label="To accession no" value={to} onChange={(e) => setTo(e.target.value)} placeholder="LIB-00060" />
            <Button onClick={() => setRange({ from: from.trim(), to: to.trim() })} disabled={!from.trim() || !to.trim()}>
              Show labels
            </Button>
          </div>
          <p className="mt-2 text-xs text-on-surface-variant/70">Or open a book (Library → Books) and click “Print labels” for its copies. At most 500 labels at a time.</p>
        </Card>
      )}
      {q.isLoading && (!!book || !!range) ? (
        <PageLoader />
      ) : q.error ? (
        <FormAlert>{errorMessage(q.error)}</FormAlert>
      ) : q.data ? (
        q.data.labels.length ? (
          <>
            <div className="flex items-center justify-between">
              <p className="text-sm text-on-surface-variant">{q.data.labels.length} labels · print on A4 (4 across); cut and stick inside the cover or on the spine.</p>
              <Button onClick={() => window.print()}>Print</Button>
            </div>
            <div id="labels" className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-white p-2">
              {q.data.labels.map((l) => (
                <Label key={l.id} l={l} school={q.data.school} />
              ))}
            </div>
          </>
        ) : (
          <FormAlert tone="info">No copies there.</FormAlert>
        )
      ) : null}
    </div>
  );
}

export default function LibraryLabelsPage() {
  return (
    <RequirePermission permission="library.manage">
      <PageHeader title="Book labels" description="Barcode labels with each copy’s accession number, for the counter scanner." />
      <Suspense fallback={<PageLoader />}>
        <Labels />
      </Suspense>
    </RequirePermission>
  );
}
