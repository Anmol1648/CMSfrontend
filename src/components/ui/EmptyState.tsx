"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { Button } from "./Button";

interface EmptyStateProps {
  icon?: string;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export const EmptyState = ({
  icon = "search_off",
  title,
  description,
  actionLabel,
  onAction,
  className
}: EmptyStateProps) => {
  return (
    <div className={cn("flex flex-col items-center justify-center p-12 text-center bg-surface-container-lowest/50 rounded-2xl border border-dashed border-outline-variant/30", className)}>
      <div className="w-16 h-16 rounded-full bg-surface-container-high flex items-center justify-center mb-6">
        <span className="material-symbols-outlined text-4xl text-on-surface-variant/40">
          {icon}
        </span>
      </div>
      <h3 className="text-lg font-bold text-on-surface tracking-tight mb-2">
        {title}
      </h3>
      <p className="text-sm text-on-surface-variant/60 font-medium max-w-[280px] mb-8 leading-relaxed">
        {description}
      </p>
      {actionLabel && onAction && (
        <Button 
          onClick={onAction}
          className="h-10 px-6 font-bold shadow-sm"
        >
          {actionLabel}
        </Button>
      )}
    </div>
  );
};
