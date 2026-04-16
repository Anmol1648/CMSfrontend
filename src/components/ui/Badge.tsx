import React from "react";
import { cn } from "@/lib/utils";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "success" | "error" | "warning";
  className?: string;
}

export const Badge = ({ children, variant = "primary", className }: BadgeProps) => {
  const variants = {
    primary: "bg-primary-fixed text-primary",
    secondary: "bg-secondary-fixed text-secondary",
    success: "bg-emerald-50 text-emerald-600",
    error: "bg-error-container text-error",
    warning: "bg-tertiary-fixed/30 text-tertiary",
  };

  return (
    <span className={cn(
      "px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider",
      variants[variant],
      className
    )}>
      {children}
    </span>
  );
};
