"use client";

import React, { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";

interface Option {
  value: string;
  label: string;
}

interface CustomSelectProps {
  label?: string;
  options: Option[];
  defaultValue?: string;
  onChange?: (value: string) => void;
  className?: string;
}

export const CustomSelect = ({ label, options, defaultValue, onChange, className }: CustomSelectProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedValue, setSelectedValue] = useState(defaultValue || (options.length > 0 ? options[0].value : ""));
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === selectedValue);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (value: string) => {
    setSelectedValue(value);
    setIsOpen(false);
    if (onChange) {
      onChange(value);
    }
  };

  return (
    <div className={cn("flex flex-col gap-2", className)} ref={dropdownRef}>
      {label && <label className="text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-widest ml-1">{label}</label>}
      <div className="relative group/select">
        <div
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "w-full bg-surface-container-low flex justify-between items-center rounded-xl px-4 py-3 text-sm text-primary font-bold transition-all outline-none cursor-pointer",
            isOpen ? "ring-2 ring-primary/10" : ""
          )}
        >
          <span>{selectedOption ? selectedOption.label : "Select..."}</span>
          <div className={cn(
            "pointer-events-none transition-colors flex items-center",
            isOpen ? "text-primary" : "text-on-surface-variant"
          )}>
            <span className="material-symbols-outlined text-xl">unfold_more</span>
          </div>
        </div>

        {isOpen && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-surface-container-low rounded-xl shadow-lg border border-black/5 overflow-hidden z-50">
            <div className="max-h-60 overflow-y-auto flex flex-col py-2">
              {options.map((opt) => (
                <div
                  key={opt.value}
                  onClick={() => handleSelect(opt.value)}
                  className={cn(
                    "px-4 py-2.5 text-sm cursor-pointer transition-colors hover:bg-surface-container-high font-medium",
                    selectedValue === opt.value ? "bg-primary/10 text-primary" : "text-on-surface"
                  )}
                >
                  {opt.label}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
