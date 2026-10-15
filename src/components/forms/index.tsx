"use client";

/** Small form building blocks shared by every screen. */
import React, { useState } from "react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

type InputProps = React.ComponentProps<typeof Input>;

/** Password input with a show/hide button. */
export function PasswordField(props: Omit<InputProps, "type" | "suffix">) {
  const [visible, setVisible] = useState(false);
  return (
    <Input
      {...props}
      type={visible ? "text" : "password"}
      icon={props.icon ?? "lock"}
      suffix={
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="text-on-surface-variant/40 hover:text-primary transition-colors"
          aria-label={visible ? "Hide password" : "Show password"}
          tabIndex={-1}
        >
          <span className="material-symbols-outlined text-lg">{visible ? "visibility_off" : "visibility"}</span>
        </button>
      }
    />
  );
}

/** Primary submit button with a spinner while busy. */
export function SubmitButton({
  busy,
  busyLabel,
  children,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { busy?: boolean; busyLabel?: string }) {
  return (
    <Button
      type="submit"
      disabled={busy || props.disabled}
      className={cn(
        "w-full py-4 text-white font-bold rounded-xl shadow-premium text-base tracking-tight transition-all active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2",
        className
      )}
      {...props}
    >
      {busy ? (
        <>
          <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          {busyLabel ?? "Please wait…"}
        </>
      ) : (
        children
      )}
    </Button>
  );
}

/** A message box above or inside a form. */
export function FormAlert({ tone = "error", children }: { tone?: "error" | "info" | "success" | "warning"; children: React.ReactNode }) {
  const tones = {
    error: { box: "bg-error-container/40 text-error", icon: "error" },
    info: { box: "bg-surface-container text-primary", icon: "info" },
    success: { box: "bg-emerald-50 text-emerald-800", icon: "check_circle" },
    warning: { box: "bg-amber-50 text-amber-800", icon: "warning" },
  }[tone];
  return (
    <div className={cn("flex items-start gap-3 rounded-xl px-4 py-3 text-sm font-semibold", tones.box)} role={tone === "error" ? "alert" : "status"}>
      <span className="material-symbols-outlined text-lg shrink-0">{tones.icon}</span>
      <div className="flex-1 leading-relaxed">{children}</div>
    </div>
  );
}

/** Label + value line for read-only details. */
export function Detail({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60">{label}</span>
      <span className="text-sm font-semibold text-on-surface">{value ?? "—"}</span>
    </div>
  );
}
