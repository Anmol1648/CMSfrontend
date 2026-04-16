import React from "react";
import { cn } from "@/lib/utils";

interface Tab {
  id: string;
  label: string;
}

interface TabsProps {
  tabs: Tab[];
  activeTab: string;
  onChange: (id: string) => void;
  className?: string;
}

export const Tabs = ({ tabs, activeTab, onChange, className }: TabsProps) => {
  return (
    <div className={cn("flex border-b border-outline-variant/10", className)}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={cn(
              "px-6 py-3 text-[10px] font-black uppercase tracking-[0.2em] relative transition-colors",
              isActive ? "text-primary" : "text-on-surface-variant/40 hover:text-primary"
            )}
          >
            {tab.label}
            {isActive && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-full shadow-[0_-4px_12px_rgba(26,54,93,0.2)]" />
            )}
          </button>
        );
      })}
    </div>
  );
};
