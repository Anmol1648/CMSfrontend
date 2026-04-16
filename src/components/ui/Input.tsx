import { cn } from "@/lib/utils";
import React from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = ({ label, error, className, ...props }: InputProps) => {
  return (
    <div className="flex flex-col gap-2 w-full">
      {label && (
        <label className="text-label-md text-on-surface-variant px-1">
          {label}
        </label>
      )}
      <input
        className={cn(
          "w-full px-4 py-3 bg-surface-highest rounded-md border-2 border-transparent outline-none transition-all duration-300",
          "focus:bg-surface-lowest focus:border-primary/20",
          error ? "border-red-500/50" : "",
          className
        )}
        {...props}
      />
      {error && <span className="text-xs text-red-500 px-1">{error}</span>}
    </div>
  );
};
