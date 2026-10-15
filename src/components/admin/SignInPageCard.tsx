"use client";

import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { FormAlert, Select } from "@/components/forms";
import { LoginBrandPreview } from "@/components/branding/LoginBrandPanel";
import { LoginFocus, logoSrc, schoolApi, SchoolProfile } from "@/lib/api/school";
import { errorMessage } from "@/lib/api/client";
import { resizeImage } from "@/lib/images";
import { useToast } from "@/components/ui/ToastProvider";

const FOCUS_OPTIONS: { value: LoginFocus; label: string }[] = [
  { value: "center", label: "Middle of the photo" },
  { value: "top", label: "Top of the photo" },
  { value: "bottom", label: "Bottom of the photo" },
  { value: "left", label: "Left side of the photo" },
  { value: "right", label: "Right side of the photo" },
];

/**
 * School Profile → Sign-in page: background photo (uploaded at once), and focus, darkening and quote
 * (saved with the profile's Save button). The preview shows unsaved changes too.
 */
export function SignInPageCard({
  profile,
  canEdit,
  values,
  set,
  errors,
  disabled,
  name,
}: {
  profile: SchoolProfile;
  canEdit: boolean;
  values: { loginBackgroundFocus: string; loginOverlay: string; loginQuote: string; loginQuoteAuthor: string };
  set: (key: string) => (value: string) => void;
  errors: Record<string, string>;
  disabled: boolean;
  /** Name as currently typed (short name or full name), for the preview. */
  name: { short: string; legal: string };
}) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const code = profile.tenant.code;
  const background = profile.loginBackgroundFileId ? logoSrc(`public/school/login-background?school=${code}&v=${profile.loginBackgroundFileId}`) : null;
  const logo = profile.logoFileId ? logoSrc(`public/school/logo?school=${code}&v=${profile.logoFileId}`) : null;
  const overlay = Number(values.loginOverlay) || 0;

  const run = async (fn: () => Promise<SchoolProfile>, message: string) => {
    setBusy(true);
    setError(null);
    try {
      queryClient.setQueryData(["school-profile"], await fn());
      await queryClient.invalidateQueries({ queryKey: ["public-school"] });
      showToast(message, "success");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  };

  return (
    <Card className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-primary">Sign-in page</h2>
        <p className="text-sm text-on-surface-variant/70 mt-1">The left side of the sign-in page. The photo fills the panel on every screen size (cropped, never stretched).</p>
      </div>
      {error && <FormAlert>{error}</FormAlert>}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-8 items-start">
        <div className="space-y-6">
          <div className="space-y-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60">Background photo</p>
            <p className="text-xs text-on-surface-variant/70">A wide or upright photo of the campus works well (at least 1200 pixels tall). Large photos are made smaller before upload.</p>
            {canEdit && (
              <div className="flex gap-3">
                <input
                  ref={input}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) run(async () => schoolApi.uploadImage("login-background", await resizeImage(f, 1920, { quality: 0.82 })), "Background saved");
                  }}
                />
                <Button type="button" variant="secondary" disabled={busy || disabled} onClick={() => input.current?.click()}>
                  {busy ? "Uploading…" : background ? "Replace photo" : "Upload photo"}
                </Button>
                {background && (
                  <Button type="button" variant="secondary" className="text-error" disabled={busy || disabled} onClick={() => run(() => schoolApi.removeImage("login-background"), "Background removed")}>
                    Remove
                  </Button>
                )}
              </div>
            )}
          </div>

          {background && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <Select label="Keep in view when cropped" value={values.loginBackgroundFocus} onChange={set("loginBackgroundFocus")} options={FOCUS_OPTIONS} error={errors.loginBackgroundFocus} disabled={!canEdit || disabled} />
              <label className="flex flex-col gap-2">
                <span className="text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-widest ml-1">Darken the photo: {overlay}%</span>
                <input
                  type="range"
                  min={0}
                  max={90}
                  step={5}
                  value={overlay}
                  onChange={(e) => set("loginOverlay")(e.target.value)}
                  disabled={!canEdit || disabled}
                  className="w-full accent-[#1A365D] mt-3"
                />
                <span className="text-[10px] text-on-surface-variant/60 ml-1">More darkening keeps the white text readable on bright photos.</span>
              </label>
            </div>
          )}

          <div className="space-y-4">
            <label className="flex flex-col gap-2">
              <span className="text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-widest ml-1">Quote (optional)</span>
              <textarea
                value={values.loginQuote}
                onChange={(e) => set("loginQuote")(e.target.value)}
                maxLength={300}
                rows={3}
                placeholder="e.g. Tamaso ma jyotirgamaya"
                readOnly={!canEdit}
                disabled={disabled}
                className={`w-full bg-surface-container-low rounded-xl border-none outline-none py-3.5 px-4 text-sm text-primary font-bold focus:ring-2 focus:ring-primary/10 resize-none ${errors.loginQuote ? "ring-2 ring-error/50" : ""}`}
              />
              <span className="text-[10px] text-on-surface-variant/60 ml-1">{values.loginQuote.length} / 300</span>
            </label>
            <Input label="Quote by (optional)" value={values.loginQuoteAuthor} onChange={(e) => set("loginQuoteAuthor")(e.target.value)} maxLength={100} readOnly={!canEdit} disabled={disabled} error={errors.loginQuoteAuthor} />
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60">Preview</p>
          <LoginBrandPreview
            width={300}
            name={name.short.trim() || name.legal.trim()}
            legalName={name.legal.trim()}
            logoSrc={logo}
            backgroundSrc={background}
            focus={values.loginBackgroundFocus as LoginFocus}
            overlay={overlay}
            quote={values.loginQuote.trim() || null}
            quoteAuthor={values.loginQuoteAuthor.trim() || null}
          />
          <p className="text-[10px] text-on-surface-variant/60">As on a 1920 × 1080 screen. Changes show here before you save.</p>
        </div>
      </div>
    </Card>
  );
}
