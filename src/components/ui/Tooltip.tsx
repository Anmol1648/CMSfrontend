"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";

interface TooltipProps {
  content: string;
  children: React.ReactNode;
  position?: "top" | "bottom" | "left" | "right";
  className?: string;
}

export const Tooltip = ({ content, children, position = "top", className }: TooltipProps) => {
  const [isVisible, setIsVisible] = useState(false);

  const positionClasses = {
    top: "bottom-full left-1/2 -translate-x-1/2 mb-3",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-3",
    left: "right-full top-1/2 -translate-y-1/2 mr-3",
    right: "left-full top-1/2 -translate-y-1/2 ml-3",
  };

  const arrowClasses = {
    top: "top-full left-1/2 -translate-x-1/2 border-t-on-surface",
    bottom: "bottom-full left-1/2 -translate-x-1/2 border-b-on-surface",
    left: "left-full top-1/2 -translate-y-1/2 border-l-on-surface",
    right: "right-full top-1/2 -translate-y-1/2 border-r-on-surface",
  };

  return (
    <div 
      className="relative inline-block"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      {children}
      {isVisible && (
        <div 
          className={cn(
            "absolute z-[100] px-3 py-1.5 bg-on-surface text-surface-container-lowest text-[11px] font-bold rounded-lg whitespace-nowrap shadow- premium animate-fade-in-up",
            positionClasses[position],
            className
          )}
        >
          {content}
          <div 
            className={cn(
              "absolute border-[6px] border-transparent",
              arrowClasses[position]
            )} 
          />
        </div>
      )}
    </div>
  );
};
