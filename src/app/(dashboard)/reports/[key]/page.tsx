"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Tabs } from "@/components/ui/Tabs";
import { FormAlert, Pill } from "@/components/forms";
import { PageHeader } from "@/components/layout/AppShell";
import { PageLoader } from "@/components/ui/PageLoader";
import { useToast } from "@/components/ui/ToastProvider";
import { PdfViewer } from "@/components/documents/PdfViewer";
import { ReportFilters } from "@/components/reports/ReportFilters";
import { ReportTable } from "@/components/reports/ReportTable";
import { ReportDesignPanel } from "@/components/reports/ReportDesignPanel";
import { RequirePermission } from "@/lib/auth/RequirePermission";
import { ReportFormat, ReportRun, reportsApi } from "@/lib/api/reports";
import { errorMessage, saveBlob } from "@/lib/api/client";

function Report() {
  const { key } = useParams<{ key: string }>();
  // Filters can come in the link (e.g. /reports/attendance_absentees?date=2026-10-21).
  const search = useSearchParams();
  const { showToast } = useToast();
  const info = useQuery({ queryKey: ["report", key], queryFn: () => reportsApi.get(key) });
  const [values, setValues] = useState<Record<string, string> | null>(null);
  const [run, setRun] = useState<ReportRun | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState("report");
  const [pdf, setPdf] = useState<{ filters: Record<string, string>; n: number } | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const first = useRef(true);

  useEffect(() => {
    if (info.data && !values) setValues(Object.fromEntries(info.data.filters.map((f) => [f.key, search.get(f.key) ?? f.value ?? ""])));
  }, [info.data, values, search]);

  const filters = values ?? {};
  const clean = () => Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== ""));

  const show = async () => {
    setRunning(true);
    setError(null);
    try {
      setRun(await reportsApi.run(key, clean()));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setRunning(false);
    }
  };

  // The report once with its defaults when the page opens.
  useEffect(() => {
    if (values && first.current) {
      first.current = false;
      void show();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [values]);

  const take = async (format: ReportFormat) => {
    try {
      const f = await reportsApi.file(key, clean(), format);
      if (f.note) showToast(f.note, "warning");
      saveBlob(f.blob, f.filename);
    } catch (err) {
      showToast(errorMessage(err), "error");
    }
  };
  const onFilters = useCallback((v: Record<string, string>) => setValues(v), []);

  if (info.isError) return <FormAlert>{errorMessage(info.error)}</FormAlert>;
  if (!info.data || !values) return <PageLoader />;
  const r = info.data;
  const jasper = r.engine.startsWith("Jasper");

  return (
    <>
      <PageHeader
        title={r.label}
        description={r.description}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Link href="/reports" className="px-4 text-xs font-bold uppercase tracking-widest text-primary hover:opacity-70">
              All reports
            </Link>
            <Pill tone={jasper ? "primary" : "neutral"}>{r.engine}</Pill>
            {r.customId && r.canBuild && (
              <Link href={`/reports/builder/${r.customId}`} className="inline-flex items-center gap-1 px-6 py-2.5 font-medium rounded-md bg-surface-high text-primary hover:bg-surface-highest transition-all duration-300">
                <span className="material-symbols-outlined text-lg">edit</span>
                Edit report
              </Link>
            )}
          </div>
        }
      />
      {r.canDesign && (
        <div className="mb-4">
          <Tabs tabs={[{ id: "report", label: "Report" }, { id: "design", label: "Design (Jasper)" }]} activeTab={tab} onChange={setTab} />
        </div>
      )}
      <Card className="mb-6">
        <ReportFilters filters={r.filters} values={values} onChange={onFilters} limits={r.limits} />
        <div className="flex flex-wrap items-center gap-2 mt-5">
          <Button onClick={show} disabled={running}>
            <span className="material-symbols-outlined text-lg align-middle mr-1">table_view</span>
            {running ? "Working…" : "Show"}
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              setNote(null);
              setPdf({ filters: clean(), n: Date.now() });
            }}
          >
            <span className="material-symbols-outlined text-lg align-middle mr-1">picture_as_pdf</span>
            PDF
          </Button>
          <Button variant="secondary" onClick={() => take("xlsx")}>
            <span className="material-symbols-outlined text-lg align-middle mr-1">grid_on</span>
            Excel
          </Button>
          {jasper && (
            <Button variant="secondary" onClick={() => take("docx")}>
              <span className="material-symbols-outlined text-lg align-middle mr-1">description</span>
              Word
            </Button>
          )}
        </div>
      </Card>

      {tab === "design" && r.canDesign ? (
        <ReportDesignPanel reportKey={key} label={r.label} filters={clean()} />
      ) : (
        <Card padding="none" className="overflow-hidden">
          {error && (
            <div className="p-5">
              <FormAlert>{error}</FormAlert>
            </div>
          )}
          {run && (
            <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-4 border-b border-outline-variant/20">
              <p className="text-sm text-on-surface-variant">
                {run.subtitle && <span className="font-semibold text-primary">{run.subtitle}</span>}
                {run.subtitle && " · "}
                {run.count.toLocaleString("en-IN")} {run.count === 1 ? "row" : "rows"}
              </p>
              {run.truncated && <Pill tone="warning">Showing the first {run.rows.length.toLocaleString("en-IN")}: the PDF and Excel have them all</Pill>}
            </div>
          )}
          {run ? <ReportTable run={run} /> : !error && <PageLoader label="Working out the report…" />}
        </Card>
      )}

      {pdf && (
        <PdfViewer
          load={async () => {
            const f = await reportsApi.file(key, pdf.filters, "pdf");
            setNote(f.note);
            return f.blob;
          }}
          loadKey={String(pdf.n)}
          title={r.label}
          filename={`${r.key}.pdf`}
          loadingLabel="Making the report…"
          onClose={() => setPdf(null)}
        >
          {note && <FormAlert tone="warning">{note}</FormAlert>}
        </PdfViewer>
      )}
    </>
  );
}

export default function ReportPage() {
  return (
    <RequirePermission permission="report.view">
      <Suspense>
        <Report />
      </Suspense>
    </RequirePermission>
  );
}
