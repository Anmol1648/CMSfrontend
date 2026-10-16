"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
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
    if (!isOpen) return;
    // No page scrolling behind the dialog; Esc closes it.
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKey);
    };
  }, [isOpen, onClose]);

  if (!render) return null;

  // Rendered at the end of <body>: a parent with an animation or transform would otherwise trap the
  // "fixed" overlay inside it and leave parts of the screen (the top bar) uncovered.
  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 pointer-events-none" role="dialog" aria-modal="true" aria-label={title}>
      {/* Backdrop: a light dim, so the page stays recognisable behind the dialog */}
      <div
        className={cn(
          "absolute inset-0 bg-slate-900/40 pointer-events-auto transition-opacity duration-200",
          isOpen ? "opacity-100" : "opacity-0"
        )}
        onClick={onClose}
      />
      
      {/* Modal Content */}
      <div
        className={cn(
          "relative bg-surface-lowest rounded-3xl shadow-[0_24px_64px_-12px_rgba(15,23,42,0.35)] ring-1 ring-black/5 overflow-hidden flex flex-col pointer-events-auto transition-all duration-200 transform w-full",
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
    </div>,
    document.body
  );
};
