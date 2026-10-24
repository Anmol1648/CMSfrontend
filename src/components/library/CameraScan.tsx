"use client";

import { useEffect, useRef, useState } from "react";
import type { IScannerControls } from "@zxing/browser";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { FormAlert } from "@/components/forms";

/**
 * Reads a barcode or QR code with the camera (phone, or a laptop's webcam). The browser asks for
 * the camera; it works on https (or localhost). A USB / Bluetooth scanner needs none of this: it
 * types the code into the box and presses Enter.
 */
function Reader({ onScan, onClose }: { onScan: (code: string) => void; onClose: () => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const done = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [camera, setCamera] = useState<string | undefined>(undefined);

  useEffect(() => {
    let controls: IScannerControls | null = null;
    let stopped = false;
    done.current = false;
    (async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError("This browser can’t use the camera here. Open the site on https (or localhost), or type the code.");
        return;
      }
      try {
        const { BrowserMultiFormatReader } = await import("@zxing/browser");
        const reader = new BrowserMultiFormatReader();
        const constraints: MediaStreamConstraints = { video: camera ? { deviceId: { exact: camera } } : { facingMode: { ideal: "environment" } } };
        controls = await reader.decodeFromConstraints(constraints, video.current!, (result) => {
          if (!result || done.current) return;
          done.current = true;
          navigator.vibrate?.(80);
          controls?.stop();
          onScan(result.getText().trim());
        });
        if (stopped) controls.stop();
        if (!cameras.length) setCameras((await navigator.mediaDevices.enumerateDevices()).filter((d) => d.kind === "videoinput"));
      } catch (err) {
        const name = (err as { name?: string }).name;
        setError(name === "NotAllowedError" ? "The camera is blocked: allow it for this site in the browser, then try again." : name === "NotFoundError" ? "No camera found on this device." : "The camera couldn’t be started. Type the code instead.");
      }
    })();
    return () => {
      stopped = true;
      controls?.stop();
    };
    // Starting again only when another camera is chosen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [camera]);

  return (
    <Modal isOpen onClose={onClose} title="Scan with the camera" width="max-w-lg">
      <div className="space-y-3">
        {error ? (
          <FormAlert>{error}</FormAlert>
        ) : (
          <div className="relative rounded-2xl overflow-hidden bg-black">
            <video ref={video} className="w-full aspect-[4/3] object-cover" muted playsInline />
            <div className="pointer-events-none absolute inset-x-8 top-1/2 -translate-y-1/2 h-24 border-2 border-white/80 rounded-xl" />
          </div>
        )}
        <p className="text-xs text-on-surface-variant/70">Hold the barcode inside the box, about a hand away from the camera, in good light.</p>
        <div className="flex items-center justify-between gap-3">
          {cameras.length > 1 ? (
            <select value={camera ?? ""} onChange={(e) => setCamera(e.target.value || undefined)} className="rounded-xl bg-surface-container-low px-3 py-2 text-sm" aria-label="Camera">
              <option value="">Back camera</option>
              {cameras.map((c, i) => (
                <option key={c.deviceId} value={c.deviceId}>
                  {c.label || `Camera ${i + 1}`}
                </option>
              ))}
            </select>
          ) : (
            <span />
          )}
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </div>
    </Modal>
  );
}

/** A camera button next to a scan box; gives the code read. */
export function CameraScan({ onScan, label = "Scan with camera" }: { onScan: (code: string) => void; label?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} title={label} aria-label={label} className="shrink-0 inline-flex items-center gap-1.5 rounded-xl bg-primary/10 px-3 py-3 text-sm font-bold text-primary hover:bg-primary/20">
        <span className="material-symbols-outlined text-xl">photo_camera</span>
        <span className="hidden sm:inline">Camera</span>
      </button>
      {open && (
        <Reader
          onClose={() => setOpen(false)}
          onScan={(code) => {
            setOpen(false);
            onScan(code);
          }}
        />
      )}
    </>
  );
}
