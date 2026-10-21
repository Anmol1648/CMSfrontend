"use client";

import React, { createContext, useCallback, useContext, useRef, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";

/**
 * The app's own "Are you sure?" box (never the browser's confirm, which breaks the look):
 *   const confirm = useConfirm();
 *   if (!(await confirm({ title: "Delete it?", message: "…", confirmLabel: "Delete", danger: true }))) return;
 */

export interface ConfirmOptions {
  title: string;
  message?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Red confirm button, for deleting / cancelling / anything that can't be undone. */
  danger?: boolean;
}

type Ask = (options: ConfirmOptions | string) => Promise<boolean>;
const ConfirmContext = createContext<Ask | null>(null);

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<((ok: boolean) => void) | null>(null);

  const ask = useCallback<Ask>((options) => {
    resolver.current?.(false);
    setOpen(typeof options === "string" ? { title: options } : options);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const answer = (ok: boolean) => {
    resolver.current?.(ok);
    resolver.current = null;
    setOpen(null);
  };

  return (
    <ConfirmContext.Provider value={ask}>
      {children}
      {open && (
        <Modal isOpen onClose={() => answer(false)} title={open.title} width="max-w-md">
          <div className="space-y-6">
            {open.message && <div className="text-sm text-on-surface-variant leading-relaxed">{open.message}</div>}
            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={() => answer(false)}>
                {open.cancelLabel ?? "Cancel"}
              </Button>
              <Button autoFocus onClick={() => answer(true)} className={open.danger ? "!bg-none bg-error hover:opacity-90" : undefined}>
                {open.confirmLabel ?? "OK"}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </ConfirmContext.Provider>
  );
}

export const useConfirm = () => {
  const ask = useContext(ConfirmContext);
  if (!ask) throw new Error("useConfirm needs <ConfirmProvider> (app/layout.tsx)");
  return ask;
};
