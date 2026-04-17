"use client";

import React, { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";

interface DropdownItem {
  id: string;
  label: string;
  icon?: string;
  onClick: () => void;
  variant?: "default" | "danger";
}

interface DropdownProps {
  trigger: React.ReactNode;
  items: DropdownItem[];
  className?: string;
  position?: "bottom-left" | "bottom-right" | "top-left" | "top-right";
}

export const Dropdown = ({ trigger, items, className, position = "bottom-right" }: DropdownProps) => {
  const [isOpen, setIsOpen] = useState(false);
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

  const positionClasses = {
    "bottom-right": "top-full right-0 mt-2",
    "bottom-left": "top-full left-0 mt-2",
    "top-right": "bottom-full right-0 mb-2",
    "top-left": "bottom-full left-0 mb-2",
  };

  return (
    <div className={cn("relative inline-block", className)} ref={dropdownRef}>
      <div 
        onClick={() => setIsOpen(!isOpen)} 
        className="cursor-pointer flex items-center justify-center h-full"
      >
        {trigger}
      </div>

      {isOpen && (
        <div className={cn(
          "absolute z-[100] min-w-[160px] bg-surface-container-low rounded-xl shadow-premium border border-black/5 overflow-hidden animate-zoom-in py-1.5",
          positionClasses[position]
        )}>
          {items.map((item) => (
            <div
              key={item.id}
              onClick={() => {
                item.onClick();
                setIsOpen(false);
              }}
              className={cn(
                "px-4 py-2 text-sm font-bold flex items-center gap-3 cursor-pointer transition-colors",
                item.variant === "danger" 
                  ? "text-error hover:bg-error/10" 
                  : "text-on-surface hover:bg-surface-container-high"
              )}
            >
              {item.icon && (
                <span className="material-symbols-outlined text-lg">{item.icon}</span>
              )}
              {item.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
