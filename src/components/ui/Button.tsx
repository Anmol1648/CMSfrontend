"use client";

import { cn } from "@/lib/utils";
import React, { useEffect, useRef, useState } from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "tertiary";
  /** Show the spinner (when the page tracks the work itself). */
  loading?: boolean;
  children: React.ReactNode;
}

const Spinner = ({ light }: { light: boolean }) => (
  <span aria-hidden className={cn("inline-block w-4 h-4 rounded-full border-2 animate-spin shrink-0", light ? "border-white/30 border-t-white" : "border-primary/20 border-t-primary")} />
);

/**
 * The app's button. While the click's work runs (an onClick that returns a promise) — or while the
 * page says so (`loading`, or a disabled "Saving…"-style label) — it shows a spinner and can't be
 * pressed again, so people see something is happening and don't click twice.
 */
export const Button = ({ variant = "primary", loading, children, className, onClick, disabled, ...props }: ButtonProps) => {
  const [running, setRunning] = useState(false);
  const mounted = useRef(true);
  useEffect(
    () => () => {
      mounted.current = false;
    },
    []
  );
  const baseStyles = "px-6 py-2.5 font-medium transition-all duration-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100";

  const variants = {
    primary: "gradient-primary text-white shadow-ambient",
    secondary: "bg-surface-high text-primary hover:bg-surface-highest",
    tertiary: "relative p-0 rounded-none bg-transparent text-primary hover:text-primary-container group",
  };

  // Pages often show "Saving…" / "Generating…" while busy: that is a busy button too.
  const busyLabel = disabled && typeof children === "string" && children.trim().endsWith("…");
  const busy = loading || running || busyLabel;

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (running) return;
    const result = onClick?.(e) as unknown;
    if (result && typeof (result as Promise<unknown>).then === "function") {
      setRunning(true);
      (result as Promise<unknown>).finally(() => mounted.current && setRunning(false));
    }
  };

  return (
    <button className={cn(baseStyles, variants[variant], busy && variant !== "tertiary" && "inline-flex items-center justify-center gap-2", className)} disabled={disabled || busy} aria-busy={busy || undefined} onClick={handleClick} {...props}>
      {busy && variant !== "tertiary" && <Spinner light={variant === "primary"} />}
      {children}
      {variant === "tertiary" && <span className="absolute bottom-0 left-0 w-0 h-[1px] bg-primary transition-all duration-300 group-hover:w-full" />}
    </button>
  );
};
