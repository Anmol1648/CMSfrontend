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

/** Labelled dropdown in the same style as Input. */
export function Select({
  label,
  value,
  onChange,
  options,
  error,
  disabled,
  className,
}: {
  label?: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  error?: string;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <label className={cn("flex flex-col gap-2 w-full", className)}>
      {label && <span className="text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-widest ml-1">{label}</span>}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className={cn(
          "w-full bg-surface-container-low rounded-xl border-none outline-none py-3.5 px-4 text-sm text-primary font-bold focus:ring-2 focus:ring-primary/10 disabled:opacity-60",
          error && "ring-2 ring-error/50"
        )}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {error && <span className="text-[10px] font-bold text-error uppercase tracking-wider ml-1">{error}</span>}
    </label>
  );
}

/** Checkbox with a label and optional hint line. */
export function Checkbox({
  checked,
  onChange,
  label,
  hint,
  disabled,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: React.ReactNode;
  hint?: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <label className={cn("flex items-start gap-3 select-none", disabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer")}>
      <input type="checkbox" className="mt-0.5 w-4 h-4 accent-[#1A365D]" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
      <span className="flex flex-col">
        <span className="text-sm font-semibold text-on-surface">{label}</span>
        {hint && <span className="text-xs text-on-surface-variant/70 mt-0.5">{hint}</span>}
      </span>
    </label>
  );
}

/** Small coloured label (status, role, flags). */
export function Pill({ tone = "neutral", children }: { tone?: "neutral" | "success" | "warning" | "danger" | "primary"; children: React.ReactNode }) {
  const tones = {
    neutral: "bg-surface-container text-on-surface-variant",
    success: "bg-emerald-50 text-emerald-700",
    warning: "bg-amber-50 text-amber-800",
    danger: "bg-error-container/50 text-error",
    primary: "bg-primary/10 text-primary",
  };
  return <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider", tones[tone])}>{children}</span>;
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
