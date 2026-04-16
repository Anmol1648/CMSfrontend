import React from "react";
import { cn } from "@/lib/utils";

interface DatePickerProps {
  label?: string;
  defaultValue?: string;
  className?: string;
}

export const DatePicker = ({ label, defaultValue, className }: DatePickerProps) => {
  return (
    <div className={cn("flex flex-col gap-2 group", className)}>
      {label && <label className="text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-widest ml-1">{label}</label>}
      <div className="relative group/input">
        <input
          type="date"
          defaultValue={defaultValue}
          className="w-full bg-surface-container-low border-none rounded-xl px-4 py-3 text-sm text-primary font-medium focus:ring-2 focus:ring-primary/10 transition-all outline-none appearance-none cursor-pointer"
        />
        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-on-surface-variant group-focus-within/input:text-primary transition-colors">
          <span className="material-symbols-outlined text-xl">calendar_today</span>
        </div>
      </div>
    </div>
  );
};
