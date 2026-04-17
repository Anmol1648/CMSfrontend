"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";

interface AccordionItem {
  id: string;
  title: string;
  content: React.ReactNode;
}

interface AccordionProps {
  items: AccordionItem[];
  allowMultiple?: boolean;
  className?: string;
}

export const Accordion = ({ items, allowMultiple = false, className }: AccordionProps) => {
  const [openIds, setOpenIds] = useState<string[]>([]);

  const toggleItem = (id: string) => {
    if (allowMultiple) {
      setOpenIds(prev => 
        prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
      );
    } else {
      setOpenIds(prev => prev.includes(id) ? [] : [id]);
    }
  };

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      {items.map((item) => {
        const isOpen = openIds.includes(item.id);
        
        return (
          <div 
            key={item.id} 
            className={cn(
              "bg-surface-container-low rounded-2xl overflow-hidden transition-all duration-300",
              isOpen ? "ring-1 ring-primary/5 shadow-premium" : "hover:bg-surface-container-high/50"
            )}
          >
            <button
              onClick={() => toggleItem(item.id)}
              className="w-full flex items-center justify-between px-6 py-4 text-left"
            >
              <span className={cn(
                "text-sm font-bold transition-colors",
                isOpen ? "text-primary" : "text-on-surface"
              )}>
                {item.title}
              </span>
              <span className={cn(
                "material-symbols-outlined text-xl transition-transform duration-300",
                isOpen ? "rotate-180 text-primary" : "text-on-surface-variant"
              )}>
                expand_more
              </span>
            </button>
            <div 
              className={cn(
                "grid transition-all duration-300 ease-in-out",
                isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
              )}
            >
              <div className="overflow-hidden">
                <div className="px-6 pb-6 text-sm text-on-surface-variant font-medium leading-relaxed">
                  {item.content}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
