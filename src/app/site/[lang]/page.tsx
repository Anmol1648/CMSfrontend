import Link from "next/link";
import { notFound } from "next/navigation";
import { isLang, modules, SITE, t } from "@/lib/site/content";
import { siteBase } from "@/lib/site/base";
import { siteHref } from "@/components/site/SiteParts";
import { DashboardMock, PhoneMock } from "@/components/site/Mockups";
import { DemoForm } from "@/components/site/DemoForm";

const Icon = ({ name, className = "" }: { name: string; className?: string }) => <span className={`material-symbols-outlined ${className}`}>{name}</span>;
const Section = ({ id, className = "", children }: { id?: string; className?: string; children: React.ReactNode }) => (
  <section id={id} className={`scroll-mt-20 px-4 py-16 sm:px-6 sm:py-20 ${className}`}>
    <div className="mx-auto max-w-7xl">{children}</div>
  </section>
);
const Heading = ({ title, text, light }: { title: string; text?: string; light?: boolean }) => (
  <div className="mx-auto mb-10 max-w-3xl text-center">
    <h2 className={`text-3xl font-black tracking-tight sm:text-4xl ${light ? "text-white" : "text-slate-900"}`}>{title}</h2>
    {text && <p className={`mt-3 text-lg ${light ? "text-slate-300" : "text-slate-600"}`}>{text}</p>}
  </div>
);

