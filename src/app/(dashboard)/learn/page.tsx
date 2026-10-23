"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Tabs } from "@/components/ui/Tabs";
import { FormAlert, Pill } from "@/components/forms";
import { PageHeader } from "@/components/layout/AppShell";
import { PageLoader } from "@/components/ui/PageLoader";
import { ChatBubbles } from "@/components/learn/ChatBubbles";
import { ProgressView } from "@/components/learn/ProgressView";
import { useToast } from "@/components/ui/ToastProvider";
import { useConfirm } from "@/components/ui/ConfirmProvider";
import { RequirePermission } from "@/lib/auth/RequirePermission";
import { errorMessage } from "@/lib/api/client";
import { Chat, learnApi, LearnMode, Quiz, QuizResult } from "@/lib/api/learn";
import { questionsApi } from "@/lib/api/questions";
import { cn } from "@/lib/utils";

const ACTIONS: { mode: Exclude<LearnMode, "ask">; label: string; icon: string }[] = [
  { mode: "explain", label: "Explain simply", icon: "lightbulb" },
  { mode: "summary", label: "Summary", icon: "summarize" },
  { mode: "points", label: "Key points", icon: "format_list_bulleted" },
  { mode: "questions", label: "Important questions", icon: "help" },
];

function ChatPanel({ chat, onChange }: { chat: Chat; onChange: (c: Chat) => void }) {
  const { showToast } = useToast();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => {
    end.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [chat.messages.length, busy]);
  const send = async () => {
    if (!text.trim()) return;
    setBusy(true);
    const t = text;
    setText("");
    onChange({ ...chat, messages: [...chat.messages, { id: "pending", role: "user", text: t, flag: "ok", at: new Date().toISOString() }] });
    try {
      onChange(await learnApi.send(chat.id, t));
    } catch (err) {
      showToast(errorMessage(err), "error");
      setText(t);
      onChange(chat);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Card className="space-y-4">
      <div>
        <p className="font-extrabold text-primary">{chat.title}</p>
        <p className="text-xs text-on-surface-variant/70">
          {chat.subject}
          {chat.chapter ? ` · ${chat.chapter}` : ""}
        </p>
      </div>
      <div className="max-h-[55vh] overflow-y-auto pr-1">
        <ChatBubbles chat={chat} />
        {busy && <p className="text-xs text-on-surface-variant/70 mt-3">The tutor is thinking…</p>}
        <div ref={end} />
      </div>
      <div className="flex gap-2">
        <textarea value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(); } }} rows={2} maxLength={2000} placeholder="Ask anything about this chapter…" className="flex-1 rounded-xl bg-surface-container-low px-4 py-3 text-sm outline-none resize-none" aria-label="Your question" />
        <Button onClick={send} disabled={busy || !text.trim()}>
          Send
        </Button>
      </div>
    </Card>
  );
}

function QuizPanel({ quiz, onDone }: { quiz: Quiz; onDone: () => void }) {
  const { showToast } = useToast();
  const [answers, setAnswers] = useState<number[]>(quiz.questions.map(() => -1));
  const [result, setResult] = useState<QuizResult | null>(null);
  const submit = async () => {
    try {
      setResult(await learnApi.submitQuiz(quiz.id, answers));
      onDone();
    } catch (err) {
      showToast(errorMessage(err), "error");
    }
  };
  const rows = result?.questions ?? quiz.questions.map((q) => ({ ...q, correct: -1, given: -1, explanation: null as string | null }));
  return (
    <Card className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-extrabold text-primary">Practice quiz</p>
          <p className="text-xs text-on-surface-variant/70">
            {quiz.subject}
            {quiz.chapter ? ` · ${quiz.chapter}` : ""} · {quiz.source === "bank" ? "from the school’s question bank" : "written by the AI"}
          </p>
        </div>
        {result && (
          <p className="text-2xl font-extrabold text-primary">
            {result.score} / {result.total}
          </p>
        )}
      </div>
      {rows.map((q, i) => (
        <div key={i} className="space-y-2">
          <p className="text-sm font-semibold">
            {i + 1}. {q.text}
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {q.options.map((o, k) => {
              const picked = (result ? q.given : answers[i]) === k;
              const right = result && q.correct === k;
              const wrong = result && picked && q.correct !== k;
              return (
                <button key={k} type="button" disabled={!!result} onClick={() => setAnswers(answers.map((a, j) => (j === i ? k : a)))} className={cn("text-left rounded-xl border px-3 py-2 text-sm", right ? "border-emerald-400 bg-emerald-50 text-emerald-800 font-bold" : wrong ? "border-error bg-error-container/30 text-error" : picked ? "border-primary bg-primary/5" : "border-outline-variant/30 hover:bg-surface-container-low")}>
                  {String.fromCharCode(65 + k)}. {o}
                </button>
              );
            })}
          </div>
          {result && q.explanation && <p className="text-xs text-on-surface-variant">💡 {q.explanation}</p>}
        </div>
      ))}
      {!result && (
        <div className="flex justify-end">
          <Button onClick={submit} disabled={answers.some((a) => a < 0)}>
            Check my answers
          </Button>
        </div>
      )}
    </Card>
  );
}

