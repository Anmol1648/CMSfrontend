"use client";

import React from "react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { ModalComponent } from "../ModalProvider";

interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel?: () => void;
  variant?: "primary" | "danger";
}

export const ConfirmDialog: ModalComponent<ConfirmDialogProps> = ({
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
  variant = "primary",
  close,
}) => {
  const handleConfirm = () => {
    onConfirm();
    close();
  };

  const handleCancel = () => {
    if (onCancel) onCancel();
    close();
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-bold text-on-surface tracking-tight mb-2">
          {title}
        </h3>
        <p className="text-sm text-on-surface-variant leading-relaxed">
          {message}
        </p>
      </div>

      <div className="flex gap-3 pt-2">
        <Button 
          variant="secondary" 
          onClick={handleCancel}
          className="flex-1 h-11 border-2 border-outline-variant bg-transparent font-bold"
        >
          {cancelLabel}
        </Button>
        <Button 
          onClick={handleConfirm}
          className={cn(
            "flex-1 h-11 font-bold text-white shadow-premium",
            variant === "danger" ? "bg-error hover:bg-error/90" : "bg-primary"
          )}
        >
          {confirmLabel}
        </Button>
      </div>
    </div>
  );
};

