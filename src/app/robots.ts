import type { MetadataRoute } from "next";

/** Search engines: the product website is public; schools' ERP pages need a sign-in anyway. */
export default function robots(): MetadataRoute.Robots {
  const site = process.env.NEXT_PUBLIC_SITE_URL;
  return { rules: [{ userAgent: "*", allow: "/", disallow: ["/platform", "/api"] }], ...(site ? { sitemap: `${site.replace(/\/$/, "")}/sitemap.xml` } : {}) };
}
