"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

interface LogoutDialogProps {
  onLogout: () => Promise<void>;
  onLogoutAll: () => Promise<void>;
  onCancel: () => void;
}

export const LogoutDialog = ({
  onLogout,
  onLogoutAll,
  onCancel,
}: LogoutDialogProps) => {
  const [loadingType, setLoadingType] = useState<"standard" | "all" | null>(null);

  const handleStandardLogout = async () => {
    setLoadingType("standard");
    try {
      await onLogout();
    } finally {
      setLoadingType(null);
    }
  };

  const handleGlobalLogout = async () => {
    setLoadingType("all");
    try {
      await onLogoutAll();
    } finally {
      setLoadingType(null);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div>
        <div className="flex items-center gap-3 mb-2 text-error">
          <span className="material-symbols-outlined text-3xl font-bold">logout</span>
          <h3 className="text-2xl font-black text-on-surface tracking-tighter">
            Confirm Sign Out
          </h3>
        </div>
        <p className="text-sm text-on-surface-variant leading-relaxed max-w-[90%]">
          Choose your sign-out preference. Global sign-out will invalidate sessions across all your active institutional devices.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {/* Standard Logout Option */}
        <button
          onClick={handleStandardLogout}
          disabled={!!loadingType}
          className={cn(
            "group flex items-start gap-4 p-4 rounded-2xl border-2 transition-all text-left",
            loadingType === "standard" 
              ? "border-primary bg-primary/5 cursor-wait"
              : "border-outline-variant/30 hover:border-primary hover:bg-primary/5 active:scale-[0.98]"
          )}
        >
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0 group-hover:scale-110 transition-transform">
            <span className="material-symbols-outlined">devices</span>
          </div>
          <div className="flex-1">
            <p className="font-bold text-on-surface tracking-tight group-hover:text-primary transition-colors">Sign Out (Current Device)</p>
            <p className="text-xs text-on-surface-variant/70 mt-1">Safely exit the session on this computer only.</p>
          </div>
          {loadingType === "standard" && <span className="material-symbols-outlined animate-spin text-primary">sync</span>}
        </button>

        {/* Global Logout Option */}
        <button
          onClick={handleGlobalLogout}
          disabled={!!loadingType}
          className={cn(
            "group flex items-start gap-4 p-4 rounded-2xl border-2 transition-all text-left",
            loadingType === "all"
              ? "border-error bg-error/5 cursor-wait"
              : "border-outline-variant/30 hover:border-error hover:bg-error/5 active:scale-[0.98]"
          )}
        >
          <div className="w-10 h-10 rounded-full bg-error/10 flex items-center justify-center text-error shrink-0 group-hover:block transition-transform">
            <span className="material-symbols-outlined group-hover:scale-110">public</span>
          </div>
          <div className="flex-1">
            <p className="font-bold text-on-surface tracking-tight group-hover:text-error transition-colors">Sign Out All Devices</p>
            <p className="text-xs text-on-surface-variant/70 mt-1">Terminate all active institutional sessions globally.</p>
          </div>
          {loadingType === "all" && <span className="material-symbols-outlined animate-spin text-error">sync</span>}
        </button>
      </div>

      <div className="pt-2 border-t border-outline-variant/20">
        <Button 
          variant="secondary" 
          onClick={onCancel}
          disabled={!!loadingType}
          className="w-full h-12 border-2 border-outline-variant bg-transparent font-bold hover:bg-surface-container-high transition-all"
        >
          Cancel
        </Button>
      </div>
    </div>
  );
};
