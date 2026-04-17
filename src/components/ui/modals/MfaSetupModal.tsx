"use client";

import React from "react";
import { QRCodeCanvas } from "qrcode.react";
import { Input } from "../Input";
import { Button } from "../Button";

interface MfaSetupModalProps {
  close: () => void;
  qrCode: string;
  onVerify: (code: string) => Promise<void>;
  isVerifying: boolean;
}

export const MfaSetupModal = ({
  close,
  qrCode,
  onVerify,
  isVerifying,
}: MfaSetupModalProps) => {
  const [code, setCode] = React.useState("");

  const handleVerify = () => {
    if (code.length === 6) {
      onVerify(code);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-primary/20">
          <span className="material-symbols-outlined text-primary text-3xl">qr_code_2</span>
        </div>
        <p className="text-on-surface-variant/80 text-sm font-semibold">
          Enable Two-Factor Authentication
        </p>
        <p className="text-on-surface-variant/50 text-[11px] leading-relaxed mt-1 max-w-[200px] mx-auto">
          Secure your account using Google Authenticator or Authy.
        </p>
      </div>

      <div className="bg-white p-5 rounded-[32px] flex justify-center items-center shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-outline-variant/10 mx-auto w-fit">
        <QRCodeCanvas value={qrCode} size={160} />
      </div>

      <div className="space-y-5">
        <div className="space-y-1">
          <Input
            label="Verification Code"
            placeholder="000 000"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            className="text-center text-xl tracking-[0.4em] font-black h-14"
            autoFocus
          />
        </div>

        <div className="flex gap-3">
          <button
            onClick={close}
            className="flex-1 h-11 rounded-xl font-bold text-[11px] text-on-surface-variant/40 hover:bg-surface-container-high transition-all"
          >
            Cancel
          </button>
          <Button
            onClick={handleVerify}
            disabled={code.length !== 6 || isVerifying}
            className="flex-[2] h-11 gradient-primary text-white font-bold text-[11px] rounded-xl shadow-[0_8px_20px_rgba(var(--primary-rgb),0.2)]"
          >
            {isVerifying ? 'Verifying...' : 'Verify & Enable'}
          </Button>
        </div>
      </div>
    </div>

  );
};
