"use client";

import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { FormAlert, Pill, Select } from "@/components/forms";
import { PageLoader } from "@/components/ui/PageLoader";
import { useToast } from "@/components/ui/ToastProvider";
import { useConfirm } from "@/components/ui/ConfirmProvider";
import { PdfViewer } from "@/components/documents/PdfViewer";
import { ApiError, errorMessage, saveBlob } from "@/lib/api/client";
import { builderApi, ReportDesigns, ReportEngine, reportsApi } from "@/lib/api/reports";

const when = (iso: string) => new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });
const problem = (err: unknown) => (err instanceof ApiError && err.details.length ? `${err.message}\n${err.details.map((d) => d.message).join("\n")}` : errorMessage(err));

/** How a report's files are made: the school's Jasper designs (versions), the built-in design, or the plain table. */
export function ReportDesignPanel({ reportKey, label, filters }: { reportKey: string; label: string; filters: Record<string, string> }) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const confirm = useConfirm();
  const designs = useQuery({ queryKey: ["report-designs", reportKey], queryFn: () => reportsApi.designs(reportKey) });
  const [file, setFile] = useState<File | null>(null);
  const [note, setNote] = useState("");
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ id: string; title: string } | null>(null);
  const input = useRef<HTMLInputElement>(null);

  const refresh = (d?: ReportDesigns) => {
    if (d) queryClient.setQueryData(["report-designs", reportKey], d);
    queryClient.invalidateQueries({ queryKey: ["report", reportKey] });
    queryClient.invalidateQueries({ queryKey: ["reports"] });
  };
  const act = async (fn: () => Promise<ReportDesigns>, done: string) => {
    try {
      refresh(await fn());
      showToast(done, "success");
    } catch (err) {
      showToast(errorMessage(err), "error");
    }
  };
  const download = async (id: string) => {
    try {
      const f = await reportsApi.downloadDesign(reportKey, id);
      saveBlob(f.blob, f.filename);
    } catch (err) {
      showToast(errorMessage(err), "error");
    }
  };

  if (designs.isError) return <FormAlert>{errorMessage(designs.error)}</FormAlert>;
  if (!designs.data) return <PageLoader />;
  const d = designs.data;
  const active = d.versions.find((v) => v.isActive);

  const upload = async () => {
    if (!file) return;
    setUploadError(null);
    try {
      const r = await reportsApi.upload(reportKey, await file.text(), file.name, note.trim() || undefined);
      showToast(`Version ${r.version} uploaded. Preview it, then choose “Use” to put it in use.`, "success");
      for (const w of r.warnings) showToast(w, "warning");
      setFile(null);
      setNote("");
      if (input.current) input.current.value = "";
      refresh();
      await designs.refetch();
    } catch (err) {
      setUploadError(problem(err));
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h3 className="font-black text-primary mb-1">How this report is made</h3>
            <p className="text-sm text-on-surface-variant max-w-2xl">
              {d.engine === "builtin"
                ? "Always the built-in table layout (no Jasper)."
                : active
                  ? `With the school’s Jasper design, version ${active.version} (${active.fileName}).`
                  : d.hasBuiltInDesign
                    ? "With the built-in Jasper design."
                    : "With the built-in table layout: upload a Jasper design to print it in your own format."}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {d.service.running ? <Pill tone="success">Report service running · JasperReports {d.service.version}</Pill> : <Pill tone="warning">Report service not running</Pill>}
          </div>
        </div>
        {!d.service.running && (
          <div className="mt-4">
            <FormAlert tone="warning">
              The report service (Jasper) is not running, so reports use the built-in table layout and designs can’t be checked or uploaded. On the server, start it with
              <code className="font-mono mx-1">npm run jasper</code> in the backend folder.
            </FormAlert>
          </div>
        )}
        <div className="mt-4 max-w-sm">
          <Select
            label="Engine"
            value={d.engine === "builtin" ? "builtin" : "auto"}
            onChange={(v) => act(() => reportsApi.setEngine(reportKey, v as ReportEngine), "Saved")}
            options={[
              { value: "auto", label: "Automatic: the Jasper design when there is one" },
              { value: "builtin", label: "Built-in table layout (no Jasper)" },
            ]}
          />
        </div>
      </Card>

      <Card padding="none" className="overflow-hidden">
        <div className="px-5 py-4 border-b border-outline-variant/20">
          <h3 className="font-black text-primary">Designs</h3>
          <p className="text-xs text-on-surface-variant mt-1">Each upload is kept as a version. Preview one with the filters above, then choose “Use”.</p>
        </div>
        <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[10px] uppercase tracking-widest text-on-surface-variant/60">
              <th className="px-5 py-3 font-bold">Design</th>
              <th className="px-5 py-3 font-bold">Uploaded</th>
              <th className="px-5 py-3 font-bold">Note</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody>
            {d.hasBuiltInDesign && (
              <tr className="border-t border-outline-variant/10">
                <td className="px-5 py-3">
                  <span className="font-semibold">Built-in design</span> {!active && d.engine !== "builtin" && <Pill tone="success">In use</Pill>}
                </td>
                <td className="px-5 py-3 text-xs text-on-surface-variant">Comes with the ERP</td>
                <td className="px-5 py-3 text-xs text-on-surface-variant">A starting point for your own</td>
                <td className="px-5 py-3">
                  <div className="flex justify-end gap-4 text-xs font-bold uppercase tracking-widest text-primary">
                    <button type="button" className="hover:opacity-70" disabled={!d.service.running} onClick={() => setPreview({ id: "builtin", title: `${label} · built-in design` })}>
                      Preview
                    </button>
                    <button type="button" className="hover:opacity-70" onClick={() => download("builtin")}>
                      Download
                    </button>
                    {active && (
                      <button type="button" className="hover:opacity-70" onClick={() => act(() => reportsApi.reset(reportKey), "Back to the built-in design")}>
                        Use
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            )}
            {d.versions.map((v) => (
              <tr key={v.id} className="border-t border-outline-variant/10">
                <td className="px-5 py-3">
                  <span className="font-semibold">Version {v.version}</span> <span className="text-xs font-mono text-on-surface-variant">{v.fileName}</span> {v.isActive && <Pill tone="success">In use</Pill>}
                </td>
                <td className="px-5 py-3 text-xs text-on-surface-variant">
                  {when(v.createdAt)}
                  {v.uploadedBy ? ` · ${v.uploadedBy}` : ""}
                </td>
                <td className="px-5 py-3 text-xs text-on-surface-variant">{v.note ?? "—"}</td>
                <td className="px-5 py-3">
                  <div className="flex justify-end gap-4 text-xs font-bold uppercase tracking-widest text-primary">
                    <button type="button" className="hover:opacity-70" disabled={!d.service.running} onClick={() => setPreview({ id: v.id, title: `${label} · version ${v.version}` })}>
                      Preview
                    </button>
                    <button type="button" className="hover:opacity-70" onClick={() => download(v.id)}>
                      Download
                    </button>
                    {!v.isActive && (
                      <button type="button" className="hover:opacity-70" onClick={() => act(() => reportsApi.activate(reportKey, v.id), `Version ${v.version} is in use`)}>
                        Use
                      </button>
                    )}
                    {!v.isActive && (
                      <button
                        type="button"
                        className="text-error hover:opacity-70"
                        onClick={async () => {
                          if (!(await confirm({ title: `Delete version ${v.version}?`, message: `${v.fileName} is removed. This can’t be undone.`, confirmLabel: "Delete", danger: true }))) return;
                          await act(() => reportsApi.remove(reportKey, v.id), "Version deleted");
                        }}
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {!d.hasBuiltInDesign && !d.versions.length && (
              <tr>
                <td colSpan={4} className="px-5 py-8 text-center text-on-surface-variant/70">
                  No designs yet. This report prints with the built-in table layout.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        </div>
      </Card>

      <Card>
        <h3 className="font-black text-primary mb-1">Upload a design</h3>
        <p className="text-xs text-on-surface-variant mb-4">A .jrxml file made in Jaspersoft Studio 7. It is checked by the report service first and is not used until you choose “Use”.</p>
        <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-4 items-end">
          <label className="flex flex-col gap-2">
            <span className="text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-widest ml-1">Design file (.jrxml)</span>
            <input
              ref={input}
              type="file"
              accept=".jrxml,.xml"
              onChange={(e) => {
                setFile(e.target.files?.[0] ?? null);
                setUploadError(null);
              }}
              className="text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-primary/10 file:px-3 file:py-2 file:text-xs file:font-bold file:text-primary"
            />
          </label>
          <Input label="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. New letterhead, board format" />
          <Button disabled={!file || !d.service.running} onClick={upload}>
            Upload
          </Button>
        </div>
        {uploadError && (
          <div className="mt-4">
            <FormAlert>
              <span className="whitespace-pre-wrap">{uploadError}</span>
            </FormAlert>
          </div>
        )}
      </Card>

      <Card>
        <h3 className="font-black text-primary mb-3">Making your own design</h3>
        <ol className="list-decimal ml-5 space-y-2 text-sm text-on-surface-variant">
          <li>
            Download {d.hasBuiltInDesign ? <>the <b>built-in design</b> (above) or </> : null}a design{" "}
            <button
              type="button"
              className="font-bold text-primary underline"
              onClick={async () => {
                try {
                  const f = await builderApi.generatedDesign(reportKey);
                  saveBlob(f.blob, f.filename);
                } catch (err) {
                  showToast(errorMessage(err), "error");
                }
              }}
            >
              made from this report’s columns
            </button>
            , and the{" "}
            <button
              type="button"
              className="font-bold text-primary underline"
              onClick={async () => {
                try {
                  const f = await reportsApi.sample(reportKey, filters);
                  saveBlob(f.blob, f.filename);
                } catch (err) {
                  showToast(errorMessage(err), "error");
                }
              }}
            >
              sample data
            </button>{" "}
            (the report’s rows for the filters above).
          </li>
          <li>
            In <b>Jaspersoft Studio 7</b> (free), open the design. Add a data adapter of type <b>JSON File</b> on the sample data, and use <code className="font-mono">rows</code> as the query.
          </li>
          <li>
            Change the layout. Use the font <b>School</b> so Hindi and the ₹ sign print correctly. Write amounts with the pattern <code className="font-mono">₹ #,##,##0</code> for lakhs and crores.
          </li>
          <li>Upload the .jrxml here, preview it, and choose “Use”.</li>
        </ol>
      </Card>

      <Card padding="none" className="overflow-hidden">
        <div className="px-5 py-4 border-b border-outline-variant/20">
          <h3 className="font-black text-primary">Fields and parameters the ERP fills</h3>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2">
          <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[10px] uppercase tracking-widest text-on-surface-variant/60">
                <th className="px-5 py-2 font-bold">Field ($F)</th>
                <th className="px-5 py-2 font-bold">Type</th>
              </tr>
            </thead>
            <tbody>
              {d.fields.map((f) => (
                <tr key={f.name} className="border-t border-outline-variant/10">
                  <td className="px-5 py-1.5">
                    <span className="font-mono text-xs text-primary">{f.name}</span> <span className="text-xs text-on-surface-variant">{f.label}</span>
                  </td>
                  <td className="px-5 py-1.5 font-mono text-[11px] text-on-surface-variant">{f.type}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
          <div className="overflow-x-auto">
          <table className="w-full text-sm lg:border-l border-outline-variant/20">
            <thead>
              <tr className="text-left text-[10px] uppercase tracking-widest text-on-surface-variant/60">
                <th className="px-5 py-2 font-bold">Parameter ($P)</th>
                <th className="px-5 py-2 font-bold">Type</th>
              </tr>
            </thead>
            <tbody>
              {d.parameters.map((p) => (
                <tr key={p.name} className="border-t border-outline-variant/10">
                  <td className="px-5 py-1.5">
                    <span className="font-mono text-xs text-primary">{p.name}</span> <span className="text-xs text-on-surface-variant">{p.description}</span>
                  </td>
                  <td className="px-5 py-1.5 font-mono text-[11px] text-on-surface-variant">{p.type}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      </Card>

      {preview && (
        <PdfViewer
          load={async () => (await reportsApi.preview(reportKey, preview.id, filters)).blob}
          loadKey={`${preview.id}|${JSON.stringify(filters)}`}
          title={preview.title}
          filename={`${reportKey}-preview.pdf`}
          loadingLabel="Making the report…"
          onClose={() => setPreview(null)}
        />
      )}
    </div>
  );
}
