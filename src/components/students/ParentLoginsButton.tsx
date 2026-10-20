"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { FormAlert } from "@/components/forms";
import { studentsApi } from "@/lib/api/students";
import { errorMessage } from "@/lib/api/client";

type Created = { for: string; username: string; temporaryPassword: string; emailed: boolean };

/** Logins for every family's main contact that has none (in batches), and the list to hand out. */
export function ParentLoginsButton() {
  const config = useQuery({ queryKey: ["student-form-config"], queryFn: studentsApi.formConfig });
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState<Created[]>([]);
  const [skipped, setSkipped] = useState<{ for: string; reason: string }[]>([]);
  const [error, setError] = useState<string | null>(null);
  if (!config.data || config.data.parentLogin === "off") return null;

  const run = async () => {
    setBusy(true);
    setError(null);
    const all: Created[] = [];
    const skip = new Map<string, string>();
    try {
      for (let round = 0; round < 50; round++) {
        const r = await studentsApi.parentLoginsBatch();
        all.push(...r.created);
        for (const s of r.skipped) skip.set(s.for, s.reason);
        setCreated([...all]);
        if (!r.created.length || r.remaining <= 0) break;
      }
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSkipped(Array.from(skip.entries()).map(([f, reason]) => ({ for: f, reason })));
      setBusy(false);
    }
  };

  const download = () => {
    const rows = [["Parent", "Username", "One-time password", "Emailed"], ...created.map((c) => [c.for, c.username, c.temporaryPassword, c.emailed ? "yes" : "no"])];
    const csv = rows.map((r) => r.map((v) => `"${v.replace(/"/g, '""')}"`).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `parent-logins-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>
        Parent logins
      </Button>
      {open && (
        <Modal isOpen onClose={() => !busy && setOpen(false)} title="Parent logins" width="max-w-2xl">
          <div className="space-y-4">
            <p className="text-sm text-on-surface-variant">
              Creates a login for the main contact (parent) of every family that has none yet, so parents can see their children and pay fees online. The username is the parent&apos;s mobile; a one-time password is shown here (and emailed, when the parent has an email).
            </p>
            {error && <FormAlert>{error}</FormAlert>}
            {!created.length && !busy && (
              <div className="flex justify-end">
                <Button onClick={run}>Create parent logins</Button>
              </div>
            )}
            {busy && <FormAlert tone="info">Creating… {created.length} so far. Keep this window open.</FormAlert>}
            {created.length > 0 && (
              <>
                <FormAlert tone="warning">The one-time passwords are shown only now. Download the list and hand them out (or print it).</FormAlert>
                <div className="max-h-72 overflow-y-auto rounded-xl border border-outline-variant/20">
                  <table className="w-full text-sm">
                    <tbody>
                      {created.map((c) => (
                        <tr key={c.username} className="border-t border-outline-variant/10">
                          <td className="px-3 py-1.5">{c.for}</td>
                          <td className="px-3 py-1.5 font-mono">{c.username}</td>
                          <td className="px-3 py-1.5 font-mono">{c.temporaryPassword}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {!busy && (
                  <div className="flex justify-end">
                    <Button onClick={download}>Download list ({created.length})</Button>
                  </div>
                )}
              </>
            )}
            {!busy && skipped.length > 0 && (
              <p className="text-xs text-on-surface-variant">
                Skipped {skipped.length}: {skipped.slice(0, 8).map((s) => `${s.for} (${s.reason})`).join(", ")}
                {skipped.length > 8 ? "…" : ""}. Add or correct their mobile on the student&apos;s page.
              </p>
            )}
            {!busy && !error && created.length === 0 && skipped.length > 0 && <FormAlert tone="info">No new logins were needed.</FormAlert>}
          </div>
        </Modal>
      )}
    </>
  );
}
