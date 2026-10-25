import Link from "next/link";
import { COMPANY } from "@/lib/brand";
import { Lang, SITE, t } from "@/lib/site/content";

/**
 * The product website's frame: header (with language switch), footer and the WhatsApp button.
 * `base` is where the website lives: "" on its own domain, "/site/en" elsewhere (see middleware).
 */

export const siteHref = (base: string, path = "") => `${base}${path}` || "/";

export function SiteHeader({ lang, base, otherBase }: { lang: Lang; base: string; otherBase: string }) {
  const c = t(lang);
  const nav = [
    { href: siteHref(base, "/features"), label: c.nav.features },
    { href: `${siteHref(base)}#modules`, label: c.nav.modules },
    { href: siteHref(base, "/pricing"), label: c.nav.pricing },
    { href: `${siteHref(base)}#security`, label: c.nav.security },
    { href: `${siteHref(base)}#faq`, label: c.nav.faq },
    { href: siteHref(base, "/about"), label: c.nav.about },
  ];
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3 sm:px-6">
        <Link href={siteHref(base)} className="flex items-center gap-2" aria-label={SITE.product}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={COMPANY.logo} alt="" className="h-10 w-10 object-contain" />
          <span className="leading-tight">
            <span className="block text-lg font-black tracking-tight text-slate-900">KLYTOS</span>
            <span className="block text-[10px] font-semibold uppercase tracking-[0.3em] text-slate-500">School ERP</span>
          </span>
        </Link>
        <nav className="ml-6 hidden items-center gap-5 lg:flex">
          {nav.map((n) => (
            <Link key={n.label} href={n.href} className="text-sm font-semibold text-slate-600 hover:text-[#1A365D]">
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <Link href={otherBase || "/"} className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:border-[#1A365D]" hrefLang={lang === "en" ? "hi" : "en"}>
            {lang === "en" ? "हिंदी" : "English"}
          </Link>
          <a href={SITE.appUrl} className="hidden rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 hover:text-[#1A365D] sm:block">
            {c.nav.login}
          </a>
          <Link href={siteHref(base, "/demo")} className="rounded-xl bg-[#1A365D] px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-[#12284a]">
            {c.nav.demo}
          </Link>
          <details className="relative lg:hidden">
            <summary className="flex cursor-pointer list-none items-center rounded-lg p-2 text-slate-700 [&::-webkit-details-marker]:hidden" aria-label="Menu">
              <span className="material-symbols-outlined">menu</span>
            </summary>
            <div className="absolute right-0 mt-2 w-56 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
              {nav.map((n) => (
                <Link key={n.label} href={n.href} className="block rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                  {n.label}
                </Link>
              ))}
              <a href={SITE.appUrl} className="block rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                {c.nav.login}
              </a>
            </div>
          </details>
        </div>
      </div>
    </header>
  );
}

export function SiteFooter({ lang, base }: { lang: Lang; base: string }) {
  const c = t(lang);
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-slate-200 bg-slate-950 text-slate-300">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={COMPANY.logo} alt="" className="h-9 w-9 object-contain" />
            </span>
            <span className="text-lg font-black tracking-tight text-white">KLYTOS</span>
          </div>
          <p className="mt-3 text-sm text-slate-400">{c.footer.tagline}</p>
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-slate-500">{c.footer.product}</p>
          <ul className="mt-3 space-y-2 text-sm">
            <li><Link href={siteHref(base, "/features")} className="hover:text-white">{c.nav.features}</Link></li>
            <li><Link href={siteHref(base, "/pricing")} className="hover:text-white">{c.nav.pricing}</Link></li>
            <li><Link href={siteHref(base, "/demo")} className="hover:text-white">{c.nav.demo}</Link></li>
            <li><a href={SITE.appUrl} className="hover:text-white">{c.nav.login}</a></li>
          </ul>
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-slate-500">{c.footer.company}</p>
          <ul className="mt-3 space-y-2 text-sm">
            <li><Link href={siteHref(base, "/about")} className="hover:text-white">{c.nav.about}</Link></li>
            <li><Link href={siteHref(base, "/privacy")} className="hover:text-white">{c.footer.privacy}</Link></li>
            <li><Link href={siteHref(base, "/terms")} className="hover:text-white">{c.footer.terms}</Link></li>
            <li><Link href={siteHref(base, "/refund")} className="hover:text-white">{c.footer.refund}</Link></li>
          </ul>
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-slate-500">{c.footer.contact}</p>
          <ul className="mt-3 space-y-2 text-sm">
            <li><a href={`tel:+${SITE.phoneRaw}`} className="hover:text-white">{SITE.phone}</a></li>
            <li><a href={`https://wa.me/${SITE.phoneRaw}`} target="_blank" rel="noreferrer" className="hover:text-white">WhatsApp</a></li>
            <li><a href={`mailto:${SITE.email}`} className="break-all hover:text-white">{SITE.email}</a></li>
          </ul>
        </div>
      </div>
      <p className="border-t border-white/10 py-5 text-center text-xs text-slate-500">
        © {year} {SITE.company}. {c.footer.rights}
      </p>
    </footer>
  );
}

export function WhatsAppButton({ lang }: { lang: Lang }) {
  return (
    <a href={`https://wa.me/${SITE.phoneRaw}?text=${encodeURIComponent(lang === "hi" ? "नमस्ते, मैं Klytos School ERP के बारे में जानना चाहता/चाहती हूँ।" : "Hello, I'd like to know more about Klytos School ERP.")}`} target="_blank" rel="noreferrer" aria-label={t(lang).whatsapp} title={t(lang).whatsapp} className="fixed bottom-5 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg hover:scale-105 transition">
      <svg viewBox="0 0 32 32" className="h-7 w-7" fill="currentColor" aria-hidden>
        <path d="M16 3C8.8 3 3 8.7 3 15.8c0 2.5.7 4.9 2 7L3 29l6.4-2c2 1.1 4.3 1.7 6.6 1.7 7.2 0 13-5.7 13-12.8S23.2 3 16 3zm0 23.4c-2.1 0-4.1-.6-5.9-1.6l-.4-.3-3.8 1.2 1.2-3.7-.3-.4c-1.2-1.8-1.8-3.8-1.8-5.9C5 10 9.9 5.2 16 5.2S27 10 27 15.9s-4.9 10.5-11 10.5zm6-7.8c-.3-.2-2-1-2.3-1.1-.3-.1-.5-.2-.8.2-.2.3-.9 1.1-1.1 1.3-.2.2-.4.3-.7.1-.3-.2-1.4-.5-2.7-1.6-1-.9-1.7-2-1.9-2.3-.2-.3 0-.5.2-.7l.5-.6c.2-.2.2-.4.3-.6.1-.2 0-.5 0-.6-.1-.2-.8-1.8-1-2.5-.3-.7-.6-.6-.8-.6h-.7c-.2 0-.6.1-.9.4-.3.3-1.2 1.1-1.2 2.8s1.2 3.2 1.4 3.5c.2.2 2.4 3.6 5.8 5 .8.4 1.4.6 1.9.7.8.3 1.5.2 2.1.1.6-.1 2-.8 2.2-1.6.3-.8.3-1.4.2-1.6-.1-.1-.3-.2-.6-.3z" />
      </svg>
    </a>
  );
}