function Learn() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const confirm = useConfirm();
  const subjects = useQuery({ queryKey: ["learn-subjects"], queryFn: learnApi.subjects });
  const ai = useQuery({ queryKey: ["ai-status"], queryFn: questionsApi.aiStatus, staleTime: 60_000 });
  const [subjectId, setSubjectId] = useState("");
  const [chapterId, setChapterId] = useState<string | null>(null);
  const [chat, setChat] = useState<Chat | null>(null);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [ask, setAsk] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [tab, setTab] = useState("learn");
  const history = useQuery({ queryKey: ["learn-chats", subjectId, chapterId], queryFn: () => learnApi.chats({ subject: subjectId, chapter: chapterId ?? undefined }), enabled: !!subjectId });
  const progress = useQuery({ queryKey: ["learn-progress"], queryFn: learnApi.myProgress, enabled: tab === "progress" });
  const d = subjects.data;
  useEffect(() => {
    if (d && !subjectId && d.subjects.length) setSubjectId(d.subjects[0].id);
  }, [d, subjectId]);
  if (subjects.isError) return <FormAlert>{errorMessage(subjects.error)}</FormAlert>;
  if (!d) return <PageLoader />;
  const subject = d.subjects.find((s) => s.id === subjectId);
  const chapter = subject?.chapters.find((c) => c.id === chapterId) ?? null;
  const start = async (mode: LearnMode, text?: string) => {
    setBusy(mode);
    setQuiz(null);
    try {
      setChat(await learnApi.start({ subjectId, chapterId, mode, text }));
      setAsk("");
      queryClient.invalidateQueries({ queryKey: ["learn-chats"] });
    } catch (err) {
      showToast(errorMessage(err), "error");
    } finally {
      setBusy(null);
    }
  };
  const newQuiz = async () => {
    setBusy("quiz");
    setChat(null);
    try {
      setQuiz(await learnApi.quiz(subjectId, chapterId));
    } catch (err) {
      showToast(errorMessage(err), "error");
    } finally {
      setBusy(null);
    }
  };
  const open = async (id: string) => {
    setQuiz(null);
    try {
      setChat(await learnApi.chat(id));
    } catch (err) {
      showToast(errorMessage(err), "error");
    }
  };
  const remove = async (id: string) => {
    if (!(await confirm({ title: "Delete this conversation?", message: "It can’t be brought back.", confirmLabel: "Delete" }))) return;
    await learnApi.remove(id).catch(() => null);
    if (chat?.id === id) setChat(null);
    queryClient.invalidateQueries({ queryKey: ["learn-chats"] });
  };
  return (
    <div className="space-y-4">
      <p className="text-sm text-on-surface-variant/80">
        {d.student.name} · {d.student.section}
        {d.mode === "guide" ? " · the tutor guides you step by step, so you learn to do it yourself" : ""}
      </p>
      <Tabs tabs={[{ id: "learn", label: "Learn" }, { id: "progress", label: "My progress" }]} activeTab={tab} onChange={setTab} />
      {tab === "progress" ? (
        progress.data ? <ProgressView p={progress.data} onOpenChat={(id) => { setTab("learn"); void open(id); }} /> : <PageLoader />
      ) : (
        <>
          {ai.data && !ai.data.ready && <FormAlert tone="info">The AI tutor isn’t switched on yet; practice quizzes from the school’s question bank still work.</FormAlert>}
          <div className="flex flex-wrap gap-2">
            {d.subjects.map((s) => (
              <button key={s.id} type="button" onClick={() => { setSubjectId(s.id); setChapterId(null); setChat(null); setQuiz(null); }} className={cn("rounded-full px-4 py-1.5 text-sm font-bold border", s.id === subjectId ? "bg-primary text-white border-primary" : "border-outline-variant/40 text-on-surface-variant")}>
                {s.name}
              </button>
            ))}
          </div>
          <div className="grid gap-4 lg:grid-cols-[18rem_1fr]">
            <div className="space-y-4">
              <Card padding="none" className="overflow-hidden">
                <p className="px-4 pt-3 pb-2 text-[10px] font-black uppercase tracking-widest text-on-surface-variant/60">Chapters</p>
                <button type="button" onClick={() => setChapterId(null)} className={cn("w-full text-left px-4 py-2 text-sm border-t border-outline-variant/10", chapterId === null ? "bg-primary/10 font-bold text-primary" : "hover:bg-surface-container-low")}>
                  Whole subject
                </button>
                {(subject?.chapters ?? []).map((c, i) => (
                  <button key={c.id} type="button" onClick={() => setChapterId(c.id)} className={cn("w-full text-left px-4 py-2 text-sm border-t border-outline-variant/10 flex items-center justify-between gap-2", chapterId === c.id ? "bg-primary/10 font-bold text-primary" : "hover:bg-surface-container-low")}>
                    <span>
                      {i + 1}. {c.name}
                    </span>
                    {c.practice?.percent != null && <span className={cn("text-[10px] font-bold", c.practice.percent < 60 ? "text-error" : "text-emerald-700")}>{c.practice.percent}%</span>}
                  </button>
                ))}
                {subject && !subject.chapters.length && <p className="px-4 py-3 text-xs text-on-surface-variant/70">The school hasn’t added chapters for this subject yet.</p>}
              </Card>
              {!!history.data?.length && (
                <Card padding="none" className="overflow-hidden">
                  <p className="px-4 pt-3 pb-2 text-[10px] font-black uppercase tracking-widest text-on-surface-variant/60">Earlier</p>
                  {history.data.map((h) => (
                    <div key={h.id} className="flex items-center border-t border-outline-variant/10">
                      <button type="button" onClick={() => open(h.id)} className="flex-1 text-left px-4 py-2 text-sm hover:bg-surface-container-low truncate">
                        {h.title}
                      </button>
                      <button type="button" onClick={() => remove(h.id)} aria-label="Delete" className="px-2 text-on-surface-variant/50 hover:text-error">
                        <span className="material-symbols-outlined text-base">delete</span>
                      </button>
                    </div>
                  ))}
                </Card>
              )}
            </div>
            <div className="space-y-4">
              <Card className="space-y-3">
                <p className="font-bold">
                  {subject?.name}
                  {chapter ? ` · ${chapter.name}` : ""}
                </p>
                {chapter?.topics.length ? <p className="text-xs text-on-surface-variant/70">{chapter.topics.join(" · ")}</p> : null}
                <div className="flex flex-wrap gap-2">
                  {ACTIONS.map((a) => (
                    <Button key={a.mode} variant="secondary" onClick={() => start(a.mode)} disabled={!!busy || !ai.data?.ready}>
                      <span className="material-symbols-outlined text-base mr-1">{a.icon}</span>
                      {busy === a.mode ? "…" : a.label}
                    </Button>
                  ))}
                  <Button onClick={newQuiz} disabled={!!busy}>
                    <span className="material-symbols-outlined text-base mr-1">quiz</span>
                    {busy === "quiz" ? "Making it…" : "Practice quiz"}
                  </Button>
                </div>
                <div className="flex gap-2">
                  <input value={ask} onChange={(e) => setAsk(e.target.value)} onKeyDown={(e) => e.key === "Enter" && ask.trim() && start("ask", ask)} maxLength={2000} placeholder={chapter ? `Ask about “${chapter.name}”…` : "Ask a question about this subject…"} className="flex-1 rounded-xl bg-surface-container-low px-4 py-3 text-sm outline-none" aria-label="Ask the tutor" disabled={!ai.data?.ready} />
                  <Button onClick={() => start("ask", ask)} disabled={!!busy || !ask.trim() || !ai.data?.ready}>
                    {busy === "ask" ? "…" : "Ask"}
                  </Button>
                </div>
              </Card>
              {chat && <ChatPanel chat={chat} onChange={setChat} />}
              {quiz && <QuizPanel key={quiz.id} quiz={quiz} onDone={() => queryClient.invalidateQueries({ queryKey: ["learn-subjects"] })} />}
              {!chat && !quiz && (
                <Card className="text-center text-sm text-on-surface-variant/70 space-y-1">
                  <p className="text-3xl">🎓</p>
                  <p>Pick a chapter, then ask a question, get it explained simply, or take a practice quiz.</p>
                  {busy && <Pill>working…</Pill>}
                </Card>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default function LearnPage() {
  return (
    <RequirePermission permission="learn.use">
      <PageHeader title="AI Learning" description="Your own tutor for every chapter: ask questions, get things explained simply, revise key points and practise with quizzes." />
      <Learn />
    </RequirePermission>
  );
}
