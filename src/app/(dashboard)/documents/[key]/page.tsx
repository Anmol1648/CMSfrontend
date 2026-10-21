"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Tabs } from "@/components/ui/Tabs";
import { Checkbox, FormAlert, Pill, Select } from "@/components/forms";
import { PageHeader } from "@/components/layout/AppShell";
import { PageLoader } from "@/components/ui/PageLoader";
import { useToast } from "@/components/ui/ToastProvider";
import { useConfirm } from "@/components/ui/ConfirmProvider";
import { RequirePermission } from "@/lib/auth/RequirePermission";
import { documentsApi, Paper, PAPER_SIZES, PaperSize } from "@/lib/api/documents";
import { ApiError, errorMessage } from "@/lib/api/client";

// A template mistake comes with the place it is in (in details): show that too.
const templateError = (err: unknown) => (err instanceof ApiError && err.details.length ? err.details.map((d) => d.message).join("\n") : errorMessage(err));

const codeBox = "w-full rounded-xl bg-[#0f1b2d] text-[#e2e8f0] font-mono text-[12px] leading-5 p-4 outline-none focus:ring-2 focus:ring-primary/30 resize-none";

function Editor() {
  const { key } = useParams<{ key: string }>();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const confirm = useConfirm();
  const tpl = useQuery({ queryKey: ["document-template", key], queryFn: () => documentsApi.template(key) });
  const [html, setHtml] = useState("");
  const [css, setCss] = useState("");
  const [paper, setPaper] = useState<Paper | null>(null);
  const [copiesText, setCopiesText] = useState("");
  const [tab, setTab] = useState("html");
  const [preview, setPreview] = useState<string | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const loaded = useRef(false);

  useEffect(() => {
    if (!tpl.data || loaded.current) return;
    loaded.current = true;
    setHtml(tpl.data.html);
    setCss(tpl.data.css);
    setPaper(tpl.data.paper);
    setCopiesText(tpl.data.paper.copies.join(", "));
  }, [tpl.data]);

  const current = paper ? { html, css, paper: { ...paper, copies: copiesText.split(",").map((c) => c.trim()).filter(Boolean).slice(0, 4) } } : null;
  const currentKey = JSON.stringify(current);

  // A fresh preview a moment after each change.
  useEffect(() => {
    if (!current) return;
    const t = setTimeout(async () => {
      setPreviewing(true);
      try {
        const blob = await documentsApi.preview(key, current.paper.copies.length ? current : { ...current, paper: { ...current.paper, copies: ["Copy"] } });
        const url = URL.createObjectURL(new Blob([blob], { type: "application/pdf" }));
        setPreview((old) => {
          if (old) URL.revokeObjectURL(old);
          return url;
        });
        setError(null);
      } catch (err) {
        setError(templateError(err));
      } finally {
        setPreviewing(false);
      }
    }, 900);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentKey, key]);

  if (tpl.isError) return <FormAlert>{errorMessage(tpl.error)}</FormAlert>;
  if (!tpl.data || !paper || !current) return <PageLoader />;
  const t = tpl.data;
  const dirty = html !== t.html || css !== t.css || JSON.stringify(current.paper) !== JSON.stringify({ ...t.paper, copies: t.paper.copies });

  const save = async () => {
    setBusy(true);
    try {
      const saved = await documentsApi.save(key, current);
      queryClient.setQueryData(["document-template", key], saved);
      showToast("Template saved: every new document uses it", "success");
    } catch (err) {
      setError(templateError(err));
      if (err instanceof ApiError) showToast(err.message, "error");
    } finally {
      setBusy(false);
    }
  };
  const reset = async () => {
    if (!(await confirm({ title: "Go back to the built-in template?", message: "Your changes to this document are removed.", confirmLabel: "Use built-in", danger: true }))) return;
    const r = await documentsApi.reset(key);
    queryClient.setQueryData(["document-template", key], r);
    setHtml(r.html);
    setCss(r.css);
    setPaper(r.paper);
    setCopiesText(r.paper.copies.join(", "));
    showToast("Back to the built-in template", "success");
  };

  return (
    <>
      <PageHeader
        title={t.label}
        description={t.description}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Link href="/documents" className="px-4 text-xs font-bold uppercase tracking-widest text-primary hover:opacity-70">
              All documents
            </Link>
            {t.custom ? <Pill tone="primary">Changed by the school</Pill> : <Pill>Built-in</Pill>}
            {t.custom && (
              <Button variant="secondary" onClick={reset}>
                Use built-in
              </Button>
            )}
            <Button disabled={busy || !dirty} onClick={save}>
              {busy ? "Saving…" : "Save"}
            </Button>
          </div>
        }
      />
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="space-y-4 min-w-0">
          <Card>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Select label="Paper" value={paper.size} onChange={(v) => setPaper({ ...paper, size: v as PaperSize })} options={(Object.keys(PAPER_SIZES) as PaperSize[]).map((k) => ({ value: k, label: PAPER_SIZES[k] }))} />
              <Select label="Orientation" value={paper.orientation} onChange={(v) => setPaper({ ...paper, orientation: v as Paper["orientation"] })} options={[{ value: "portrait", label: "Portrait" }, { value: "landscape", label: "Landscape" }]} />
              <Input label="Margin (mm)" type="number" min={0} max={30} value={String(paper.margin)} onChange={(e) => setPaper({ ...paper, margin: Math.max(0, Math.min(30, Number(e.target.value) || 0)) })} />
              <Input label="Copies (comma separated)" value={copiesText} onChange={(e) => setCopiesText(e.target.value)} placeholder="School copy, Parent copy" />
            </div>
            <div className="mt-3">
              <Checkbox label="All copies on one page, with a cut line" checked={!!paper.copiesOnOnePage} onChange={(v) => setPaper({ ...paper, copiesOnOnePage: v })} />
            </div>
          </Card>
          <Card>
            <Tabs tabs={[{ id: "html", label: "Layout (HTML)" }, { id: "css", label: "Style (CSS)" }, { id: "fields", label: "Fields you can use" }]} activeTab={tab} onChange={setTab} />
            <div className="mt-4">
              {tab === "html" && <textarea value={html} onChange={(e) => setHtml(e.target.value)} spellCheck={false} className={codeBox} style={{ height: "62vh" }} aria-label="Template layout" />}
              {tab === "css" && <textarea value={css} onChange={(e) => setCss(e.target.value)} spellCheck={false} className={codeBox} style={{ height: "62vh" }} aria-label="Template style" />}
              {tab === "fields" && (
                <div className="max-h-[62vh] overflow-y-auto">
                  <p className="text-xs text-on-surface-variant mb-3">
                    Write a field as <code className="font-mono">{"{{receipt.receiptNo}}"}</code>. Lists: <code className="font-mono">{"{{#each list}} … {{/each}}"}</code>; only when there is something:{" "}
                    <code className="font-mono">{"{{#if x}} … {{/if}}"}</code>.
                  </p>
                  <table className="w-full text-sm">
                    <tbody>
                      {t.fields.map((f) => (
                        <tr key={f.key} className="border-t border-outline-variant/10">
                          <td className="py-1.5 pr-3 font-mono text-xs text-primary whitespace-nowrap">{f.key}</td>
                          <td className="py-1.5 text-xs text-on-surface-variant">{f.label}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </Card>
        </div>
        <Card className="min-w-0">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-black uppercase tracking-widest text-primary">Preview</h3>
            <span className="text-xs text-on-surface-variant/70 flex items-center gap-2">
              {previewing && <span className="w-3.5 h-3.5 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />}
              {previewing ? "Updating…" : "With a real record of your school"}
            </span>
          </div>
          {error && (
            <div className="mb-3">
              <FormAlert>
                <span className="whitespace-pre-wrap">{error}</span>
              </FormAlert>
            </div>
          )}
          {preview ? (
            <iframe src={preview} title="Preview" className="w-full rounded-xl border border-outline-variant/20 bg-white" style={{ height: "78vh" }} />
          ) : (
            <PageLoader label="Making the preview…" />
          )}
        </Card>
      </div>
    </>
  );
}

export default function DocumentTemplatePage() {
  return (
    <RequirePermission permission="documents.manage">
      <Editor />
    </RequirePermission>
  );
}
