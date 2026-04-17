"use client";

import React, { useState } from "react";
import { Input } from "../Input";
import { Button } from "../Button";

interface MfaDisableModalProps {
  close: () => void;
  onConfirm: (password: string, token: string) => Promise<void>;
  isDisabling: boolean;
}

export const MfaDisableModal = ({
  close,
  onConfirm,
  isDisabling,
}: MfaDisableModalProps) => {
  const [password, setPassword] = useState("");
  const [token, setToken] = useState("");

  const handleConfirm = () => {
    if (password && token.length === 6) {
      onConfirm(password, token);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="w-16 h-16 bg-error/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-error/20">
          <span className="material-symbols-outlined text-error text-3xl">shield_person_off</span>
        </div>
        <p className="text-on-surface-variant/80 text-sm font-semibold">
          Disable Multi-Factor Authentication
        </p>
        <p className="text-on-surface-variant/50 text-[11px] leading-relaxed mt-1 max-w-[240px] mx-auto">
          To disable MFA, please confirm your identity by entering your current password and a code from your authenticator app.
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-4">
          <Input
            label="Current Password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="h-11"
            autoFocus
          />
          
          <div className="space-y-1">
            <Input
              label="Verification Code"
              placeholder="000 000"
              maxLength={6}
              value={token}
              onChange={(e) => setToken(e.target.value.replace(/\D/g, ''))}
              className="text-center text-xl tracking-[0.4em] font-black h-14"
            />
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            onClick={close}
            disabled={isDisabling}
            className="flex-1 h-11 rounded-xl font-bold text-[11px] text-on-surface-variant/40 hover:bg-surface-container-high transition-all"
          >
            Cancel
          </button>
          <Button
            onClick={handleConfirm}
            disabled={!password || token.length !== 6 || isDisabling}
            className="flex-[2] h-11 bg-error text-white font-bold text-[11px] rounded-xl shadow-[0_8px_20px_rgba(var(--error-rgb,255,82,82),0.2)]"
          >
            {isDisabling ? 'Disabling...' : 'Disable MFA'}
          </Button>
        </div>
      </div>
    </div>
  );
};
