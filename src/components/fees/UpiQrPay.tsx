"use client";

import { useEffect, useRef, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { FormAlert } from "@/components/forms";
import { PaymentResult, paymentsApi, rupees } from "@/lib/api/fees";
import { errorMessage } from "@/lib/api/client";

/**
 * A UPI QR code for exactly the amount. The parent scans it with any UPI app (GPay, PhonePe, Paytm,
 * BHIM, a bank app); this window asks every few seconds whether it was paid and closes itself
 * with the receipt as soon as it is. Closing the window before paying stops the QR code.
 */
export function UpiQrPay({ payment, title, onPaid, onClose }: { payment: PaymentResult; title: string; onPaid: (r: PaymentResult) => void; onClose: () => void }) {
  const [p, setP] = useState(payment);
  const [now, setNow] = useState(Date.now());
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const done = useRef(false);

  // Ask every 3 seconds; count the time left every second.
  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), 1000);
    const poll = setInterval(async () => {
      if (done.current) return;
      try {
        const r = await paymentsApi.pollQr(payment.id);
        setP(r);
        if (r.status !== "created") done.current = true;
        if (r.status === "paid") onPaid(r);
      } catch {
        // A missed check is fine; the next one runs in 3 seconds.
      }
    }, 3000);
    return () => {
      clearInterval(tick);
      clearInterval(poll);
    };
  }, [payment.id, onPaid]);

  const left = p.expiresAt ? Math.max(0, Math.floor((new Date(p.expiresAt).getTime() - now) / 1000)) : 0;
  const close = async () => {
    if (p.status === "created") {
      setBusy(true);
      try {
        const r = await paymentsApi.cancelQr(p.id);
        // It was paid at the last moment: show the receipt after all.
        if (r.status === "paid") {
          onPaid(r);
          return;
        }
      } catch {
        // Closing is best effort; an unpaid QR code expires on its own.
      } finally {
        setBusy(false);
      }
    }
    onClose();
  };

  return (
    <Modal isOpen onClose={close} title={title} width="max-w-md">
      <div className="space-y-4 text-center">
        {p.mode === "live" ? (
          <p className="text-[11px] font-bold uppercase tracking-widest text-emerald-700">Live · real payment</p>
        ) : (
          <p className="text-[11px] font-bold uppercase tracking-widest text-amber-700">Test mode · no real money</p>
        )}
        {p.status === "created" && p.qrImageUrl && (
          <>
            <div className="mx-auto w-64 rounded-2xl border border-outline-variant/30 bg-white p-3 shadow-sm">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.qrImageUrl} alt="UPI QR code to pay" className="w-full h-auto" />
            </div>
            <p className="text-3xl font-black text-primary">{rupees(p.amount)}</p>
            <p className="text-sm text-on-surface-variant">Scan with any UPI app: GPay, PhonePe, Paytm, BHIM or your bank&apos;s app.</p>
            <div className="flex items-center justify-center gap-2 text-sm font-semibold text-primary">
              <span className="w-4 h-4 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
              Waiting for the payment… {left > 0 ? `${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")} left` : "checking"}
            </div>
          </>
        )}
        {p.status === "paid" && <FormAlert tone="success">Paid {rupees(p.amount)}. The receipt is ready.</FormAlert>}
        {p.status === "failed" && <FormAlert tone="warning">{p.error ?? "This QR code is closed."} Make a new one to try again.</FormAlert>}
        {error && <FormAlert>{error}</FormAlert>}
        <div className="flex justify-center gap-3 pt-1">
          {p.status === "created" && p.provider === "mock" && (
            <Button
              disabled={busy}
              onClick={async () => {
                setError(null);
                try {
                  const r = await paymentsApi.mock(p.id, "paid");
                  done.current = true;
                  setP(r);
                  if (r.status === "paid") onPaid(r);
                } catch (err) {
                  setError(errorMessage(err));
                }
              }}
            >
              Simulate the parent paying
            </Button>
          )}
          <Button variant="secondary" disabled={busy} onClick={close}>
            {p.status === "created" ? "Cancel" : "Close"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
