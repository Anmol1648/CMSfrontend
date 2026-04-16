import { cn } from "@/lib/utils";
import React from "react";

interface ChipProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export const Chip = ({ children, className, onClick }: ChipProps) => {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center px-4 py-1.5 rounded-full",
        "bg-secondary-container text-on-secondary-container",
        "text-label-md font-medium transition-all duration-300",
        onClick ? "hover:bg-primary/10 active:scale-95 cursor-pointer" : "cursor-default",
        className
      )}
    >
      {children}
    </button>
  );
};
