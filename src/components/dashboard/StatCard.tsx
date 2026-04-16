import React from "react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  icon: string;
  label: string;
  value: string;
  trend?: {
    value: string;
    type: "up" | "down" | "neutral";
  };
  colorClass?: string;
}

export const StatCard = ({ icon, label, value, trend, colorClass = "bg-primary-fixed" }: StatCardProps) => {
  return (
    <div className="bg-surface-container-lowest p-8 rounded-2xl flex flex-col justify-between min-h-[200px] hover:translate-y-[-4px] hover:shadow-premium transition-all duration-300 group cursor-default">
      <div className="flex justify-between items-start">
        <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110", colorClass)}>
          <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>
            {icon}
          </span>
        </div>
        
        {trend && (
          <span className={cn(
            "text-[10px] font-black px-2.5 py-1.5 rounded-full tracking-wider flex items-center gap-1",
            trend.type === "up" ? "text-emerald-600 bg-emerald-50" : 
            trend.type === "down" ? "text-error bg-error/5" : 
            "text-on-surface-variant bg-surface-container"
          )}>
            <span className="material-symbols-outlined text-xs">
              {trend.type === "up" ? "trending_up" : trend.type === "down" ? "trending_down" : "horizontal_rule"}
            </span>
            {trend.value}
          </span>
        )}
      </div>
      
      <div>
        <p className="text-4xl font-black text-primary tracking-tighter mb-1 mt-6">{value}</p>
        <p className="text-[10px] font-bold text-on-surface-variant/50 uppercase tracking-[0.15em]">{label}</p>
      </div>
    </div>
  );
};
