"use client";

import { useRef, useState } from "react";
import { useToast } from "@/components/ui/ToastProvider";
import { authedImageUrl, errorMessage } from "@/lib/api/client";
import { homeworkApi, HwFile } from "@/lib/api/homework";

/** Files of a homework (the teacher's, or a student's), each opens in a new tab. */
export function FileLinks({ homeworkId, files }: { homeworkId: string; files: HwFile[] }) {
  const { showToast } = useToast();
  if (!files.length) return null;
  const open = async (f: HwFile) => {
    try {
      window.open(await authedImageUrl(homeworkApi.filePath(homeworkId, f.id)), "_blank", "noopener");
    } catch (err) {
      showToast(errorMessage(err), "error");
    }
  };
  return (
    <div className="flex flex-wrap gap-2">
      {files.map((f) => (
        <button key={f.id} type="button" onClick={() => open(f)} className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 text-primary text-xs font-bold px-3 py-1.5 hover:bg-primary/20">
          <span className="material-symbols-outlined text-sm">{f.type === "application/pdf" ? "picture_as_pdf" : "image"}</span>
          {f.name}
        </button>
      ))}
    </div>
  );
}

/** Choosing files to attach (uploaded at once); shows them with a remove button. */
export function FilePicker({ files, onChange, max = 10, label = "Attach a file" }: { files: { id: string; name: string }[]; onChange: (f: { id: string; name: string }[]) => void; max?: number; label?: string }) {
  const { showToast } = useToast();
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const upload = async (file: File) => {
    setBusy(true);
    try {
      onChange([...files, await homeworkApi.upload(file)]);
    } catch (err) {
      showToast(errorMessage(err), "error");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {files.map((f) => (
          <span key={f.id} className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary text-xs font-bold pl-3 pr-1 py-1">
            {f.name}
            <button type="button" onClick={() => onChange(files.filter((x) => x.id !== f.id))} aria-label="Remove" className="rounded-full p-0.5 hover:bg-primary/20">
              <span className="material-symbols-outlined text-sm">close</span>
            </button>
          </span>
        ))}
      </div>
      <input ref={ref} type="file" accept=".pdf,.png,.jpg,.jpeg" capture={undefined} className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void upload(f); e.target.value = ""; }} />
      <button type="button" disabled={busy || files.length >= max} onClick={() => ref.current?.click()} className="inline-flex items-center gap-1.5 text-sm font-bold text-primary hover:opacity-70 disabled:opacity-40">
        <span className="material-symbols-outlined text-lg">attach_file</span>
        {busy ? "Uploading…" : label}
      </button>
    </div>
  );
}
