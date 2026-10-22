"use client";

import { useEffect, useRef, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { FormAlert } from "@/components/forms";

/**
 * The live front camera in a window: takes one selfie (check-in) or a few (face enrolment, with a hint
 * for each). Only the live camera: no file upload. Gives JPEG data URLs.
 */
export function CameraCapture({
  title,
  shots = 1,
  hints = [],
  busyLabel = "Sending…",
  onDone,
  onClose,
}: {
  title: string;
  shots?: number;
  hints?: string[];
  busyLabel?: string;
  /** Gets the photos; may throw (the message is shown and the person can try again). */
  onDone: (photos: string[]) => Promise<void>;
  onClose: () => void;
}) {
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const [photos, setPhotos] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    let stopped = false;
    (async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError("The camera can’t be used here. Open the ERP over https (the school’s web address), and allow the camera.");
        return;
      }
      try {
        const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: { ideal: 960 }, height: { ideal: 720 } }, audio: false });
        if (stopped) return s.getTracks().forEach((t) => t.stop());
        stream.current = s;
        if (video.current) {
          video.current.srcObject = s;
          await video.current.play().catch(() => undefined);
        }
        setReady(true);
      } catch {
        setError("The camera is blocked or not available. Allow the camera for this site (the lock icon in the address bar) and try again.");
      }
    })();
    return () => {
      stopped = true;
      stream.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const snap = () => {
    const v = video.current;
    if (!v || !v.videoWidth) return;
    const scale = Math.min(1, 720 / v.videoWidth);
    const c = document.createElement("canvas");
    c.width = Math.round(v.videoWidth * scale);
    c.height = Math.round(v.videoHeight * scale);
    const ctx = c.getContext("2d")!;
    // The preview is mirrored like a mirror; the photo is the real (unmirrored) image.
    ctx.drawImage(v, 0, 0, c.width, c.height);
    const next = [...photos, c.toDataURL("image/jpeg", 0.85)];
    setPhotos(next);
    setError(null);
    if (next.length >= shots) send(next);
  };

  const send = async (all: string[]) => {
    setSending(true);
    try {
      await onDone(all);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setPhotos([]);
    } finally {
      setSending(false);
    }
  };

  const hint = hints[photos.length] ?? (shots > 1 ? `Photo ${photos.length + 1} of ${shots}` : "Look at the camera");

  return (
    <Modal isOpen onClose={onClose} title={title}>
      <div className="space-y-4">
        <div className="relative overflow-hidden rounded-2xl bg-black aspect-[4/3]">
          <video ref={video} playsInline muted className="h-full w-full object-cover -scale-x-100" />
          {!ready && !error && <p className="absolute inset-0 flex items-center justify-center text-sm text-white/80">Starting the camera…</p>}
          {ready && <div className="pointer-events-none absolute left-1/2 top-1/2 h-[70%] w-[48%] -translate-x-1/2 -translate-y-1/2 rounded-[50%] border-2 border-dashed border-white/70" />}
          {sending && <p className="absolute inset-0 flex items-center justify-center bg-black/50 text-sm font-bold text-white">{busyLabel}</p>}
        </div>
        {shots > 1 && (
          <div className="flex gap-2">
            {Array.from({ length: shots }, (_, i) =>
              photos[i] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={i} src={photos[i]} alt={`Photo ${i + 1}`} className="h-14 w-14 rounded-lg object-cover" />
              ) : (
                <div key={i} className="h-14 w-14 rounded-lg border-2 border-dashed border-outline-variant/40" />
              )
            )}
          </div>
        )}
        <p className="text-sm font-semibold text-primary">{hint}</p>
        <p className="text-xs text-on-surface-variant">Keep your face inside the oval, in good light, with nothing covering it.</p>
        {error && <FormAlert>{error}</FormAlert>}
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={snap} disabled={!ready || sending}>
            <span className="material-symbols-outlined text-lg align-middle mr-1">photo_camera</span>
            {shots > 1 ? `Take photo ${Math.min(photos.length + 1, shots)}` : "Take photo"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
