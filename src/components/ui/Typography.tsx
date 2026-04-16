import { cn } from "@/lib/utils";
import React from "react";

interface TypographyProps {
  children: React.ReactNode;
  className?: string;
  as?: React.ElementType;
}

export const Display = ({ children, className, as: Component = "h1" }: TypographyProps) => (
  <Component className={cn("text-display-lg text-on-surface", className)}>
    {children}
  </Component>
);

export const Headline = ({ children, className, as: Component = "h2" }: TypographyProps) => (
  <Component className={cn("text-headline-lg text-on-surface mb-6", className)}>
    {children}
  </Component>
);

export const Body = ({ children, className, as: Component = "p" }: TypographyProps) => (
  <Component className={cn("text-body-lg text-on-surface", className)}>
    {children}
  </Component>
);

export const Label = ({ children, className, as: Component = "span" }: TypographyProps) => (
  <Component className={cn("text-label-md text-on-surface-variant", className)}>
    {children}
  </Component>
);
