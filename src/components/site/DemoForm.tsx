"use client";

import { useState } from "react";
import { API_BASE_URL } from "@/lib/api/client";
import { Lang, SITE, t } from "@/lib/site/content";

/** The website's "Book a demo" form: saved for Klytos (console → Leads) and emailed to them. */
export function DemoForm({ lang }: { lang: Lang }) {
  const c = t(lang).form;
  const [f, setF] = useState({ name: "", school: "", city: "", phone: "", email: "", students: "", board: c.boards[0], preferredTime: c.times[3], message: "", website: "" });
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const set = (k: keyof typeof f, v: string) => setF((x) => ({ ...x, [k]: v }));
  const field = "w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#1A365D] focus:outline-none focus:ring-2 focus:ring-[#1A365D]/15";
  const lab = "mb-1 block text-xs font-bold text-slate-600";
  if (state === "done")
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center">
        <span className="material-symbols-outlined text-5xl text-emerald-600">task_alt</span>
        <p className="mt-2 text-lg font-extrabold text-slate-900">{c.done}</p>
        <p className="mt-1 text-sm text-slate-600">{c.doneText}</p>
        <a href={`https://wa.me/${SITE.phoneRaw}`} target="_blank" rel="noreferrer" className="mt-4 inline-block rounded-xl bg-[#25D366] px-5 py-2.5 text-sm font-bold text-white">
          WhatsApp {SITE.phone}
        </a>
      </div>
    );
  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setState("sending");
        setError(null);
        try {
          const res = await fetch(`${API_BASE_URL}/platform-info/lead`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: f.name, school: f.school, city: f.city || null, phone: f.phone, email: f.email || null, students: f.students ? Number(f.students) : null, board: f.board || null, preferredTime: f.preferredTime || null, message: f.message || null, language: lang, website: f.website }),
          });
          if (!res.ok) {
            const body = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
            throw new Error(body.error?.message || c.error);
          }
          setState("done");
        } catch (err) {
          setError((err as Error).message || c.error);
          setState("error");
        }
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <label>
          <span className={lab}>{c.name} *</span>
          <input className={field} required minLength={2} value={f.name} onChange={(e) => set("name", e.target.value)} autoComplete="name" />
        </label>
        <label>
          <span className={lab}>{c.phone} *</span>
          <input className={field} required type="tel" pattern="[+0-9 ()-]{10,20}" value={f.phone} onChange={(e) => set("phone", e.target.value)} autoComplete="tel" />
        </label>
        <label>
          <span className={lab}>{c.school} *</span>
          <input className={field} required minLength={2} value={f.school} onChange={(e) => set("school", e.target.value)} autoComplete="organization" />
        </label>
        <label>
          <span className={lab}>{c.city}</span>
          <input className={field} value={f.city} onChange={(e) => set("city", e.target.value)} autoComplete="address-level2" />
        </label>
        <label>
          <span className={lab}>{c.email}</span>
          <input className={field} type="email" value={f.email} onChange={(e) => set("email", e.target.value)} autoComplete="email" />
        </label>
        <label>
          <span className={lab}>{c.students}</span>
          <input className={field} type="number" min={0} max={100000} value={f.students} onChange={(e) => set("students", e.target.value)} />
        </label>
        <label>
          <span className={lab}>{c.board}</span>
          <select className={field} value={f.board} onChange={(e) => set("board", e.target.value)}>
            {c.boards.map((b) => (
              <option key={b}>{b}</option>
            ))}
          </select>
        </label>
        <label>
          <span className={lab}>{c.time}</span>
          <select className={field} value={f.preferredTime} onChange={(e) => set("preferredTime", e.target.value)}>
            {c.times.map((b) => (
              <option key={b}>{b}</option>
            ))}
          </select>
        </label>
      </div>
      <label className="block">
        <span className={lab}>{c.message}</span>
        <textarea className={`${field} min-h-[5rem]`} maxLength={2000} value={f.message} onChange={(e) => set("message", e.target.value)} />
      </label>
      {/* Left empty by people; bots fill it in. */}
      <input type="text" name="website" tabIndex={-1} autoComplete="off" value={f.website} onChange={(e) => set("website", e.target.value)} className="hidden" aria-hidden />
      {state === "error" && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      <button type="submit" disabled={state === "sending"} className="w-full rounded-xl bg-[#1A365D] px-5 py-3 text-sm font-bold text-white shadow-sm hover:bg-[#12284a] disabled:opacity-60">
        {state === "sending" ? c.sending : c.send}
      </button>
    </form>
  );
}
