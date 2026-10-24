"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { FormAlert } from "@/components/forms";

/** The camera with a passport frame (3 : 4); the shot is cropped to the frame (600 × 800 JPEG). */
export function PassportCamera({ title, onShot, onClose, busy }: { title: string; onShot: (file: File) => void; onClose: () => void; busy?: boolean }) {
  const [video, setVideo] = useState<HTMLVideoElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [facing, setFacing] = useState<"user" | "environment">("environment");
  useEffect(() => {
    if (!video) return;
    let stream: MediaStream | null = null;
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: { ideal: facing }, width: { ideal: 1280 }, height: { ideal: 960 } } });
        if (cancelled) return stream.getTracks().forEach((t) => t.stop());
        video.srcObject = stream;
        await video.play().catch(() => undefined);
        setError(null);
      } catch (err) {
        const name = (err as { name?: string }).name;
        setError(name === "NotAllowedError" ? "The camera is blocked: allow it for this site, then try again." : name === "NotReadableError" ? "Another app is using the camera." : "The camera couldn’t be started. Choose a photo file instead.");
      }
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
      stream?.getTracks().forEach((t) => t.stop());
      video.srcObject = null;
    };
  }, [video, facing]);
  const shoot = () => {
    if (!video || !video.videoWidth) return;
    const vw = video.videoWidth;
    const vh = video.videoHeight;
    // The frame: 3 : 4, 80% of the visible height, centred.
    const ch = vh * 0.8;
    const cw = (ch * 3) / 4;
    const canvas = document.createElement("canvas");
    canvas.width = 600;
    canvas.height = 800;
    canvas.getContext("2d")!.drawImage(video, (vw - cw) / 2, (vh - ch) / 2, cw, ch, 0, 0, 600, 800);
    canvas.toBlob((b) => b && onShot(new File([b], "photo.jpg", { type: "image/jpeg" })), "image/jpeg", 0.88);
  };
  return (
    <Modal isOpen onClose={onClose} title={title} width="max-w-lg">
      <div className="space-y-3">
        {error ? (
          <FormAlert>{error}</FormAlert>
        ) : (
          <div className="relative">
            <video ref={setVideo} className="w-full aspect-[4/3] rounded-2xl bg-black object-cover" muted playsInline autoPlay />
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="h-[80%] aspect-[3/4] rounded-[40%/30%] border-4 border-white/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
            </div>
          </div>
        )}
        <p className="text-xs text-on-surface-variant">Face in the frame, plain background, good light. The photo is cut to the frame.</p>
        <div className="flex justify-between gap-3">
          <Button variant="secondary" onClick={() => setFacing((f) => (f === "user" ? "environment" : "user"))}>
            Switch camera
          </Button>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={onClose}>
              Close
            </Button>
            <Button onClick={shoot} disabled={!!error || busy} loading={busy}>
              Take photo
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
