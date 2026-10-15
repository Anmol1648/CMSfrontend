"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { FormAlert } from "@/components/forms";

/** Shows sign-in details once (new account or password reset). The password can't be seen again later. */
export function OneTimePasswordDialog({
  open,
  onClose,
  title,
  name,
  username,
  password,
  emailed,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  name: string;
  username: string;
  password: string;
  emailed?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const text = `Username: ${username}\nOne-time password: ${password}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <Modal isOpen={open} onClose={onClose} title={title} width="max-w-lg">
      <div className="space-y-5">
        <p className="text-sm text-on-surface-variant">Give these to {name}. They will be asked to choose their own password when they sign in.</p>
        <div className="bg-surface-container-low rounded-2xl p-5 space-y-3 font-mono">
          <div className="flex justify-between gap-4">
            <span className="text-xs uppercase tracking-widest text-on-surface-variant/60 font-sans font-bold">Username</span>
            <span className="text-primary font-bold">{username}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-xs uppercase tracking-widest text-on-surface-variant/60 font-sans font-bold">One-time password</span>
            <span className="text-primary font-bold text-lg tracking-wider">{password}</span>
          </div>
        </div>
        {emailed && <FormAlert tone="success">These details were also emailed to them.</FormAlert>}
        <FormAlert tone="warning">This password is shown only now. If it is lost, reset it again.</FormAlert>
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={copy}>
            {copied ? "Copied" : "Copy"}
          </Button>
          <Button onClick={onClose}>Done</Button>
        </div>
      </div>
    </Modal>
  );
}
