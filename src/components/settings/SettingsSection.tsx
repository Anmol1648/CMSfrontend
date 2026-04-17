import React from "react";
import { cn } from "@/lib/utils";

interface SettingsSectionProps {
  title: string;
  description: string;
  children: React.ReactNode;
  className?: string;
}

export const SettingsSection = ({ title, description, children, className }: SettingsSectionProps) => {
  return (
    <div className={cn("bg-white border border-surface-variant/10 rounded-[2rem] p-10 shadow-premium", className)}>
      <div className="mb-8">
        <h3 className="text-display-sm text-primary tracking-tight mb-2">
          {title}
        </h3>
        <p className="text-on-surface-variant text-sm max-w-2xl leading-relaxed">
          {description}
        </p>
      </div>
      {children}
    </div>
  );
};
