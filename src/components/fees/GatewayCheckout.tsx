"use client";

import { useEffect, useRef, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { FormAlert } from "@/components/forms";
import { Checkout, PaymentResult, paymentsApi, rupees } from "@/lib/api/fees";
import { errorMessage } from "@/lib/api/client";

/**
 * Takes the payer through the gateway: Razorpay's own window (card / UPI / net banking details never
 * reach the ERP), or the ERP's test gateway. The payment counts only when the server has checked it.
 */

interface RazorpayResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}
interface RazorpayInstance {
  open: () => void;
  on: (event: "payment.failed", cb: (r: { error?: { description?: string } }) => void) => void;
}
declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => RazorpayInstance;
  }
}

const loadRazorpay = () =>
  new Promise<void>((resolve, reject) => {
    if (window.Razorpay) return resolve();
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Could not load the payment window. Check your internet connection."));
    document.body.appendChild(s);
  });

export function GatewayCheckout({
  checkout,
  schoolName,
  anonymous = false,
  onDone,
  onClose,
}: {
  checkout: Checkout;
  schoolName: string;
  /** Paid without a login (the website form). */
  anonymous?: boolean;
  onDone: (r: PaymentResult) => void;
  onClose: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const opened = useRef(false);

  useEffect(() => {
    if (checkout.provider !== "razorpay" || opened.current) return;
    opened.current = true;
    loadRazorpay()
      .then(() => {
        const rz = new window.Razorpay!({
          key: checkout.keyId,
          amount: checkout.amountPaise,
          currency: checkout.currency,
          order_id: checkout.orderId,
          name: schoolName,
          description: checkout.description,
          prefill: checkout.prefill,
          handler: async (r: RazorpayResponse) => {
            try {
              onDone(await paymentsApi.confirm(checkout.paymentId, { paymentRef: r.razorpay_payment_id, signature: r.razorpay_signature }, anonymous));
            } catch (err) {
              setError(errorMessage(err));
            }
          },
          modal: { ondismiss: () => onClose() },
        });
        rz.on("payment.failed", (r) => {
          paymentsApi.failed(checkout.paymentId, r.error?.description, anonymous).catch(() => undefined);
        });
        rz.open();
      })
      .catch((err: Error) => setError(err.message));
  }, [checkout, schoolName, anonymous, onDone, onClose]);

  if (checkout.provider === "razorpay") {
    return error ? (
      <Modal isOpen onClose={onClose} title="Payment">
        <FormAlert>{error}</FormAlert>
      </Modal>
    ) : null;
  }

  // The test gateway: no real money moves.
  const finish = async (outcome: "paid" | "failed") => {
    setBusy(true);
    setError(null);
    try {
      onDone(await paymentsApi.mock(checkout.paymentId, outcome, anonymous));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal isOpen onClose={onClose} title="Test payment gateway" width="max-w-md">
      <div className="space-y-4">
        <FormAlert tone="warning">This is the ERP&apos;s test gateway for trying the flow. No real money is taken. Set up Razorpay in Fees → Online Payments to take real payments.</FormAlert>
        <div className="rounded-xl bg-surface-container-low p-4 text-center">
          <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant/60">{checkout.description}</p>
          <p className="text-3xl font-black text-primary mt-2">{rupees(checkout.amount)}</p>
          <p className="text-[11px] font-mono text-on-surface-variant/60 mt-1">{checkout.orderId}</p>
        </div>
        {error && <FormAlert>{error}</FormAlert>}
        <div className="flex justify-end gap-3">
          <Button variant="secondary" disabled={busy} onClick={() => finish("failed")}>
            Decline (test a failure)
          </Button>
          <Button disabled={busy} onClick={() => finish("paid")}>
            {busy ? "Paying…" : `Pay ${rupees(checkout.amount)}`}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
