import React from "react";
import { cn } from "@/lib/utils";

export const Header = () => {
  return (
    <header className="fixed top-0 right-0 left-64 h-20 bg-surface/80 backdrop-blur-xl flex justify-between items-center px-12 z-40 border-b border-outline-variant/10">
      <div className="flex items-center w-1/2">
        <div className="relative w-full max-w-md group">
          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant group-focus-within:text-primary transition-colors">
            search
          </span>
          <input
            type="text"
            placeholder="Search resources, students, or faculty..."
            className="w-full pl-12 pr-4 py-2.5 bg-surface-container-highest/50 border-none rounded-full focus:ring-2 focus:ring-primary/20 text-sm text-on-surface placeholder:text-on-surface-variant/40 transition-all outline-none"
          />
        </div>
      </div>

      <div className="flex items-center gap-6">
        <button className="relative p-2 text-on-surface-variant hover:text-primary transition-all">
          <span className="material-symbols-outlined">notifications</span>
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-error rounded-full border-2 border-surface"></span>
        </button>
        
        <button className="p-2 text-on-surface-variant hover:text-primary transition-all">
          <span className="material-symbols-outlined">help_outline</span>
        </button>

        <div className="flex items-center gap-3 pl-4 border-l border-outline-variant/30">
          <div className="text-right">
            <p className="text-[10px] text-on-surface-variant font-bold uppercase tracking-widest leading-tight">Administrator</p>
            <p className="text-sm font-bold text-primary">Dr. Alistair Thorne</p>
          </div>
          <div className="w-10 h-10 rounded-full border-2 border-surface-container-high shadow-premium flex items-center justify-center bg-primary text-white font-bold text-sm">
            AT
          </div>
        </div>
      </div>
    </header>
  );
};
