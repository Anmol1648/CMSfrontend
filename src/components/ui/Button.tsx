import { cn } from "@/lib/utils";
import React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "tertiary";
  children: React.ReactNode;
}

export const Button = ({ variant = "primary", children, className, ...props }: ButtonProps) => {
  const baseStyles = "px-6 py-2.5 font-medium transition-all duration-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20 active:scale-95";

  const variants = {
    primary: "gradient-primary text-white shadow-ambient",
    secondary: "bg-surface-high text-primary hover:bg-surface-highest",
    tertiary: "relative p-0 rounded-none bg-transparent text-primary hover:text-primary-container group",
  };

  return (
    <button className={cn(baseStyles, variants[variant], className)} {...props}>
      {children}
      {variant === "tertiary" && (
        <span className="absolute bottom-0 left-0 w-0 h-[1px] bg-primary transition-all duration-300 group-hover:w-full" />
      )}
    </button>
  );
};
