"use client";

import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { FormAlert } from "@/components/forms";
import { logoSrc, schoolApi, SchoolProfile } from "@/lib/api/school";
import { errorMessage } from "@/lib/api/client";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useToast } from "@/components/ui/ToastProvider";

/** The school's logo: shown in the sidebar, on the sign-in page and (later) on reports and ID cards. */
export function SchoolLogoCard({ profile, canEdit }: { profile: SchoolProfile; canEdit: boolean }) {
  const queryClient = useQueryClient();
  const { reloadMe } = useAuth();
  const { showToast } = useToast();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const src = profile.logoFileId ? logoSrc(`public/school/logo?school=${profile.tenant.code}&v=${profile.logoFileId}`) : null;

  const run = async (fn: () => Promise<SchoolProfile>, message: string) => {
    setBusy(true);
    setError(null);
    try {
      queryClient.setQueryData(["school-profile"], await fn());
      await queryClient.invalidateQueries({ queryKey: ["public-school"] });
      await reloadMe();
      showToast(message, "success");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  };

  return (
    <Card className="flex flex-col md:flex-row md:items-center gap-6">
      <div className="w-28 h-28 rounded-2xl bg-surface-container-low flex items-center justify-center overflow-hidden shrink-0 border border-outline-variant/20">
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt="School logo" className="max-w-full max-h-full object-contain" />
        ) : (
          <span className="material-symbols-outlined text-4xl text-on-surface-variant/40">school</span>
        )}
      </div>
      <div className="flex-1 space-y-2">
        <h2 className="text-lg font-bold text-primary">Logo</h2>
        <p className="text-sm text-on-surface-variant/70">PNG, JPG or WebP. A square image of at least 256 × 256 pixels looks best.</p>
        {error && <FormAlert>{error}</FormAlert>}
        {canEdit && (
          <div className="flex gap-3 pt-1">
            <input
              ref={input}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) run(() => schoolApi.uploadLogo(f), "Logo saved");
              }}
            />
            <Button type="button" variant="secondary" disabled={busy} onClick={() => input.current?.click()}>
              {busy ? "Uploading…" : src ? "Replace logo" : "Upload logo"}
            </Button>
            {src && (
              <Button type="button" variant="secondary" className="text-error" disabled={busy} onClick={() => run(schoolApi.removeLogo, "Logo removed")}>
                Remove
              </Button>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