/** The website's home page. */
export default function SiteHome({ params }: { params: { lang: string } }) {
  if (!isLang(params.lang)) notFound();
  const lang = params.lang;
  const c = t(lang);
  const { base } = siteBase(lang);
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-slate-50 to-white px-4 pb-16 pt-12 sm:px-6 sm:pt-20">
        <div className="pointer-events-none absolute -right-40 -top-40 h-[32rem] w-[32rem] rounded-full bg-[#1A365D]/5 blur-3xl" />
        <div className="relative mx-auto grid max-w-7xl grid-cols-1 items-center gap-12 lg:grid-cols-[1.05fr_1fr]">
          {/* min-w-0: a grid column may otherwise grow to its widest content (the mock-up) and run off a phone. */}
          <div className="min-w-0">
            <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-bold text-slate-600">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              {c.hero.badge}
            </span>
            <h1 className="mt-5 text-4xl font-black leading-[1.1] tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">{c.hero.title}</h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-slate-600">{c.hero.text}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href={siteHref(base, "/demo")} className="rounded-xl bg-[#1A365D] px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-[#1A365D]/20 hover:bg-[#12284a]">
                {c.hero.demo}
              </Link>
              {SITE.demoUrl ? (
                <a href={SITE.demoUrl} className="rounded-xl border border-slate-300 bg-white px-6 py-3.5 text-sm font-bold text-slate-800 hover:border-[#1A365D]">
                  {c.hero.try}
                </a>
              ) : (
                <a href={`https://wa.me/${SITE.phoneRaw}`} target="_blank" rel="noreferrer" className="rounded-xl border border-slate-300 bg-white px-6 py-3.5 text-sm font-bold text-slate-800 hover:border-[#1A365D]">
                  WhatsApp {SITE.phone}
                </a>
              )}
            </div>
            <ul className="mt-8 grid max-w-lg grid-cols-2 gap-2 text-sm font-semibold text-slate-600">
              {c.hero.trust.map((x) => (
                <li key={x} className="flex items-center gap-2">
                  <Icon name="verified" className="text-lg text-emerald-600" />
                  {x}
                </li>
              ))}
            </ul>
          </div>
          <div className="relative min-w-0">
            <DashboardMock lang={lang} />
            <div className="absolute -bottom-10 -left-6 hidden sm:block">
              <PhoneMock lang={lang} />
            </div>
          </div>
        </div>
      </section>

      {/* Before / after */}
      <Section className="pt-24">
        <Heading title={c.problem.title} />
        <div className="mx-auto max-w-5xl overflow-hidden rounded-2xl border border-slate-200">
          <div className="grid grid-cols-2 bg-slate-50 text-xs font-bold uppercase tracking-widest text-slate-500">
            <p className="px-5 py-3">{c.problem.before}</p>
            <p className="border-l border-slate-200 px-5 py-3 text-[#1A365D]">{c.problem.after}</p>
          </div>
          {c.problem.rows.map(([a, b]) => (
            <div key={a} className="grid grid-cols-2 border-t border-slate-200 text-sm">
              <p className="flex items-start gap-2 px-5 py-4 text-slate-500">
                <Icon name="close" className="text-lg text-red-400" />
                {a}
              </p>
              <p className="flex items-start gap-2 border-l border-slate-200 px-5 py-4 font-semibold text-slate-800">
                <Icon name="check_circle" className="text-lg text-emerald-600" />
                {b}
              </p>
            </div>
          ))}
        </div>
      </Section>

      {/* Modules */}
      <Section id="modules" className="bg-slate-50">
        <Heading title={c.modulesTitle} text={c.modulesText} />
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {modules(lang).map((m) => (
            <div key={m.title} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#1A365D]/10">
                <Icon name={m.icon} className="text-2xl text-[#1A365D]" />
              </span>
              <h3 className="mt-4 text-lg font-extrabold text-slate-900">{m.title}</h3>
              <ul className="mt-3 space-y-1.5 text-sm text-slate-600">
                {m.items.map((i) => (
                  <li key={i} className="flex items-start gap-2">
                    <Icon name="check" className="mt-0.5 text-base text-emerald-600" />
                    {i}
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <Link href={siteHref(base, "/features")} className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 p-6 text-center font-bold text-[#1A365D] hover:bg-white">
            <Icon name="arrow_forward" className="text-3xl" />
            {c.nav.features}
          </Link>
        </div>
      </Section>

      {/* For each role */}
      <Section>
        <Heading title={c.roles.title} />
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {c.roles.list.map((r) => (
            <div key={r.who} className="flex gap-4 rounded-2xl border border-slate-200 p-6">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-white">
                <Icon name={r.icon} className="text-2xl" />
              </span>
              <div>
                <h3 className="text-lg font-extrabold text-slate-900">{r.who}</h3>
                <p className="mt-1 text-sm leading-relaxed text-slate-600">{r.what}</p>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* AI */}
      <Section className="bg-gradient-to-br from-[#0f2240] to-[#1A365D]">
        <Heading title={c.ai.title} text={c.ai.text} light />
        <div className="grid gap-5 md:grid-cols-3">
          {c.ai.points.map(([icon, title, text]) => (
            <div key={title} className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur">
              <Icon name={icon} className="text-3xl text-sky-300" />
              <h3 className="mt-3 text-lg font-extrabold text-white">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-300">{text}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* Highlights */}
      <Section>
        <Heading title={c.highlights.title} />
        <div className="grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
          {c.highlights.list.map(([icon, title, text]) => (
            <div key={title} className="flex gap-4">
              <Icon name={icon} className="text-3xl text-[#1A365D]" />
              <div>
                <h3 className="font-extrabold text-slate-900">{title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-slate-600">{text}</p>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* Security */}
      <Section id="security" className="bg-slate-50">
        <Heading title={c.security.title} />
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {c.security.list.map(([icon, title, text]) => (
            <div key={title} className="rounded-2xl border border-slate-200 bg-white p-6">
              <Icon name={icon} className="text-2xl text-emerald-600" />
              <h3 className="mt-3 font-extrabold text-slate-900">{title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-slate-600">{text}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* Steps */}
      <Section>
        <Heading title={c.steps.title} />
        <ol className="grid gap-6 md:grid-cols-5">
          {c.steps.list.map(([icon, title, text], n) => (
            <li key={title} className="relative text-center">
              <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#1A365D] text-white shadow-lg shadow-[#1A365D]/20">
                <Icon name={icon} className="text-2xl" />
              </span>
              <p className="mt-3 text-xs font-bold text-slate-400">{n + 1}</p>
              <h3 className="font-extrabold text-slate-900">{title}</h3>
              <p className="mt-1 text-sm text-slate-600">{text}</p>
            </li>
          ))}
        </ol>
      </Section>

      {/* Pricing preview */}
      <Section className="bg-slate-50">
        <Heading title={c.pricing.title} text={c.pricing.text} />
        <div className="text-center">
          <Link href={siteHref(base, "/pricing")} className="inline-block rounded-xl border border-slate-300 bg-white px-6 py-3 text-sm font-bold text-slate-800 hover:border-[#1A365D]">
            {c.nav.pricing} →
          </Link>
        </div>
      </Section>

      {/* FAQ */}
      <Section id="faq">
        <Heading title={c.faq.title} />
        <div className="mx-auto max-w-3xl divide-y divide-slate-200 rounded-2xl border border-slate-200">
          {c.faq.list.map(([q, a]) => (
            <details key={q} className="group px-5 py-4">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-bold text-slate-900 [&::-webkit-details-marker]:hidden">
                {q}
                <Icon name="expand_more" className="text-slate-400 transition group-open:rotate-180" />
              </summary>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{a}</p>
            </details>
          ))}
        </div>
      </Section>

      {/* Book a demo */}
      <Section id="demo" className="bg-gradient-to-b from-white to-slate-50">
        <div className="mx-auto grid max-w-5xl gap-10 rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-900/5 sm:p-10 lg:grid-cols-[1fr_1.3fr]">
          <div>
            <h2 className="text-3xl font-black tracking-tight text-slate-900">{c.cta.title}</h2>
            <p className="mt-3 text-slate-600">{c.cta.text}</p>
            <ul className="mt-6 space-y-3 text-sm">
              <li>
                <a href={`tel:+${SITE.phoneRaw}`} className="flex items-center gap-2 font-semibold text-slate-800">
                  <Icon name="call" className="text-[#1A365D]" />
                  {SITE.phone}
                </a>
              </li>
              <li>
                <a href={`mailto:${SITE.email}`} className="flex items-center gap-2 break-all font-semibold text-slate-800">
                  <Icon name="mail" className="text-[#1A365D]" />
                  {SITE.email}
                </a>
              </li>
            </ul>
          </div>
          <DemoForm lang={lang} />
        </div>
      </Section>
    </>
  );
}
