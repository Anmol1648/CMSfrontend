"use client";

import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { formsApi } from "@/lib/api/forms";

/**
 * The school's own words across the app (Setup → Form Builder → Words): "Section" shows as
 * "Division", "Class" as "Grade"… The words are swapped on screen as pages draw (headings, menus,
 * tables, buttons, hints), whole words only and keeping capitals; what people type in boxes is never
 * touched, nor anything marked data-raw. PDFs made on the server keep their own wording.
 */

const SKIP = new Set(["INPUT", "TEXTAREA", "SCRIPT", "STYLE", "CODE", "PRE", "NOSCRIPT"]);
const ATTRS = ["placeholder", "title", "aria-label"];

const caseLike = (sample: string, word: string) => {
  if (sample === sample.toUpperCase() && sample !== sample.toLowerCase()) return word.toUpperCase();
  if (sample === sample.toLowerCase()) return word.toLowerCase();
  return word.charAt(0).toUpperCase() + word.slice(1);
};
const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export function TermsSwap() {
  const q = useQuery({ queryKey: ["terms"], queryFn: formsApi.terms, staleTime: 300_000 });
  const terms = q.data?.terms;

  useEffect(() => {
    const pairs = Object.entries(terms ?? {}).filter(([from, to]) => from && to && from.toLowerCase() !== to.toLowerCase());
    if (!pairs.length) return;
    // Longest first, so "Classes" wins over "Class"; whole words only (not "Classroom").
    pairs.sort((a, b) => b[0].length - a[0].length);
    const to = new Map(pairs.map(([f, t]) => [f.toLowerCase(), t]));
    const re = new RegExp(`(?<![A-Za-z])(${pairs.map(([f]) => escape(f)).join("|")})(?![A-Za-z])`, "gi");
    const written = new WeakMap<Node, string>();
    const swap = (s: string) => s.replace(re, (m) => caseLike(m, to.get(m.toLowerCase()) ?? m));
    const skipped = (el: Element | null) => {
      for (let e = el; e; e = e.parentElement) {
        if (SKIP.has(e.tagName) || e.hasAttribute("data-raw") || (e as HTMLElement).isContentEditable) return true;
      }
      return false;
    };
    const doText = (n: Text) => {
      const v = n.nodeValue ?? "";
      if (!v.trim() || written.get(n) === v || skipped(n.parentElement)) return;
      re.lastIndex = 0;
      if (!re.test(v)) return;
      const out = swap(v);
      written.set(n, out);
      if (out !== v) n.nodeValue = out;
    };
    // Hints on a box (placeholder, title) follow the words too; what is typed in it never does.
    const attrsSkipped = (el: Element) => el.hasAttribute("data-raw") || skipped(el.parentElement);
    const writtenAttrs = new WeakMap<Element, Record<string, string>>();
    const doAttrs = (el: Element) => {
      if (attrsSkipped(el)) return;
      for (const a of ATTRS) {
        const v = el.getAttribute(a);
        // Each value once: a word that contains the old one ("Class group") isn't swapped again.
        if (!v || writtenAttrs.get(el)?.[a] === v) continue;
        const out = swap(v);
        writtenAttrs.set(el, { ...writtenAttrs.get(el), [a]: out });
        if (out !== v) el.setAttribute(a, out);
      }
    };
    const doElement = (el: Element) => {
      doAttrs(el);
      if (skipped(el)) return;
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
      for (let n = walker.nextNode(); n; n = walker.nextNode()) {
        if (n.nodeType === Node.TEXT_NODE) doText(n as Text);
        else doAttrs(n as Element);
      }
    };
    doElement(document.body);
    const obs = new MutationObserver((list) => {
      for (const m of list) {
        if (m.type === "characterData") doText(m.target as Text);
        else if (m.type === "attributes") doAttrs(m.target as Element);
        else
          m.addedNodes.forEach((n) => {
            if (n.nodeType === Node.TEXT_NODE) doText(n as Text);
            else if (n.nodeType === Node.ELEMENT_NODE) doElement(n as Element);
          });
      }
    });
    obs.observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTRS });
    return () => obs.disconnect();
  }, [terms]);

  return null;
}
