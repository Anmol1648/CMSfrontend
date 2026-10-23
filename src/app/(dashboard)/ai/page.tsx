"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { FormAlert, Pill } from "@/components/forms";
import { PageHeader } from "@/components/layout/AppShell";
import { PageLoader } from "@/components/ui/PageLoader";
import { useToast } from "@/components/ui/ToastProvider";
import { useAuth } from "@/lib/auth/AuthProvider";
import { errorMessage } from "@/lib/api/client";
import { questionsApi } from "@/lib/api/questions";

const FEATURES: Record<string, string> = { generate_questions: "Writing questions", suggest_chapters: "Suggesting chapters", test: "Tests of the key", tutor: "AI tutor", quiz: "Practice quizzes", marking: "Marking help" };

function Usage() {
  const [month, setMonth] = useState("");
  const q = useQuery({ queryKey: ["ai-usage", month], queryFn: () => questionsApi.aiUsage(month || undefined) });
  const d = q.data;
  return (
    <Card className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <p className="font-extrabold text-primary">Usage</p>
        <Input label="Month" type="month" value={month || d?.month || ""} onChange={(e) => setMonth(e.target.value)} className="sm:w-44" />
      </div>
      {!d ? (
        <PageLoader />
      ) : (
        <>
          <p className="text-sm">
            <b>{d.requests}</b> requests · {d.tokens.toLocaleString("en-IN")} tokens in {d.month}
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60 mb-1">By feature</p>
              {d.features.map((f) => (
                <p key={f.feature} className="flex justify-between text-sm py-0.5">
                  <span>{FEATURES[f.feature] ?? f.feature}</span>
                  <span>
                    {f.requests}
                    {f.failed ? <span className="text-error"> · {f.failed} failed</span> : null}
                  </span>
                </p>
              ))}
              {!d.features.length && <p className="text-sm text-on-surface-variant/70">None.</p>}
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60 mb-1">Most use</p>
              {d.people.map((p) => (
                <p key={p.name} className="flex justify-between text-sm py-0.5">
                  <span>{p.name}</span>
                  <span>{p.requests}</span>
                </p>
              ))}
            </div>
          </div>
        </>
      )}
    </Card>
  );
}

function Setup() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const { can } = useAuth();
  const q = useQuery({ queryKey: ["ai-setup"], queryFn: questionsApi.aiSetup });
  const [key, setKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [reply, setReply] = useState<string | null>(null);
  const s = q.data;
  if (q.isError) return <FormAlert>{errorMessage(q.error)}</FormAlert>;
  if (!s) return <PageLoader />;
  const save = async () => {
    setBusy(true);
    try {
      queryClient.setQueryData(["ai-setup"], await questionsApi.saveAiKey(key));
      queryClient.invalidateQueries({ queryKey: ["ai-status"] });
      setKey("");
      showToast("Saved", "success");
    } catch (err) {
      showToast(errorMessage(err), "error");
    } finally {
      setBusy(false);
    }
  };
  const test = async () => {
    setBusy(true);
    setReply(null);
    try {
      setReply((await questionsApi.testAi()).reply);
      queryClient.invalidateQueries({ queryKey: ["ai-setup"] });
    } catch (err) {
      showToast(errorMessage(err), "error");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="space-y-4 max-w-3xl">
      <Card className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="font-extrabold text-primary">AI provider</p>
          <Pill tone={s.ready ? "success" : "warning"}>{s.ready ? "ready" : "not set up"}</Pill>
        </div>
        <p className="text-sm">
          {s.provider === "gemini" ? "Google Gemini" : s.provider} · model <b>{s.model}</b> ·{" "}
          <Link href="/settings" className="font-bold text-primary underline">
            change in System Settings → AI
          </Link>
        </p>
        {s.why && <FormAlert tone="info">{s.why}</FormAlert>}
        <p className="text-xs text-on-surface-variant/70">
          Today {s.usage.today} requests · this month {s.usage.month}
          {s.usage.monthlyLimit ? ` of ${s.usage.monthlyLimit}` : ""} · each person at most {s.usage.dailyPerUser} a day
        </p>
        {s.lastError?.error && <p className="text-xs text-error">Last problem ({new Date(s.lastError.createdAt).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}): {s.lastError.error}</p>}
        {can("ai.setup") && (
          <>
            <Input label={s.keySaved ? "API key (saved; type to replace, “-” to remove)" : "API key"} type="password" autoComplete="new-password" value={key} onChange={(e) => setKey(e.target.value)} />
            <p className="text-[11px] text-on-surface-variant/70">Kept encrypted and never shown again. For Gemini: Google AI Studio → Get API key. Use a paid key with a budget for real school data.</p>
            <div className="flex flex-wrap gap-3">
              <Button onClick={save} disabled={busy || !key.trim()}>
                Save key
              </Button>
              <Button variant="secondary" onClick={test} disabled={busy || !s.keySaved}>
                {busy ? "Asking…" : "Test it"}
              </Button>
            </div>
            {reply && <FormAlert tone="success">The AI answered: “{reply}”</FormAlert>}
          </>
        )}
      </Card>
      {can("ai.usage") && <Usage />}
    </div>
  );
}

export default function AiSetupPage() {
  return (
    <>
      <PageHeader title="AI Setup" description="The AI provider’s key, a test, and how much AI the school uses." />
      <Setup />
    </>
  );
}
