import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { isLang } from "@/lib/site/content";
import { LegalPage } from "@/components/site/LegalPage";
import { LEGAL } from "@/lib/site/legal";

export const metadata: Metadata = { title: LEGAL.deleteAccount.title };

/** How a person asks for their account and data to be deleted (linked from the app's Play Store listing). */
export default function Page({ params }: { params: { lang: string } }) {
  if (!isLang(params.lang)) notFound();
  return <LegalPage doc={LEGAL.deleteAccount} lang={params.lang} />;
}
