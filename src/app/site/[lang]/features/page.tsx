import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { isLang, Lang, modules, t } from "@/lib/site/content";
import { siteBase } from "@/lib/site/base";
import { siteHref } from "@/components/site/SiteParts";

export const generateMetadata = ({ params }: { params: { lang: string } }): Metadata => ({ title: t((isLang(params.lang) ? params.lang : "en") as Lang).featuresTitle });

/** Every module group in detail. */
export default function FeaturesPage({ params }: { params: { lang: string } }) {
  if (!isLang(params.lang)) notFound();
  const lang = params.lang;
  const c = t(lang);
  const { base } = siteBase(lang);
  return (
    <div className="px-4 py-16 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <h1 className="text-center text-4xl font-black tracking-tight text-slate-900">{c.featuresTitle}</h1>
        <p className="mx-auto mt-3 max-w-2xl text-center text-lg text-slate-600">{c.featuresText}</p>
        <div className="mt-12 space-y-6">
          {modules(lang).map((m, n) => (
            <div key={m.title} className={`grid items-center gap-6 rounded-3xl border border-slate-200 p-6 sm:p-8 md:grid-cols-[14rem_1fr] ${n % 2 ? "bg-slate-50" : "bg-white"}`}>
              <div className="flex items-center gap-3 md:flex-col md:items-start">
                <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#1A365D] text-white">
                  <span className="material-symbols-outlined text-3xl">{m.icon}</span>
                </span>
                <h2 className="text-2xl font-black text-slate-900">{m.title}</h2>
              </div>
              <ul className="grid gap-3 sm:grid-cols-2">
                {m.items.map((i) => (
                  <li key={i} className="flex items-start gap-2 rounded-xl bg-white/60 p-3 text-sm font-semibold text-slate-700 ring-1 ring-slate-200">
                    <span className="material-symbols-outlined text-lg text-emerald-600">check_circle</span>
                    {i}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-12 text-center">
          <Link href={siteHref(base, "/demo")} className="inline-block rounded-xl bg-[#1A365D] px-6 py-3.5 text-sm font-bold text-white hover:bg-[#12284a]">
            {c.hero.demo}
          </Link>
        </div>
      </div>
    </div>
  );
}
