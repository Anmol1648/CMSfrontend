"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { FormAlert, Pill } from "@/components/forms";
import { PageHeader } from "@/components/layout/AppShell";
import { PageLoader } from "@/components/ui/PageLoader";
import { useConfirm } from "@/components/ui/ConfirmProvider";
import { useToast } from "@/components/ui/ToastProvider";
import { RequirePermission } from "@/lib/auth/RequirePermission";
import { authedImageUrl, errorMessage } from "@/lib/api/client";
import { MyResult, showAnswer, Taking, testsApi } from "@/lib/api/tests";
import { cn } from "@/lib/utils";

const mmss = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

function QImage({ testId, tqId }: { testId: string; tqId: string }) {
  const q = useQuery({ queryKey: ["test-image", testId, tqId], queryFn: () => authedImageUrl(testsApi.imagePath(testId, tqId)), staleTime: Infinity });
  // eslint-disable-next-line @next/next/no-img-element
  return q.data ? <img src={q.data} alt="" className="max-h-56 rounded-lg border border-outline-variant/20" /> : null;
}

function ResultView({ r }: { r: MyResult }) {
  if (!r.visible)
    return (
      <Card className="space-y-2 text-center">
        <p className="font-bold text-primary">{r.status === "not_taken" ? "Not taken." : "Submitted. ✓"}</p>
        {r.status !== "not_taken" && <p className="text-sm text-on-surface-variant/80">The result will show here when the teacher publishes it.</p>}
        <Link href="/my-tests" className="text-sm font-bold text-primary">
          Back to My Tests
        </Link>
      </Card>
    );
  return (
    <div className="space-y-4">
      <Card className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-extrabold text-primary text-lg">{r.test.title}</p>
          <p className="text-sm text-on-surface-variant/70">{r.student}</p>
        </div>
        <p className="text-2xl font-extrabold text-primary">
          {r.score} <span className="text-base text-on-surface-variant/70">/ {r.test.totalMarks}</span>
        </p>
      </Card>
      {r.questions.map((q) => {
        const full = (q.got ?? 0) >= q.marks;
        return (
          <Card key={q.id} className="space-y-1.5">
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm font-semibold whitespace-pre-line">
                {q.n}. {q.text}
              </p>
              <Pill tone={q.got === null ? "neutral" : full ? "success" : (q.got ?? 0) > 0 ? "warning" : "danger"}>
                {q.got ?? "—"} / {q.marks}
              </Pill>
            </div>
            {q.imageFileId && <QImage testId={r.test.id} tqId={q.id} />}
            <p className="text-sm">
              <span className="text-on-surface-variant/70">Your answer: </span>
              {showAnswer(q, q.given)}
            </p>
            {(q.type === "mcq" || q.type === "multi") && (
              <p className="text-sm text-emerald-800">
                Correct: {q.options.map((o, i) => (o.correct ? `${String.fromCharCode(65 + i)}. ${o.text}` : null)).filter(Boolean).join(", ")}
              </p>
            )}
            {q.type === "true_false" && <p className="text-sm text-emerald-800">Correct: {q.answer === "true" ? "True" : "False"}</p>}
            {q.type === "fill" && <p className="text-sm text-emerald-800">Correct: {q.answer?.split("|").join(" / ")}</p>}
            {(q.type === "short" || q.type === "long") && q.answer && <p className="text-xs text-on-surface-variant">Model answer: {q.answer}</p>}
            {q.note && <p className="text-xs text-primary">Teacher: {q.note}</p>}
            {q.explanation && <p className="text-[11px] text-on-surface-variant/70">Why: {q.explanation}</p>}
          </Card>
        );
      })}
    </div>
  );
}

