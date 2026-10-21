"use client";

import { useEffect, useState } from "react";
import { activity } from "@/lib/api/activity";

/**
 * A thin bar along the top of the window while the app is talking to the server. It appears only
 * after a short moment (quick calls don't flicker) and stays briefly so it can be seen.
 */
export function ActivityBar() {
  const [busy, setBusy] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => activity.onBusyChange(() => setBusy(activity.busy())), []);
  useEffect(() => {
    if (busy) {
      const t = setTimeout(() => setVisible(true), 150);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setVisible(false), 250);
    return () => clearTimeout(t);
  }, [busy]);

  return (
    <div aria-hidden={!visible} className={`fixed top-0 inset-x-0 z-[200] h-[3px] overflow-hidden pointer-events-none transition-opacity duration-300 ${visible ? "opacity-100" : "opacity-0"}`}>
      <div className="activity-bar h-full w-1/3 rounded-full bg-gradient-to-r from-[#1a365d] via-[#3b6ea8] to-[#1a365d] shadow-[0_0_8px_rgba(26,54,93,0.5)]" />
      {visible && (
        <span className="sr-only" role="status">
          Working…
        </span>
      )}
    </div>
  );
}
