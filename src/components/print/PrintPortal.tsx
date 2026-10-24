"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

/**
 * Renders its children straight under <body>, hidden on screen; window.print() prints only them
 * (the app, modals and drawers are hidden while printing).
 */
export function PrintPortal({ children, page = "@page { size: A4; margin: 12mm; }" }: { children: React.ReactNode; page?: string }) {
  const [el, setEl] = useState<HTMLElement | null>(null);
  useEffect(() => {
    const d = document.createElement("div");
    d.className = "print-portal";
    document.body.appendChild(d);
    setEl(d);
    return () => d.remove();
  }, []);
  if (!el) return null;
  return createPortal(
    <>
      <style>{`.print-portal { display: none; } @media print { body > *:not(.print-portal) { display: none !important; } .print-portal { display: block; position: static !important; } .print-portal, .print-portal * { visibility: visible !important; } } ${page}`}</style>
      {children}
    </>,
    el
  );
}
