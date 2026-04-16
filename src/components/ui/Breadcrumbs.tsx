import React from "react";
import { cn } from "@/lib/utils";
import { ChevronRight, Home } from "lucide-react";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  className?: string;
}

export const Breadcrumbs = ({ items, className }: BreadcrumbsProps) => {
  return (
    <nav className={cn("flex items-center gap-2 mb-6", className)}>
      <div className="flex items-center gap-2 text-on-surface-variant/40 hover:text-primary transition-colors cursor-pointer">
        <Home size={14} />
      </div>
      
      {items.map((item, i) => (
        <React.Fragment key={i}>
          <ChevronRight size={14} className="text-on-surface-variant/20" />
          <a
            href={item.href || "#"}
            className={cn(
              "text-[10px] font-bold uppercase tracking-widest transition-colors",
              i === items.length - 1 ? "text-primary" : "text-on-surface-variant/40 hover:text-primary"
            )}
          >
            {item.label}
          </a>
        </React.Fragment>
      ))}
    </nav>
  );
};
