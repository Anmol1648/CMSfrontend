import type { MetadataRoute } from "next";

/** The product website's pages in English and Hindi (only when its address is set: NEXT_PUBLIC_SITE_URL). */
export default function sitemap(): MetadataRoute.Sitemap {
  const site = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  if (!site) return [];
  const pages = ["", "/features", "/pricing", "/demo", "/about", "/privacy", "/terms", "/refund"];
  return pages.flatMap((p) => [
    { url: `${site}${p || "/"}`, changeFrequency: "monthly" as const, priority: p ? 0.7 : 1, alternates: { languages: { en: `${site}${p || "/"}`, hi: `${site}/hi${p}` } } },
  ]);
}
