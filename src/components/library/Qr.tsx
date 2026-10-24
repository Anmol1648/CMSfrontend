"use client";

/* eslint-disable @next/next/no-img-element */
import { useEffect, useState } from "react";
import QRCode from "qrcode";

/** A QR code of some text (cameras and phones read it far more easily than a barcode). */
export function Qr({ text, size, className }: { text: string; size: number; className?: string }) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    QRCode.toDataURL(text, { margin: 0, width: size * 4, errorCorrectionLevel: "M" })
      .then(setSrc)
      .catch(() => setSrc(null));
  }, [text, size]);
  return src ? <img src={src} alt={text} width={size} height={size} className={className} /> : <span style={{ width: size, height: size }} className={className} />;
}
