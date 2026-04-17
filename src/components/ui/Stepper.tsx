"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface Step {
  title: string;
  subtitle?: string;
}

interface StepperProps {
  steps: Step[];
  currentStep: number;
  className?: string;
}

export const Stepper = ({ steps, currentStep, className }: StepperProps) => {
  return (
    <div className={cn("w-full flex items-start justify-between relative", className)}>
      {/* Background Line */}
      <div className="absolute top-5 left-8 right-8 h-[2px] bg-surface-container-high z-0" />
      
      {/* Progress Line */}
      <div 
        className="absolute top-5 left-8 h-[2px] bg-primary z-0 transition-all duration-500 ease-in-out" 
        style={{ 
          width: `calc(${(currentStep / (steps.length - 1)) * 100}% - 4rem)`,
          opacity: currentStep === 0 ? 0 : 1
        }}
      />

      {steps.map((step, index) => {
        const isCompleted = index < currentStep;
        const isActive = index === currentStep;

        return (
          <div key={index} className="flex flex-col items-center relative z-10">
            {/* Circle Indicator */}
            <div 
              className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 border-2",
                isCompleted 
                  ? "bg-primary border-primary text-white" 
                  : isActive 
                    ? "bg-surface border-primary text-primary shadow-[0_0_15px_rgba(var(--primary-rgb),0.2)]" 
                    : "bg-surface border-surface-container-high text-on-surface-variant/40"
              )}
            >
              {isCompleted ? (
                <span className="material-symbols-outlined text-xl font-bold">check</span>
              ) : (
                <span className="text-sm font-bold">{index + 1}</span>
              )}
            </div>

            {/* Labels */}
            <div className="mt-3 text-center px-2">
              <p className={cn(
                "text-[11px] font-black uppercase tracking-wider mb-0.5 transition-colors",
                isActive ? "text-primary" : isCompleted ? "text-on-surface" : "text-on-surface-variant/40"
              )}>
                {step.title}
              </p>
              {step.subtitle && (
                <p className="text-[10px] text-on-surface-variant/40 font-medium truncate max-w-[120px]">
                  {step.subtitle}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
