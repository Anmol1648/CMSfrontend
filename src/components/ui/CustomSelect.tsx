import React from "react";
import { cn } from "@/lib/utils";

interface Option {
  value: string;
  label: string;
}

interface CustomSelectProps {
  label?: string;
  options: Option[];
  defaultValue?: string;
  className?: string;
}

export const CustomSelect = ({ label, options, defaultValue, className }: CustomSelectProps) => {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {label && <label className="text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-widest ml-1">{label}</label>}
      <div className="relative group/select">
        <select
          defaultValue={defaultValue}
          className="w-full bg-surface-container-low border-none rounded-xl px-4 py-3 text-sm text-primary font-bold focus:ring-2 focus:ring-primary/10 transition-all outline-none appearance-none cursor-pointer pr-12"
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-on-surface-variant group-focus-within/select:text-primary transition-colors">
          <span className="material-symbols-outlined text-xl">unfold_more</span>
        </div>
      </div>
    </div>
  );
};
