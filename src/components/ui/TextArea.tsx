"use client";

import { cn } from "@/lib/utils";
import React from "react";

interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const TextArea = ({ label, error, className, ...props }: TextAreaProps) => {
  return (
    <div className="flex flex-col gap-2 w-full">
      {label && (
        <label className="text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-widest ml-1">
          {label}
        </label>
      )}
      <textarea
        className={cn(
          "w-full px-4 py-3 bg-surface-container-low rounded-xl border-none outline-none transition-all duration-300 resize-none min-h-[120px]",
          "text-sm text-primary font-medium placeholder:text-on-surface-variant/40",
          "focus:ring-2 focus:ring-primary/10",
          "scrollbar-thin scrollbar-thumb-primary/10 scrollbar-track-transparent",
          error ? "ring-2 ring-error/50" : "",
          className
        )}
        {...props}
      />
      {error && <span className="text-[10px] font-bold text-error uppercase tracking-wider ml-1">{error}</span>}
    </div>
  );
};
