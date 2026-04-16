import React from "react";
import { cn } from "@/lib/utils";

interface AvatarProps {
  src?: string;
  initials: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export const Avatar = ({ src, initials, size = "md", className }: AvatarProps) => {
  const sizes = {
    sm: "w-8 h-8 text-[10px]",
    md: "w-10 h-10 text-sm",
    lg: "w-14 h-14 text-lg",
  };

  return (
    <div className={cn(
      "rounded-full border-2 border-surface flex items-center justify-center font-black transition-all hover:scale-105 select-none overflow-hidden",
      sizes[size],
      !src && "bg-primary-fixed text-primary",
      className
    )}>
      {src ? (
        <img src={src} alt={initials} className="w-full h-full object-cover" />
      ) : (
        initials
      )}
    </div>
  );
};

export const AvatarGroup = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <div className={cn("flex -space-x-3 items-center", className)}>
    {children}
  </div>
);
