import type { Lang } from "@/lib/site/content";

/**
 * Pictures of the product for the website, drawn in code (no real school's data, and translated).
 */

const L = {
  en: { dash: "Good morning, Principal", sub: "Today at a glance", att: "Attendance today", fees: "Fees this month", dues: "Overdue", waiting: "Waiting for you", w1: "Staff leave to approve", w2: "Vouchers to approve", w3: "Marks sheets pending", trend: "Fee collection", phoneHi: "Hello, Aarav’s parent", today: "Today", present: "Present", homework: "Homework", hwText: "Maths: Exercise 4.2", due: "Fee due", pay: "Pay now", bus: "School bus", busText: "Bus 3 is 5 min away" },
  hi: { dash: "सुप्रभात, प्रधानाचार्य", sub: "आज की झलक", att: "आज की उपस्थिति", fees: "इस माह फीस", dues: "बकाया", waiting: "आपके लिए", w1: "स्टाफ की छुट्टी मंज़ूर करें", w2: "वाउचर मंज़ूर करें", w3: "अंक शीट बाक़ी", trend: "फीस संग्रह", phoneHi: "नमस्ते, आरव के अभिभावक", today: "आज", present: "उपस्थित", homework: "होमवर्क", hwText: "गणित: अभ्यास 4.2", due: "फीस बकाया", pay: "अभी भरें", bus: "स्कूल बस", busText: "बस 3, 5 मिनट दूर" },
};

export function DashboardMock({ lang }: { lang: Lang }) {
  const l = L[lang];
  const bars = [38, 52, 44, 70, 58, 82, 64, 90, 76, 60, 86, 72];
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/10">
      <div className="flex items-center gap-1.5 border-b border-slate-100 bg-slate-50 px-4 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-red-300" />
        <span className="h-2.5 w-2.5 rounded-full bg-amber-300" />
        <span className="h-2.5 w-2.5 rounded-full bg-emerald-300" />
      </div>
      <div className="flex">
        <div className="hidden w-36 shrink-0 space-y-2 border-r border-slate-100 bg-slate-50/60 p-3 sm:block">
          {["dashboard", "groups", "payments", "fact_check", "directions_bus", "bed", "smart_toy"].map((i, n) => (
            <div key={i} className={`flex items-center gap-2 rounded-lg px-2 py-1.5 ${n === 0 ? "bg-white shadow-sm" : ""}`}>
              <span className={`material-symbols-outlined text-base ${n === 0 ? "text-[#1A365D]" : "text-slate-400"}`}>{i}</span>
              <span className={`h-2 rounded ${n === 0 ? "w-14 bg-[#1A365D]/70" : "w-12 bg-slate-200"}`} />
            </div>
          ))}
        </div>
        <div className="min-w-0 flex-1 space-y-3 p-4">
          <div>
            <p className="text-sm font-extrabold text-slate-900">{l.dash}</p>
            <p className="text-[11px] text-slate-500">{l.sub}</p>
          </div>
          <div className="flex gap-2">
            {[l.w1, l.w2, l.w3].map((w, n) => (
              <div key={w} className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-2 py-1.5">
                <span className="text-sm font-black text-amber-700">{[6, 2, 4][n]}</span>
                <span className="truncate text-[10px] font-semibold text-slate-600">{w}</span>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-xl border border-slate-100 p-2.5">
              <p className="text-[9px] font-bold uppercase tracking-widest text-[#1A365D]">{l.att}</p>
              <p className="text-xl font-black text-emerald-600">94.2%</p>
              <div className="mt-1 h-1.5 rounded-full bg-slate-100"><div className="h-full w-[94%] rounded-full bg-emerald-500" /></div>
            </div>
            <div className="rounded-xl border border-slate-100 p-2.5">
              <p className="text-[9px] font-bold uppercase tracking-widest text-[#1A365D]">{l.fees}</p>
              <p className="text-xl font-black text-slate-900">₹8.4L</p>
              <p className="text-[10px] text-slate-500">412 ✓</p>
            </div>
            <div className="rounded-xl border border-slate-100 p-2.5">
              <p className="text-[9px] font-bold uppercase tracking-widest text-[#1A365D]">{l.dues}</p>
              <p className="text-xl font-black text-red-500">₹2.1L</p>
              <p className="text-[10px] text-slate-500">38</p>
            </div>
          </div>
          <div className="rounded-xl border border-slate-100 p-2.5">
            <p className="mb-2 text-[9px] font-bold uppercase tracking-widest text-[#1A365D]">{l.trend}</p>
            <div className="flex h-20 items-end gap-1">
              {bars.map((b, i) => (
                <div key={i} className="flex-1 rounded-t bg-[#1A365D]/80" style={{ height: `${b}%` }} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function PhoneMock({ lang }: { lang: Lang }) {
  const l = L[lang];
  return (
    <div className="mx-auto w-[230px] rounded-[2.2rem] border-[6px] border-slate-900 bg-slate-900 shadow-2xl shadow-slate-900/20">
      <div className="overflow-hidden rounded-[1.7rem] bg-slate-50">
        <div className="mx-auto mt-2 h-4 w-20 rounded-full bg-slate-900" />
        <div className="space-y-2.5 p-3">
          <p className="text-xs font-extrabold text-slate-900">{l.phoneHi}</p>
          <div className="rounded-xl bg-white p-2.5 shadow-sm">
            <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500">{l.today}</p>
            <p className="flex items-center gap-1 text-sm font-black text-emerald-600">
              <span className="material-symbols-outlined text-base">check_circle</span>
              {l.present}
            </p>
          </div>
          <div className="rounded-xl bg-white p-2.5 shadow-sm">
            <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500">{l.homework}</p>
            <p className="text-[11px] font-semibold text-slate-800">{l.hwText}</p>
          </div>
          <div className="rounded-xl bg-white p-2.5 shadow-sm">
            <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500">{l.due}</p>
            <div className="flex items-center justify-between">
              <p className="text-sm font-black text-red-500">₹6,500</p>
              <span className="rounded-lg bg-[#1A365D] px-2 py-1 text-[10px] font-bold text-white">{l.pay}</span>
            </div>
          </div>
          <div className="rounded-xl bg-white p-2.5 shadow-sm">
            <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500">{l.bus}</p>
            <p className="flex items-center gap-1 text-[11px] font-semibold text-slate-800">
              <span className="material-symbols-outlined text-base text-amber-500">directions_bus</span>
              {l.busText}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
