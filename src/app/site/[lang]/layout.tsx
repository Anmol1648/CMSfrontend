import type { Metadata } from "next";
import { Noto_Sans_Devanagari } from "next/font/google";
import { notFound } from "next/navigation";
import { isLang, Lang, SITE, t } from "@/lib/site/content";
import { siteBase } from "@/lib/site/base";
import { SiteFooter, SiteHeader, WhatsAppButton } from "@/components/site/SiteParts";

/** The product website (English and Hindi): its own header and footer, nothing of the ERP's. */

// Hindi letters (the app's fonts have none).
const devanagari = Noto_Sans_Devanagari({ subsets: ["devanagari"], weight: ["400", "600", "700", "800"], display: "swap" });

export const generateMetadata = ({ params }: { params: { lang: string } }): Metadata => {
  const lang = (isLang(params.lang) ? params.lang : "en") as Lang;
  const c = t(lang);
  const title = `${SITE.product}: ${c.hero.title}`;
  return {
    title: { default: title, template: `%s · ${SITE.product}` },
    description: c.hero.text,
    metadataBase: SITE.siteUrl ? new URL(SITE.siteUrl) : undefined,
    alternates: SITE.siteUrl ? { canonical: lang === "en" ? "/" : "/hi", languages: { en: "/", hi: "/hi" } } : undefined,
    openGraph: { title, description: c.hero.text, siteName: SITE.product, locale: lang === "hi" ? "hi_IN" : "en_IN", type: "website", images: [{ url: "/assets/images/erplogo.png", width: 500, height: 500 }] },
    twitter: { card: "summary", title, description: c.hero.text },
  };
};

export default function SiteLayout({ children, params }: { children: React.ReactNode; params: { lang: string } }) {
  if (!isLang(params.lang)) notFound();
  const lang = params.lang;
  const { base, otherBase } = siteBase(lang);
  return (
    <div lang={lang} className={`min-h-screen bg-white text-slate-800 antialiased ${lang === "hi" ? devanagari.className : "font-inter"}`}>
      <SiteHeader lang={lang} base={base} otherBase={otherBase} />
      <main>{children}</main>
      <SiteFooter lang={lang} base={base} />
      <WhatsAppButton lang={lang} />
    </div>
  );
}
