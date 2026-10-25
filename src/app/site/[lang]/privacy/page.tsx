import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { isLang } from "@/lib/site/content";
import { LegalPage } from "@/components/site/LegalPage";
import { LEGAL } from "@/lib/site/legal";

export const metadata: Metadata = { title: LEGAL.privacy.title };

export default function Page({ params }: { params: { lang: string } }) {
  if (!isLang(params.lang)) notFound();
  return <LegalPage doc={LEGAL.privacy} lang={params.lang} />;
}
