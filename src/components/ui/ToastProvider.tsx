"use client";

import React, { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { cn } from "@/lib/utils";

type ToastType = "success" | "error" | "info" | "warning";

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider = ({ children }: { children: ReactNode }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: ToastType = "info") => {
    const id = Math.random().toString(36).substr(2, 9);
    const newToast = { id, message, type };

    setToasts((prev) => [newToast, ...prev]);

    // Auto-dismiss after 4 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const typeStyles = {
    success: "bg-surface-lowest border-emerald-500/20 text-on-surface ring-2 ring-emerald-500/5",
    error: "bg-surface-lowest border-error/20 text-on-surface ring-2 ring-error/5",
    info: "bg-surface-lowest border-primary/20 text-on-surface ring-2 ring-primary/5",
    warning: "bg-surface-lowest border-amber-500/20 text-on-surface ring-2 ring-amber-500/5",
  };

  const typeIcons = {
    success: { name: "check_circle", color: "text-emerald-500" },
    error: { name: "error", color: "text-error" },
    info: { name: "info", color: "text-primary" },
    warning: { name: "warning", color: "text-amber-500" },
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}

      {/* Toast Container */}
      <div className="fixed top-10 right-4 z-[200] flex flex-col gap-3 pointer-events-none w-full max-w-xs">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={cn(
              "p-4 rounded-2xl shadow-premium border flex items-center gap-4 pointer-events-auto transition-all duration-500 animate-fade-in-up",
              typeStyles[toast.type]
            )}
          >
            <span className={cn("material-symbols-outlined text-2xl", typeIcons[toast.type].color)}>
              {typeIcons[toast.type].name}
            </span>
            <div className="flex-1">
              <p className="text-sm font-bold tracking-tight">{toast.message}</p>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-on-surface-variant/40 hover:text-on-surface transition-colors"
            >
              <span className="material-symbols-outlined text-lg">close</span>
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
};
