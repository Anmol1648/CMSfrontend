"use client";

import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { FormAlert, Pill } from "@/components/forms";
import { PageLoader } from "@/components/ui/PageLoader";
import { useToast } from "@/components/ui/ToastProvider";
import { authedImageUrl, errorMessage } from "@/lib/api/client";
import { noticesApi } from "@/lib/api/notices";
import { NoticeBody } from "./NoticeBody";

const when = (iso: string | null) => (iso ? new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" }) : "");

/** One notice, read in full (opening it marks it read); with its attachments and "I have read this". */
export function NoticeView({ id, onClose }: { id: string; onClose: () => void }) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const q = useQuery({ queryKey: ["notice", id], queryFn: () => noticesApi.open(id) });
  const n = q.data;
  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["notices-mine"] });
    queryClient.invalidateQueries({ queryKey: ["notices-unread"] });
  };
  // Opening it marked it read: the list and the number on the menu catch up.
  const loaded = q.isSuccess;
  useEffect(() => {
    if (!loaded) return;
    queryClient.invalidateQueries({ queryKey: ["notices-mine"] });
    queryClient.invalidateQueries({ queryKey: ["notices-unread"] });
  }, [loaded, queryClient]);
  const open = async (fileId: string) => {
    try {
      window.open(await authedImageUrl(noticesApi.attachmentPath(id, fileId)), "_blank", "noopener");
    } catch (err) {
      showToast(errorMessage(err), "error");
    }
  };
  const ack = async () => {
    try {
      await noticesApi.acknowledge(id);
      queryClient.invalidateQueries({ queryKey: ["notice", id] });
      refresh();
      showToast("Thank you", "success");
    } catch (err) {
      showToast(errorMessage(err), "error");
    }
  };
  return (
    <Modal isOpen onClose={onClose} title={n?.title ?? "Notice"} width="max-w-2xl">
      {q.isError && <FormAlert>{errorMessage(q.error)}</FormAlert>}
      {!n && !q.isError && <PageLoader />}
      {n && (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-2 text-xs text-on-surface-variant/70">
            {n.important && <Pill tone="danger">Important</Pill>}
            {n.category && <Pill tone="primary">{n.category}</Pill>}
            <span>{when(n.publishAt)}</span>
            {n.by && <span>· {n.by}</span>}
            <span>· for {n.audience}</span>
          </div>
          <NoticeBody text={n.body} />
          {n.attachments.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/60">Attachments</p>
              {n.attachments.map((f) => (
                <button key={f.id} type="button" onClick={() => open(f.id)} className="flex w-full items-center gap-3 rounded-xl bg-surface-container-low px-4 py-3 text-left text-sm hover:bg-surface-container">
                  <span className="material-symbols-outlined text-primary">{f.type === "application/pdf" ? "picture_as_pdf" : "image"}</span>
                  <span className="truncate font-semibold">{f.name}</span>
                </button>
              ))}
            </div>
          )}
          {n.expiresOn && <p className="text-[11px] text-on-surface-variant/60">On the board until {new Date(`${n.expiresOn}T00:00:00Z`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" })}.</p>}
          {n.needsAck && n.meantForMe && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-primary/5 p-4">
              {n.acknowledgedAt ? (
                <span className="text-sm font-semibold text-emerald-700">You confirmed you have read this · {when(n.acknowledgedAt)}</span>
              ) : (
                <>
                  <span className="text-sm">Please confirm you have read this notice.</span>
                  <Button onClick={ack}>I have read this</Button>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
