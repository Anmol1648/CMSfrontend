import { cn } from "@/lib/utils";
import React from "react";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: "none" | "sm" | "md" | "lg";
}

export const Card = ({ children, className, padding = "md" }: CardProps) => {
  const paddings = {
    none: "p-0",
    sm: "p-4",
    md: "p-8",
    lg: "p-12",
  };

  return (
    <div
      className={cn(
        "bg-surface-lowest elevated-card rounded-md",
        paddings[padding],
        className
      )}
    >
      {children}
    </div>
  );
};
