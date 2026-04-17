"use client";

import React, { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  width?: string;
  className?: string;
  hideCloseButton?: boolean;
}

export const Drawer = ({
  isOpen,
  onClose,
  title,
  children,
  width = "w-96",
  className,
  hideCloseButton = false,
}: DrawerProps) => {
  const [render, setRender] = useState(isOpen);

  useEffect(() => {
    if (isOpen) setRender(true);
  }, [isOpen]);

  const onAnimationEnd = () => {
    if (!isOpen) setRender(false);
  };

  useEffect(() => {
    // Disable scroll on body when drawer is open
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  if (!render) return null;

  return (
    <div className="fixed inset-0 z-[100] flex justify-end pointer-events-none">
      {/* Backdrop */}
      <div
        className={cn(
          "absolute inset-0 bg-[#0B1C30]/40 backdrop-blur-sm pointer-events-auto transition-opacity duration-300",
          isOpen ? "opacity-100" : "opacity-0"
        )}
        onClick={onClose}
      />
      
      {/* Drawer Content */}
      <div
        className={cn(
          "relative bg-surface-lowest shadow-premium h-full flex flex-col pointer-events-auto transition-transform duration-300 transform w-full max-w-full",
          width,
          isOpen ? "translate-x-0" : "translate-x-full",
          className
        )}
        onTransitionEnd={onAnimationEnd}
      >
        {/* Header */}
        {(title || !hideCloseButton) && (
          <div className="flex items-center justify-between px-8 py-5 border-b border-outline-variant/20 bg-surface-lowest shrink-0">
            <h3 className="text-xl font-bold text-primary">{title}</h3>
            {!hideCloseButton && (
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-surface-container hover:bg-surface-container-high transition-colors text-on-surface-variant hover:text-primary flex items-center justify-center -mr-2"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            )}
          </div>
        )}
        
        {/* Body */}
        <div className="flex-1 overflow-y-auto px-8 py-6">
          {children}
        </div>
      </div>
    </div>
  );
};
