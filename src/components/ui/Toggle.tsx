import React from "react";
import { cn } from "@/lib/utils";

interface ToggleProps {
  label: string;
  defaultChecked?: boolean;
  type?: "switch" | "checkbox";
  className?: string;
}

export const Toggle = ({ label, defaultChecked = false, type = "switch", className }: ToggleProps) => {
  return (
    <label className={cn("flex items-center gap-3 cursor-pointer group select-none", className)}>
      <div className="relative">
        <input type="checkbox" defaultChecked={defaultChecked} className="sr-only peer" />
        
        {type === "switch" ? (
          <div className="w-12 h-6 bg-surface-container-highest rounded-full peer peer-checked:bg-primary transition-all duration-300 relative">
            <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full shadow-sm peer-checked:translate-x-6 transition-transform duration-300" />
          </div>
        ) : (
          <div className="w-6 h-6 bg-surface-container-highest rounded-md peer peer-checked:bg-primary transition-all duration-300 flex items-center justify-center">
            <span className="material-symbols-outlined text-sm text-white scale-0 peer-checked:scale-100 transition-transform">check</span>
          </div>
        )}
      </div>
      <span className="text-sm font-semibold text-primary group-hover:opacity-80 transition-opacity">{label}</span>
    </label>
  );
};
