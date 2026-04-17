import { cn } from "@/lib/utils";
import React from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
  suffix?: React.ReactNode;
}

export const Input = ({ label, error, icon, suffix, className, ...props }: InputProps) => {
  return (
    <div className="flex flex-col gap-2 w-full group/input">
      {label && (
        <label className="text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-widest ml-1 transition-colors group-focus-within/input:text-primary">
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        {icon && (
          <div className="absolute left-4 text-on-surface-variant/40 flex items-center justify-center pointer-events-none transition-colors group-focus-within/input:text-primary/60">
            {typeof icon === "string" ? (
              <span className="material-symbols-outlined text-lg">{icon}</span>
            ) : (
              icon
            )}
          </div>
        )}
        
        <input
          className={cn(
            "w-full bg-surface-container-low rounded-xl border-none outline-none transition-all duration-300",
            "text-sm text-primary font-bold placeholder:text-on-surface-variant/40",
            "focus:ring-2 focus:ring-primary/10",
            icon ? "pl-11" : "pl-4",
            suffix ? "pr-12" : "pr-4",
            "py-3.5",
            error ? "ring-2 ring-error/50" : "",
            className
          )}
          {...props}
        />

        {suffix && (
          <div className="absolute right-4 flex items-center justify-center">
            {suffix}
          </div>
        )}
      </div>
      {error && (
        <span className="text-[10px] font-bold text-error uppercase tracking-wider ml-1 animate-fade-in-up">
          {error}
        </span>
      )}
    </div>
  );
};
