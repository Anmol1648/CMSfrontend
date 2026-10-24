"use client";

/* eslint-disable @next/next/no-img-element */
import { useEffect, useRef, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { FormAlert } from "@/components/forms";
import { useToast } from "@/components/ui/ToastProvider";
import { authedImageUrl, errorMessage } from "@/lib/api/client";
import { visitorsApi } from "@/lib/api/visitors";

/** A photo loaded with the login (or an icon). */
export function AuthedPhoto({ path, className, icon = "person" }: { path: string | null; className?: string; icon?: string }) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    setSrc(null);
    if (!path) return;
    authedImageUrl(path)
      .then(setSrc)
      .catch(() => setSrc(null));
  }, [path]);
  if (src) return <img src={src} alt="" className={className ?? "h-14 w-14 rounded-xl object-cover"} />;
  return (
    <span className={`${className ?? "h-14 w-14"} rounded-xl bg-surface-container-high text-on-surface-variant/60 flex items-center justify-center`}>
      <span className="material-symbols-outlined">{icon}</span>
    </span>
  );
}

/** The camera, to take one photo (front camera on a laptop, back on a phone if chosen). */
function Shooter({ onShot, onClose }: { onShot: (file: File) => void; onClose: () => void }) {
  const [video, setVideo] = useState<HTMLVideoElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [facing, setFacing] = useState<"user" | "environment">("user");
  useEffect(() => {
    if (!video) return;
    let stream: MediaStream | null = null;
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: { ideal: facing }, width: { ideal: 960 }, height: { ideal: 720 } } });
        if (cancelled) return stream.getTracks().forEach((t) => t.stop());
        video.srcObject = stream;
        await video.play().catch(() => undefined);
      } catch (err) {
        const name = (err as { name?: string }).name;
        setError(name === "NotAllowedError" ? "The camera is blocked: allow it for this site, then try again." : name === "NotReadableError" ? "Another app is using the camera." : "The camera couldn’t be started. Choose a photo file instead.");
      }
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(timer);
      stream?.getTracks().forEach((t) => t.stop());
      video.srcObject = null;
    };
  }, [video, facing]);
  const shoot = () => {
    if (!video || !video.videoWidth) return;
    const canvas = document.createElement("canvas");
    const w = Math.min(800, video.videoWidth);
    canvas.width = w;
    canvas.height = Math.round((video.videoHeight / video.videoWidth) * w);
    canvas.getContext("2d")!.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((b) => b && onShot(new File([b], "photo.jpg", { type: "image/jpeg" })), "image/jpeg", 0.85);
  };
  return (
    <Modal isOpen onClose={onClose} title="Take a photo" width="max-w-lg">
      <div className="space-y-3">
        {error ? <FormAlert>{error}</FormAlert> : <video ref={setVideo} className="w-full aspect-[4/3] rounded-2xl bg-black object-cover" muted playsInline autoPlay />}
        <div className="flex justify-between gap-3">
          <Button variant="secondary" onClick={() => setFacing((f) => (f === "user" ? "environment" : "user"))}>
            Switch camera
          </Button>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={shoot} disabled={!!error}>
              Take photo
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

/** Takes (or picks) a photo and uploads it; shows it with a "retake" button. */
export function PhotoCapture({ value, onChange, preview, label = "Photo" }: { value: string | null; onChange: (fileId: string | null) => void; preview?: string | null; label?: string }) {
  const { showToast } = useToast();
  const [open, setOpen] = useState(false);
  const [local, setLocal] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const file = useRef<HTMLInputElement>(null);
  const upload = async (f: File) => {
    setBusy(true);
    try {
      const r = await visitorsApi.uploadPhoto(f);
      setLocal(URL.createObjectURL(f));
      onChange(r.id);
    } catch (err) {
      showToast(errorMessage(err), "error");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="flex items-center gap-3">
      {local && value ? <img src={local} alt="" className="h-20 w-20 rounded-xl object-cover" /> : <AuthedPhoto path={value ? (preview ?? null) : null} className="h-20 w-20 rounded-xl object-cover" />}
      <div className="flex flex-col gap-1.5">
        <span className="text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-widest">{label}</span>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setOpen(true)} disabled={busy}>
            <span className="material-symbols-outlined text-lg">photo_camera</span> {value ? "Retake" : "Take photo"}
          </Button>
          <button type="button" onClick={() => file.current?.click()} className="text-xs font-bold text-primary">
            or a file
          </button>
          {value && (
            <button type="button" onClick={() => { onChange(null); setLocal(null); }} className="text-xs font-bold text-error">
              Remove
            </button>
          )}
        </div>
      </div>
      <input ref={file} type="file" accept="image/png,image/jpeg,image/webp" capture="user" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void upload(f); e.target.value = ""; }} />
      {open && (
        <Shooter
          onClose={() => setOpen(false)}
          onShot={(f) => {
            setOpen(false);
            void upload(f);
          }}
        />
      )}
    </div>
  );
}
