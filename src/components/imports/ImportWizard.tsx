"use client";

/**
 * Excel import screen shared by every module:
 *   1. download the template  2. choose the filled file and check it (nothing is saved)
 *   3. see each row's problems  4. import the good rows  5. result (+ download).
 */
import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { FormAlert, Pill } from "@/components/forms";
import { CheckResult, ImportColumnInfo, importsApi, RunResult } from "@/lib/api/imports";
import { errorMessage } from "@/lib/api/client";
import { formatDateTime } from "@/components/admin/labels";

const csvCell = (v: unknown) => {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

const saveCsv = (name: string, rows: Record<string, string>[]) => {
  const headers = Object.keys(rows[0] ?? {});
  const text = [headers.map(csvCell).join(","), ...rows.map((r) => headers.map((h) => csvCell(r[h])).join(","))].join("\r\n");
  const href = URL.createObjectURL(new Blob(["﻿" + text], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = href;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(href), 10_000);
};

const TYPE_HINT: Partial<Record<ImportColumnInfo["type"], string>> = {
  email: "An email address",
  mobile: "A mobile number",
  number: "A number",
  date: "A date like 15-08-2012",
};

/** What goes in each column, with every allowed value and what it means (same as the template's sheets). */
function ColumnGuide({ kind }: { kind: string }) {
  const columns = useQuery({ queryKey: ["import-columns", kind], queryFn: () => importsApi.columns(kind) });
  if (!columns.data) return null;
  return (
    <details open className="group rounded-xl border border-outline-variant/30">
      <summary className="cursor-pointer select-none px-4 py-3 text-sm font-bold text-primary flex items-center gap-2">
        <span className="material-symbols-outlined text-lg transition-transform group-open:rotate-90">chevron_right</span>
        What goes in each column
      </summary>
      <div className="divide-y divide-outline-variant/20 border-t border-outline-variant/20">
        {columns.data.map((c) => (
          <div key={c.key} className="grid grid-cols-1 md:grid-cols-[180px_1fr] gap-2 px-4 py-3">
            <div>
              <p className="text-sm font-bold text-on-surface">{c.header}</p>
              {c.required ? <Pill tone="warning">Required</Pill> : <span className="text-xs text-on-surface-variant/60">Optional</span>}
            </div>
            <div className="space-y-2 text-sm text-on-surface-variant">
              {(c.help || TYPE_HINT[c.type]) && <p>{c.help ?? TYPE_HINT[c.type]}</p>}
              {c.example && (
                <p className="text-xs">
                  Example: <code className="px-1.5 py-0.5 rounded bg-surface-container-low text-on-surface">{c.example}</code>
                </p>
              )}
              {c.choices && (
                <div className="space-y-1">
                  <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant/60">
                    {c.type === "list" ? "Use one or more, separated by commas" : "Use one of these"}
                  </p>
                  <ul className="grid grid-cols-1 lg:grid-cols-2 gap-x-6 gap-y-1">
                    {c.choices.map((ch) => (
                      <li key={ch.value}>
                        <span className="font-bold text-on-surface">{ch.value}</span>
                        {ch.help && <span className="text-on-surface-variant/70"> · {ch.help}</span>}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </details>
  );
}

function Step({ n, title, children, done }: { n: number; title: string; children: React.ReactNode; done?: boolean }) {
  return (
    <Card className="space-y-4">
      <div className="flex items-center gap-3">
        <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black ${done ? "bg-emerald-500 text-white" : "bg-primary text-white"}`}>
          {done ? <span className="material-symbols-outlined text-base">check</span> : n}
        </span>
        <h2 className="text-lg font-bold text-primary">{title}</h2>
      </div>
      {children}
    </Card>
  );
}

export function ImportWizard({
  kind,
  noun,
  resultTitle,
  resultWarning,
}: {
  kind: string;
  /** e.g. "users" */
  noun: string;
  resultTitle: string;
  /** Shown above the result, e.g. "The one-time passwords are shown only now." */
  resultWarning?: string;
}) {
  const queryClient = useQueryClient();
  const fileInput = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [checked, setChecked] = useState<CheckResult | null>(null);
  const [result, setResult] = useState<RunResult | null>(null);
  const [onlyProblems, setOnlyProblems] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const recent = useQuery({ queryKey: ["imports", kind], queryFn: () => importsApi.recent(kind) });

  const run = async (label: string, fn: () => Promise<void>) => {
    setBusy(label);
    setError(null);
    try {
      await fn();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  const reset = () => {
    setFile(null);
    setChecked(null);
    setResult(null);
    setOnlyProblems(false);
    if (fileInput.current) fileInput.current.value = "";
  };

  const problems = checked ? checked.rows.filter((r) => !r.ok).length : 0;
  const ready = checked?.job.validRows ?? 0;
  const shownRows = (checked?.rows ?? []).filter((r) => !onlyProblems || !r.ok);

  if (result) {
    const rows = result.results.map((r) => r.values);
    const headers = Object.keys(rows[0] ?? {});
    return (
      <div className="space-y-6 max-w-5xl">
        <FormAlert tone={result.job.importedRows ? "success" : "warning"}>
          {result.job.importedRows} {noun} imported{result.job.problemCount ? `, ${result.job.problemCount} problem${result.job.problemCount === 1 ? "" : "s"} skipped` : ""}.
        </FormAlert>
        {result.problems.map((p) => (
          <FormAlert key={p}>{p}</FormAlert>
        ))}
        {rows.length > 0 && (
          <Card className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-primary">{resultTitle}</h2>
              <Button variant="secondary" onClick={() => saveCsv(`${kind}-imported.csv`, rows)}>
                Download (CSV)
              </Button>
            </div>
            {resultWarning && <FormAlert tone="warning">{resultWarning}</FormAlert>}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[10px] uppercase tracking-widest text-on-surface-variant/60">
                    {headers.map((h) => (
                      <th key={h} className="px-4 py-2 font-bold">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={i} className="border-t border-outline-variant/10">
                      {headers.map((h) => (
                        <td key={h} className="px-4 py-2 font-mono text-xs">
                          {r[h]}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
        <div className="flex gap-3">
          {result.job.problemCount > 0 && (
            <Button variant="secondary" onClick={() => run("report", () => importsApi.problems(result.job.id))} disabled={!!busy}>
              Download the skipped rows’ problems
            </Button>
          )}
          <Button onClick={reset}>Import another file</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl">
      {error && <FormAlert>{error}</FormAlert>}

      <Step n={1} title="Download the template">
        <p className="text-sm text-on-surface-variant">
          It has the right columns (* = required) and drop-down lists. Clicking a cell shows a tip, and the &ldquo;Allowed values&rdquo; sheet lists every
          choice. Fill one row per {noun.replace(/s$/, "")}.
        </p>
        <ColumnGuide kind={kind} />
        <Button variant="secondary" disabled={!!busy} onClick={() => run("template", () => importsApi.template(kind))}>
          {busy === "template" ? "Preparing…" : "Download template"}
        </Button>
      </Step>

      <Step n={2} title="Upload the filled file" done={!!checked}>
        <p className="text-sm text-on-surface-variant">Every row is checked first. Nothing is saved until you press Import.</p>
        <div className="flex flex-wrap items-center gap-3">
          <input
            ref={fileInput}
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            onChange={(e) => {
              setFile(e.target.files?.[0] ?? null);
              setChecked(null);
            }}
            className="text-sm file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:bg-surface-high file:text-primary file:font-semibold"
          />
          <Button disabled={!file || !!busy} onClick={() => file && run("check", async () => setChecked(await importsApi.check(kind, file)))}>
            {busy === "check" ? "Checking…" : "Check file"}
          </Button>
        </div>
      </Step>

      {checked && (
        <Step n={3} title="Review and import">
          {checked.problems.map((p) => (
            <FormAlert key={p}>{p}</FormAlert>
          ))}
          {!checked.problems.length && (
            <>
              <div className="flex flex-wrap items-center gap-3">
                <Pill tone="success">{ready} ready</Pill>
                {problems > 0 && <Pill tone="danger">{problems} with problems (will be skipped)</Pill>}
                <span className="text-sm text-on-surface-variant/70">of {checked.job.totalRows} rows</span>
                {problems > 0 && (
                  <label className="ml-auto flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox" checked={onlyProblems} onChange={(e) => setOnlyProblems(e.target.checked)} className="accent-[#1A365D]" />
                    Show only rows with problems
                  </label>
                )}
              </div>
              <div className="overflow-x-auto max-h-[480px] overflow-y-auto border border-outline-variant/20 rounded-xl">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-surface-lowest">
                    <tr className="text-left text-[10px] uppercase tracking-widest text-on-surface-variant/60">
                      <th className="px-4 py-2 font-bold">Row</th>
                      {checked.columns.map((c) => (
                        <th key={c.key} className="px-4 py-2 font-bold">
                          {c.header}
                        </th>
                      ))}
                      <th className="px-4 py-2 font-bold">Check</th>
                    </tr>
                  </thead>
                  <tbody>
                    {shownRows.map((r) => (
                      <tr key={r.row} className={`border-t border-outline-variant/10 ${r.ok ? "" : "bg-error-container/20"}`}>
                        <td className="px-4 py-2 text-on-surface-variant">{r.row}</td>
                        {checked.columns.map((c) => (
                          <td key={c.key} className="px-4 py-2">
                            {r.values[c.key] ?? ""}
                          </td>
                        ))}
                        <td className="px-4 py-2">
                          {r.ok ? (
                            <span className="text-emerald-700 font-semibold">Ready</span>
                          ) : (
                            <ul className="text-xs text-error space-y-0.5">
                              {r.issues.map((i, k) => (
                                <li key={k}>
                                  <b>{i.field}</b> {i.message}
                                </li>
                              ))}
                            </ul>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {checked.rows.length < checked.job.totalRows && (
                <p className="text-xs text-on-surface-variant/60">Showing the first {checked.rows.length} rows; all rows are checked and imported.</p>
              )}
              <div className="flex gap-3">
                <Button disabled={!ready || !!busy} onClick={() => setConfirming(true)}>
                  Import {ready} {noun}
                </Button>
                {problems > 0 && (
                  <Button variant="secondary" disabled={!!busy} onClick={() => run("report", () => importsApi.problems(checked.job.id))}>
                    Download problems
                  </Button>
                )}
              </div>
            </>
          )}
        </Step>
      )}

      {!!recent.data?.length && (
        <Card className="space-y-3">
          <h2 className="text-lg font-bold text-primary">Recent imports</h2>
          <ul className="divide-y divide-outline-variant/15 text-sm">
            {recent.data.map((j) => (
              <li key={j.id} className="flex items-center justify-between py-2">
                <span>
                  {j.fileName ?? "file"} · {formatDateTime(j.createdAt)}
                </span>
                <span className="text-on-surface-variant">
                  {j.status === "done" ? `${j.importedRows} imported` : j.status === "validated" ? "Checked, not imported" : j.status === "failed" ? "Could not be read" : "Importing…"}
                  {j.problemCount ? ` · ${j.problemCount} problems` : ""}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Modal isOpen={confirming} onClose={() => setConfirming(false)} title={`Import ${ready} ${noun}?`}>
        <p className="text-sm text-on-surface-variant">
          {problems ? `${problems} row${problems === 1 ? " has" : "s have"} problems and will be skipped. ` : ""}This can&apos;t be undone in one step.
        </p>
        <div className="flex justify-end gap-3 mt-6">
          <Button variant="secondary" onClick={() => setConfirming(false)} disabled={!!busy}>
            Cancel
          </Button>
          <Button
            disabled={!!busy}
            onClick={() =>
              run("import", async () => {
                const r = await importsApi.run(checked!.job.id);
                setConfirming(false);
                setResult(r);
                await queryClient.invalidateQueries({ queryKey: ["imports", kind] });
                await queryClient.invalidateQueries({ queryKey: [kind] });
              })
            }
          >
            {busy === "import" ? "Importing…" : "Import"}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
