import { NextRequest, NextResponse } from "next/server";

/**
 * The product website on its own domain (NEXT_PUBLIC_SITE_HOSTS, e.g. "klytos.in,www.klytos.in"):
 * "/" shows /site/en, "/hi" shows /site/hi, "/pricing" shows /site/en/pricing… (the address bar keeps
 * the short address). /login, the ERP and the console keep working on the same address. Other
 * addresses (schools) are the ERP as usual.
 */
const hosts = (process.env.NEXT_PUBLIC_SITE_HOSTS || "")
  .split(",")
  .map((h) => h.trim().toLowerCase())
  .filter(Boolean);

const SITE_PAGES = ["/features", "/pricing", "/demo", "/about", "/privacy", "/terms", "/refund", "/delete-account"];

export function middleware(req: NextRequest) {
  if (!hosts.length) return NextResponse.next();
  const host = (req.headers.get("host") || "").split(":")[0].toLowerCase();
  if (!hosts.includes(host)) return NextResponse.next();
  const path = req.nextUrl.pathname;
  const hi = path === "/hi" || path.startsWith("/hi/");
  const rest = hi ? path.slice(3) : path;
  // Only the website's own pages; /login, the ERP (home at /home) and /platform work as usual.
  if (!(rest === "" || rest === "/" || SITE_PAGES.includes(rest))) return NextResponse.next();
  const url = req.nextUrl.clone();
  url.pathname = `/site/${hi ? "hi" : "en"}${rest === "/" || rest === "" ? "" : rest}`;
  const headers = new Headers(req.headers);
  headers.set("x-site-root", "1");
  return NextResponse.rewrite(url, { request: { headers } });
}

export const config = {
  // Not for Next's own files, images and the like, robots.txt or the sitemap.
  matcher: ["/((?!_next/|assets/|favicon.ico|robots.txt|sitemap.xml|.*\\.[a-zA-Z0-9]{2,5}$).*)"],
};
