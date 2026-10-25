import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { COMPANY } from "@/lib/brand";
import { isLang, Lang, SITE, t } from "@/lib/site/content";
import { siteBase } from "@/lib/site/base";
import { siteHref } from "@/components/site/SiteParts";

export const generateMetadata = ({ params }: { params: { lang: string } }): Metadata => ({ title: t((isLang(params.lang) ? params.lang : "en") as Lang).about.title });

export default function AboutPage({ params }: { params: { lang: string } }) {
  if (!isLang(params.lang)) notFound();
  const lang = params.lang;
  const c = t(lang);
  const { base } = siteBase(lang);
  return (
    <div className="px-4 py-16 sm:px-6">
      <div className="mx-auto max-w-3xl">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={COMPANY.logo} alt={SITE.company} className="h-28 w-28 object-contain" />
        <h1 className="mt-4 text-4xl font-black tracking-tight text-slate-900">{c.about.title}</h1>
        <div className="mt-6 space-y-4 text-lg leading-relaxed text-slate-700">
          {c.about.text.map((p) => (
            <p key={p}>{p}</p>
          ))}
        </div>
        <h2 className="mt-10 text-xl font-black text-slate-900">{c.about.contact}</h2>
        <ul className="mt-3 space-y-2 text-slate-700">
          <li>
            <a href={`tel:+${SITE.phoneRaw}`} className="font-semibold hover:text-[#1A365D]">{SITE.phone}</a>
          </li>
          <li>
            <a href={`mailto:${SITE.email}`} className="break-all font-semibold hover:text-[#1A365D]">{SITE.email}</a>
          </li>
        </ul>
        <Link href={siteHref(base, "/demo")} className="mt-8 inline-block rounded-xl bg-[#1A365D] px-6 py-3.5 text-sm font-bold text-white hover:bg-[#12284a]">
          {c.hero.demo}
        </Link>
      </div>
    </div>
  );
}
