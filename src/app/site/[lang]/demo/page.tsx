import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { isLang, Lang, SITE, t } from "@/lib/site/content";
import { DemoForm } from "@/components/site/DemoForm";

export const generateMetadata = ({ params }: { params: { lang: string } }): Metadata => ({ title: t((isLang(params.lang) ? params.lang : "en") as Lang).form.title });

/** Book a demo / contact. */
export default function DemoPage({ params }: { params: { lang: string } }) {
  if (!isLang(params.lang)) notFound();
  const lang = params.lang;
  const c = t(lang);
  return (
    <div className="bg-slate-50 px-4 py-16 sm:px-6">
      <div className="mx-auto grid max-w-5xl gap-10 lg:grid-cols-[1fr_1.4fr]">
        <div>
          <h1 className="text-4xl font-black tracking-tight text-slate-900">{c.form.title}</h1>
          <p className="mt-3 text-lg text-slate-600">{c.form.text}</p>
          <div className="mt-8 space-y-3">
            <a href={`tel:+${SITE.phoneRaw}`} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 font-semibold text-slate-800 hover:border-[#1A365D]">
              <span className="material-symbols-outlined text-[#1A365D]">call</span>
              {SITE.phone}
            </a>
            <a href={`https://wa.me/${SITE.phoneRaw}`} target="_blank" rel="noreferrer" className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 font-semibold text-slate-800 hover:border-[#25D366]">
              <span className="material-symbols-outlined text-[#25D366]">chat</span>
              {c.whatsapp}
            </a>
            <a href={`mailto:${SITE.email}`} className="flex items-center gap-3 break-all rounded-2xl border border-slate-200 bg-white p-4 font-semibold text-slate-800 hover:border-[#1A365D]">
              <span className="material-symbols-outlined text-[#1A365D]">mail</span>
              {SITE.email}
            </a>
          </div>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-900/5 sm:p-8">
          <DemoForm lang={lang} />
        </div>
      </div>
    </div>
  );
}
