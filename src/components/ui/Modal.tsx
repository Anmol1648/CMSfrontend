"use client";

import React, { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  width?: string;
  height?: string;
  className?: string;
  hideCloseButton?: boolean;
}

export const Modal = ({
  isOpen,
  onClose,
  title,
  children,
  width = "max-w-md",
  height = "auto",
  className,
  hideCloseButton = false,
}: ModalProps) => {
  const [render, setRender] = useState(isOpen);

  useEffect(() => {
    if (isOpen) setRender(true);
  }, [isOpen]);

  const onAnimationEnd = () => {
    if (!isOpen) setRender(false);
  };

  useEffect(() => {
    // Disable scroll on body when modal is open
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  if (!render) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 pointer-events-none">
      {/* Backdrop */}
      <div
        className={cn(
          "absolute inset-0 bg-[#0B1C30]/40 backdrop-blur-md pointer-events-auto transition-opacity duration-300",
          isOpen ? "opacity-100" : "opacity-0"
        )}
        onClick={onClose}
      />
      
      {/* Modal Content */}
      <div
        className={cn(
          "relative bg-surface-lowest rounded-3xl shadow-premium overflow-hidden flex flex-col pointer-events-auto transition-all duration-300 transform w-full",
          width,
          height !== "auto" && height,
          isOpen ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-95 translate-y-4",
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
        <div className="flex-1 overflow-y-auto px-8 py-6 max-h-[80vh]">
          {children}
        </div>
      </div>
    </div>
  );
};
