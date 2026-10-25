import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { isLang, Lang, t } from "@/lib/site/content";
import { siteBase } from "@/lib/site/base";
import { siteHref } from "@/components/site/SiteParts";

export const generateMetadata = ({ params }: { params: { lang: string } }): Metadata => ({ title: t((isLang(params.lang) ? params.lang : "en") as Lang).pricing.title });

/** The plans (no prices: "talk to us"). */
export default function PricingPage({ params }: { params: { lang: string } }) {
  if (!isLang(params.lang)) notFound();
  const lang = params.lang;
  const c = t(lang);
  const { base } = siteBase(lang);
  return (
    <div className="bg-slate-50 px-4 py-16 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <h1 className="text-center text-4xl font-black tracking-tight text-slate-900">{c.pricing.title}</h1>
        <p className="mx-auto mt-3 max-w-2xl text-center text-lg text-slate-600">{c.pricing.text}</p>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {c.pricing.plans.map((p) => (
            <div key={p.name} className={`relative flex flex-col rounded-3xl border bg-white p-7 ${p.popular ? "border-[#1A365D] shadow-xl shadow-[#1A365D]/10" : "border-slate-200"}`}>
              {p.popular && <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[#1A365D] px-3 py-1 text-xs font-bold text-white">{c.pricing.popular}</span>}
              <h2 className="text-2xl font-black text-slate-900">{p.name}</h2>
              <p className="mt-1 text-sm text-slate-500">{p.for}</p>
              <ul className="mt-6 flex-1 space-y-2.5 text-sm text-slate-700">
                {p.items.map((i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="material-symbols-outlined text-lg text-emerald-600">check</span>
                    {i}
                  </li>
                ))}
              </ul>
              <Link href={siteHref(base, "/demo")} className={`mt-7 block rounded-xl px-5 py-3 text-center text-sm font-bold ${p.popular ? "bg-[#1A365D] text-white hover:bg-[#12284a]" : "border border-slate-300 text-slate-800 hover:border-[#1A365D]"}`}>
                {c.pricing.talk}
              </Link>
            </div>
          ))}
        </div>
        <p className="mx-auto mt-8 max-w-2xl text-center text-sm text-slate-500">{c.pricing.note}</p>
      </div>
    </div>
  );
}