function Take({ id }: { id: string }) {
  const queryClient = useQueryClient();
  const confirm = useConfirm();
  const { showToast } = useToast();
  const [t, setT] = useState<Taking | null>(null);
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<MyResult | null>(null);
  const [saved, setSaved] = useState<"saved" | "saving" | "failed">("saved");
  const [left, setLeft] = useState(0);
  const [n, setN] = useState(0);
  const offset = useRef(0);
  const dirty = useRef<Record<string, unknown>>({});
  const submitting = useRef(false);

  useEffect(() => {
    testsApi
      .start(id)
      .then((x) => {
        offset.current = new Date(x.now).getTime() - Date.now();
        setT(x);
        setAnswers((x.answers ?? {}) as Record<string, unknown>);
      })
      .catch((err) => setError(errorMessage(err)));
  }, [id]);

  const flush = useCallback(async () => {
    const batch = dirty.current;
    if (!Object.keys(batch).length) return;
    dirty.current = {};
    setSaved("saving");
    try {
      await testsApi.save(id, batch);
      setSaved("saved");
    } catch (err) {
      dirty.current = { ...batch, ...dirty.current };
      setSaved("failed");
      if (/time is up|submitted/i.test(errorMessage(err))) setError(errorMessage(err));
    }
  }, [id]);

  const submit = useCallback(
    async (auto: boolean) => {
      if (submitting.current) return;
      if (!auto && !(await confirm({ title: "Submit the test?", message: "You can’t change your answers after this.", confirmLabel: "Submit" }))) return;
      submitting.current = true;
      try {
        const r = await testsApi.submit(id, answers);
        setResult(r);
        queryClient.invalidateQueries({ queryKey: ["my-tests"] });
        if (auto) showToast("Time is up: your test was submitted", "info");
      } catch (err) {
        setError(errorMessage(err));
      } finally {
        submitting.current = false;
      }
    },
    [answers, confirm, id, queryClient, showToast]
  );

  // Autosave a moment after each change, and every few seconds.
  useEffect(() => {
    const h = setInterval(flush, 5000);
    return () => clearInterval(h);
  }, [flush]);
  // The clock (server time), and submitting when it runs out.
  useEffect(() => {
    if (!t || result) return;
    const tick = () => {
      const ms = new Date(t.dueAt).getTime() - (Date.now() + offset.current);
      setLeft(ms);
      if (ms <= 0) void submit(true);
    };
    tick();
    const h = setInterval(tick, 1000);
    return () => clearInterval(h);
  }, [t, result, submit]);
  // Warn before leaving with unsaved answers.
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (Object.keys(dirty.current).length) e.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, []);

  if (result) return <ResultView r={result} />;
  if (error && !t) return <FormAlert>{error}</FormAlert>;
  if (!t) return <PageLoader />;
  const answer = (qid: string, v: unknown) => {
    setAnswers((a) => ({ ...a, [qid]: v }));
    dirty.current[qid] = v;
    setSaved("saving");
    setTimeout(flush, 1200);
  };
  const q = t.questions[n];
  const has = (qid: string) => {
    const v = answers[qid];
    return !(v === undefined || v === null || v === "" || (Array.isArray(v) && !v.length));
  };
  const done = t.questions.filter((x) => has(x.id)).length;
  return (
    <div className="space-y-4">
      <Card className="flex flex-wrap items-center justify-between gap-3 sticky top-20 z-30">
        <div>
          <p className="font-extrabold text-primary">{t.test.title}</p>
          <p className="text-xs text-on-surface-variant/70">
            {done} of {t.questions.length} answered · {saved === "saving" ? "saving…" : saved === "failed" ? <span className="text-error">not saved, retrying</span> : "saved"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className={cn("text-2xl font-black tabular-nums", left < 60_000 ? "text-error" : left < 300_000 ? "text-amber-700" : "text-primary")} aria-live="polite">
            {mmss(left)}
          </span>
          <Button onClick={() => submit(false)}>Submit</Button>
        </div>
      </Card>
      {error && <FormAlert>{error}</FormAlert>}
      {n === 0 && t.test.instructions && <FormAlert tone="info">{t.test.instructions}{t.test.negativeMarks ? ` Wrong answers lose ${t.test.negativeMarks} marks.` : ""}</FormAlert>}
      <div className="flex flex-wrap gap-1.5">
        {t.questions.map((x, i) => (
          <button key={x.id} type="button" onClick={() => setN(i)} className={cn("w-9 h-9 rounded-lg text-sm font-bold border", i === n ? "bg-primary text-white border-primary" : has(x.id) ? "bg-emerald-50 border-emerald-300 text-emerald-800" : "border-outline-variant/40 text-on-surface-variant")} aria-label={`Question ${i + 1}`}>
            {i + 1}
          </button>
        ))}
      </div>
      <Card className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <p className="font-semibold whitespace-pre-line">
            {q.n}. {q.text}
          </p>
          <Pill>{q.marks} mark{q.marks === 1 ? "" : "s"}</Pill>
        </div>
        {q.hasImage && <QImage testId={t.test.id} tqId={q.id} />}
        {q.type === "mcq" && (
          <div className="space-y-2">
            {q.options.map((o, i) => (
              <label key={o.index} className={cn("flex items-center gap-3 rounded-xl border px-4 py-3 cursor-pointer", answers[q.id] === o.index ? "border-primary bg-primary/5" : "border-outline-variant/30 hover:bg-surface-container-low")}>
                <input type="radio" name={q.id} checked={answers[q.id] === o.index} onChange={() => answer(q.id, o.index)} className="accent-primary" />
                <span className="text-xs font-black text-on-surface-variant">{String.fromCharCode(65 + i)}</span>
                <span className="text-sm">{o.text}</span>
              </label>
            ))}
          </div>
        )}
        {q.type === "multi" && (
          <div className="space-y-2">
            <p className="text-xs text-on-surface-variant/70">Tick all that are right.</p>
            {q.options.map((o, i) => {
              const cur = (answers[q.id] as number[] | undefined) ?? [];
              const on = cur.includes(o.index);
              return (
                <label key={o.index} className={cn("flex items-center gap-3 rounded-xl border px-4 py-3 cursor-pointer", on ? "border-primary bg-primary/5" : "border-outline-variant/30 hover:bg-surface-container-low")}>
                  <input type="checkbox" checked={on} onChange={(e) => answer(q.id, e.target.checked ? [...cur, o.index] : cur.filter((x) => x !== o.index))} className="accent-primary" />
                  <span className="text-xs font-black text-on-surface-variant">{String.fromCharCode(65 + i)}</span>
                  <span className="text-sm">{o.text}</span>
                </label>
              );
            })}
          </div>
        )}
        {q.type === "true_false" && (
          <div className="flex gap-3">
            {["true", "false"].map((v) => (
              <button key={v} type="button" onClick={() => answer(q.id, v)} className={cn("flex-1 rounded-xl border px-4 py-3 text-sm font-bold", answers[q.id] === v ? "border-primary bg-primary text-white" : "border-outline-variant/30")}>
                {v === "true" ? "True" : "False"}
              </button>
            ))}
          </div>
        )}
        {q.type === "fill" && <input value={String(answers[q.id] ?? "")} onChange={(e) => answer(q.id, e.target.value)} maxLength={500} placeholder="Your answer" className="w-full rounded-xl bg-surface-container-low px-4 py-3 text-sm outline-none" aria-label="Your answer" />}
        {(q.type === "short" || q.type === "long") && <textarea value={String(answers[q.id] ?? "")} onChange={(e) => answer(q.id, e.target.value)} rows={q.type === "long" ? 10 : 4} maxLength={10_000} placeholder="Write your answer" className="w-full rounded-xl bg-surface-container-low px-4 py-3 text-sm outline-none" aria-label="Your answer" />}
        <div className="flex justify-between gap-3">
          <Button variant="secondary" onClick={() => setN(Math.max(0, n - 1))} disabled={n === 0}>
            Previous
          </Button>
          {n < t.questions.length - 1 ? <Button onClick={() => setN(n + 1)}>Next</Button> : <Button onClick={() => submit(false)}>Submit</Button>}
        </div>
      </Card>
    </div>
  );
}

function Page() {
  const { id } = useParams<{ id: string }>();
  const params = useSearchParams();
  const showResult = params.get("result") === "1";
  const student = params.get("student") ?? undefined;
  const r = useQuery({ queryKey: ["my-test-result", id, student], queryFn: () => testsApi.myResult(id, student), enabled: showResult });
  if (showResult) {
    if (r.isError) return <FormAlert>{errorMessage(r.error)}</FormAlert>;
    return r.data ? <ResultView r={r.data} /> : <PageLoader />;
  }
  return <Take id={id} />;
}

export default function MyTestPage() {
  return (
    <RequirePermission permission="test.take">
      <PageHeader title="Online test" />
      <Suspense fallback={<PageLoader />}>
        <Page />
      </Suspense>
    </RequirePermission>
  );
}
