import { headers } from "next/headers";
import type { Lang } from "./content";

/**
 * Where the website's pages are, for links: on its own domain (the middleware marks those requests)
 * English is at "/" and Hindi at "/hi"; anywhere else they are under /site/en and /site/hi.
 */
export const siteBase = (lang: Lang) => {
  const root = headers().get("x-site-root") === "1";
  const of = (l: Lang) => (root ? (l === "en" ? "" : "/hi") : `/site/${l}`);
  return { base: of(lang), otherBase: of(lang === "en" ? "hi" : "en") || "/" };
};
