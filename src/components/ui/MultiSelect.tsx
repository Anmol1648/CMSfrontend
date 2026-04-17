"use client";

import React, { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";

interface Option {
  value: string;
  label: string;
}

interface MultiSelectProps {
  label?: string;
  options: Option[];
  defaultValues?: string[];
  onChange?: (values: string[]) => void;
  className?: string;
}

export const MultiSelect = ({ label, options, defaultValues = [], onChange, className }: MultiSelectProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedValues, setSelectedValues] = useState<string[]>(defaultValues);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (value: string, event: React.MouseEvent) => {
    event.stopPropagation();
    let newValues;
    if (selectedValues.includes(value)) {
      newValues = selectedValues.filter(v => v !== value);
    } else {
      newValues = [...selectedValues, value];
    }
    setSelectedValues(newValues);
    if (onChange) {
      onChange(newValues);
    }
  };

  const removeValue = (valueToRemove: string, event: React.MouseEvent) => {
    event.stopPropagation();
    const newValues = selectedValues.filter(v => v !== valueToRemove);
    setSelectedValues(newValues);
    if (onChange) {
      onChange(newValues);
    }
  };

  const selectedOptions = options.filter(opt => selectedValues.includes(opt.value));

  return (
    <div className={cn("flex flex-col gap-2", className)} ref={dropdownRef}>
      {label && <label className="text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-widest ml-1">{label}</label>}
      <div className="relative group/select">
        <div
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "w-full bg-surface-container-low min-h-[44px] flex justify-between items-center rounded-xl pl-2 pr-4 py-1.5 text-sm font-bold transition-all outline-none cursor-pointer",
            isOpen ? "ring-2 ring-primary/10" : ""
          )}
        >
          <div className="flex flex-wrap gap-1.5 flex-1 p-1">
            {selectedOptions.length > 0 ? (
              selectedOptions.map(opt => (
                <div key={opt.value} className="bg-primary/10 text-primary px-3 py-1 rounded-lg flex items-center gap-1.5 text-xs font-bold" onClick={(e) => e.stopPropagation()}>
                  {opt.label}
                  <span 
                    className="material-symbols-outlined text-[14px] cursor-pointer hover:text-error transition-colors"
                    onClick={(e) => removeValue(opt.value, e)}
                  >
                    close
                  </span>
                </div>
              ))
            ) : (
              <span className="text-on-surface-variant font-normal px-2 py-1.5">Select multiple...</span>
            )}
          </div>
          <div className={cn(
            "pointer-events-none transition-colors flex items-center shrink-0",
            isOpen ? "text-primary" : "text-on-surface-variant"
          )}>
            <span className="material-symbols-outlined text-xl">unfold_more</span>
          </div>
        </div>

        {isOpen && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-surface-container-low rounded-xl shadow-lg border border-black/5 overflow-hidden z-50">
            <div className="max-h-60 overflow-y-auto flex flex-col py-2">
              {options.map((opt) => {
                const isSelected = selectedValues.includes(opt.value);
                return (
                  <div
                    key={opt.value}
                    onClick={(e) => handleSelect(opt.value, e)}
                    className={cn(
                      "px-4 py-2.5 text-sm cursor-pointer transition-colors hover:bg-surface-container-high font-medium flex justify-between items-center",
                      isSelected ? "bg-primary/5 text-primary" : "text-on-surface"
                    )}
                  >
                    {opt.label}
                    {isSelected && (
                      <span className="material-symbols-outlined text-lg text-primary">check</span>
                    )}
                  </div>
                );
              })}
              {options.length === 0 && (
                <div className="px-4 py-3 text-sm text-on-surface-variant text-center outline-none">No options available</div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
