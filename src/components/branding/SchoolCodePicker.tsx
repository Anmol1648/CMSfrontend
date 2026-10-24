"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { FormAlert } from "@/components/forms";
import { api, errorMessage, SCHOOL_CODE_KEY, savedSchoolCode } from "@/lib/api/client";

const BRANDING_KEY = "school-branding";

/** Chooses the school on a shared address: the code is checked, then kept in this browser. */
export function SchoolCodePicker() {
  const qc = useQueryClient();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError(null);
        try {
          const r = await api.get<{ found: boolean; name: string | null }>("/platform-info/school", { params: { code: code.trim().toLowerCase() } });
          if (!r.found) {
            setError("No school with that code. Check it with your school office.");
            return;
          }
          try {
            localStorage.setItem(SCHOOL_CODE_KEY, code.trim().toLowerCase());
            localStorage.removeItem(BRANDING_KEY);
          } catch {
            /* private window: the code lasts until the page is closed */
          }
          await qc.invalidateQueries({ queryKey: ["public-school"] });
        } catch (err) {
          setError(errorMessage(err));
        } finally {
          setBusy(false);
        }
      }}
    >
      <div>
        <h2 className="text-2xl font-extrabold">Find your school</h2>
        <p className="mt-1 text-sm text-on-surface-variant">Enter the school code your school gave you. It is remembered on this device.</p>
      </div>
      {error && <FormAlert>{error}</FormAlert>}
      <Input label="School code" value={code} onChange={(e) => setCode(e.target.value.replace(/[^A-Za-z0-9-]/g, ""))} autoFocus placeholder="e.g. dps" />
      <Button type="submit" loading={busy} disabled={code.trim().length < 2} className="w-full">
        Continue
      </Button>
    </form>
  );
}

/** "Not your school?" on a shared address: forget the code and choose again. */
export function ChangeSchoolLink() {
  const qc = useQueryClient();
  if (!savedSchoolCode()) return null;
  return (
    <button
      type="button"
      className="text-xs font-semibold text-primary hover:underline"
      onClick={() => {
        try {
          localStorage.removeItem(SCHOOL_CODE_KEY);
          localStorage.removeItem(BRANDING_KEY);
        } catch {
          /* nothing to forget */
        }
        void qc.invalidateQueries({ queryKey: ["public-school"] });
      }}
    >
      Not your school? Change school
    </button>
  );
}
