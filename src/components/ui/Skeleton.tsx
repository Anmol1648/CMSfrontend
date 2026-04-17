"use client";

import { cn } from "@/lib/utils";
import React from "react";

interface SkeletonProps {
  className?: string;
  variant?: "text" | "circular" | "rectangular" | "rounded";
}

export const Skeleton = ({ className, variant = "rounded" }: SkeletonProps) => {
  return (
    <div
      className={cn(
        "animate-pulse bg-surface-container-high/60",
        variant === "circular" && "rounded-full",
        variant === "rounded" && "rounded-xl",
        className
      )}
    />
  );
};

export const SkeletonGroup = ({ children, className }: { children: React.ReactNode; className?: string }) => {
  return <div className={cn("flex flex-col gap-3", className)}>{children}</div>;
};
