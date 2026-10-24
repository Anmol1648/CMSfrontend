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
  // The <video> element, once it is on the screen (the camera starts only then).
  const [video, setVideo] = useState<HTMLVideoElement | null>(null);
  const done = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [live, setLive] = useState(false);
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [camera, setCamera] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!video) return;
    let controls: IScannerControls | null = null;
    let stream: MediaStream | null = null;
    let cancelled = false;
    done.current = false;
    setError(null);
    setLive(false);
    const release = () => {
      controls?.stop();
      stream?.getTracks().forEach((t) => t.stop());
      video.srcObject = null;
    };
    // A short wait: opening the camera twice at once (React starts effects twice in development)
    // leaves many webcams black.
    const timer = setTimeout(async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError("This browser can’t use the camera here. Open the site on https (or localhost), or type the code.");
        return;
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: camera ? { deviceId: { exact: camera } } : { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } } });
        if (cancelled) return release();
        video.srcObject = stream;
        video.muted = true;
        await video.play().catch(() => undefined);
        const { BrowserMultiFormatReader } = await import("@zxing/browser");
        if (cancelled) return release();
        controls = await new BrowserMultiFormatReader().decodeFromStream(stream, video, (result) => {
          if (!result || done.current) return;
          done.current = true;
          navigator.vibrate?.(80);
          release();
          onScan(result.getText().trim());
        });
        if (cancelled) return release();
        if (!cameras.length) setCameras((await navigator.mediaDevices.enumerateDevices()).filter((d) => d.kind === "videoinput"));
      } catch (err) {
        const name = (err as { name?: string }).name;
        setError(
          name === "NotAllowedError"
            ? "The camera is blocked: allow it for this site (the camera icon in the address bar), then try again."
            : name === "NotFoundError" || name === "OverconstrainedError"
              ? "No camera found on this device."
              : name === "NotReadableError"
                ? "The camera is being used by another app (Zoom, Teams, the Camera app…). Close it and try again."
                : "The camera couldn’t be started. Type the code instead."
        );
      }
    }, 250);
    // No picture after a while: say so instead of a black box.
    const watchdog = setTimeout(() => {
      if (!cancelled && !done.current && video.videoWidth === 0) setError("No picture from the camera. Close other apps using it, choose another camera below, or type the code.");
    }, 9000);
    const onPlaying = () => setLive(video.videoWidth > 0);
    video.addEventListener("playing", onPlaying);
    video.addEventListener("loadeddata", onPlaying);
    return () => {
      cancelled = true;
      clearTimeout(timer);
      clearTimeout(watchdog);
      video.removeEventListener("playing", onPlaying);
      video.removeEventListener("loadeddata", onPlaying);
      release();
    };
    // Starts again only for another camera (or when the video element appears).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [video, camera]);

  return (
    <Modal isOpen onClose={onClose} title="Scan with the camera" width="max-w-lg">
      <div className="space-y-3">
        {error && <FormAlert>{error}</FormAlert>}
        <div className={error ? "hidden" : "relative rounded-2xl overflow-hidden bg-black"}>
          <video ref={setVideo} className="w-full aspect-[4/3] object-cover" muted playsInline autoPlay />
          <div className="pointer-events-none absolute inset-x-8 top-1/2 -translate-y-1/2 h-24 border-2 border-white/80 rounded-xl" />
          {!live && <p className="absolute inset-0 flex items-center justify-center text-sm text-white/80">Starting the camera… (allow it if the browser asks)</p>}
        </div>
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
