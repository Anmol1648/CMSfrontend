"use client";

import { useState } from "react";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { FormAlert, Pill } from "@/components/forms";
import { PageHeader } from "@/components/layout/AppShell";
import { PageLoader } from "@/components/ui/PageLoader";
import { useToast } from "@/components/ui/ToastProvider";
import { RequirePermission } from "@/lib/auth/RequirePermission";
import { api, authedImageUrl, errorMessage } from "@/lib/api/client";
import { DownloadItem, fileIcon, sharedApi, size } from "@/lib/api/shared";
import { cn } from "@/lib/utils";

function Downloads() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const q = useQuery({ queryKey: ["shared", "downloads", search], queryFn: () => sharedApi.downloads(search.trim() || undefined), placeholderData: keepPreviousData });
  const view = async (i: DownloadItem) => {
    try {
      if (i.kind === "link") {
        await api.get(sharedApi.filePath(i.id), { quiet: true });
        window.open(i.link ?? "", "_blank", "noopener");
      } else window.open(await authedImageUrl(sharedApi.filePath(i.id)), "_blank", "noopener");
      queryClient.invalidateQueries({ queryKey: ["shared", "downloads"] });
    } catch (err) {
      showToast(errorMessage(err), "error");
    }
  };
  const ack = async (i: DownloadItem) => {
    try {
      await sharedApi.ack(i.id);
      queryClient.invalidateQueries({ queryKey: ["shared", "downloads"] });
      showToast("Thank you", "success");
    } catch (err) {
      showToast(errorMessage(err), "error");
    }
  };
  if (q.isLoading) return <PageLoader />;
  if (q.error) return <FormAlert>{errorMessage(q.error)}</FormAlert>;
  const d = q.data!;
  const folders = d.folders.filter((f) => f.items.length);
  const shown = open ? folders.filter((f) => f.id === open) : folders;
  return (
    <div className="space-y-4 max-w-4xl">
      {d.toAcknowledge > 0 && <FormAlert tone="warning">{d.toAcknowledge} file{d.toAcknowledge === 1 ? "" : "s"} to read and confirm (marked below).</FormAlert>}
      <Card>
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Find a file" icon="search" />
        {folders.length > 1 && (
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={() => setOpen(null)} className={cn("rounded-full px-3 py-1 text-xs font-bold border", !open ? "bg-primary text-white border-primary" : "border-outline-variant/40 text-on-surface-variant")}>
              All
            </button>
            {folders.map((f) => (
              <button key={f.id} type="button" onClick={() => setOpen(f.id)} className={cn("rounded-full px-3 py-1 text-xs font-bold border", open === f.id ? "bg-primary text-white border-primary" : "border-outline-variant/40 text-on-surface-variant")}>
                {f.name} ({f.items.length})
              </button>
            ))}
          </div>
        )}
      </Card>
      {!shown.length && <FormAlert tone="info">{search ? "No file found." : "Nothing shared with you yet."}</FormAlert>}
      {shown.map((f) => (
        <Card key={f.id}>
          <p className="font-extrabold flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">folder</span>
            {f.name}
          </p>
          {f.description && <p className="text-xs text-on-surface-variant">{f.description}</p>}
          <ul className="mt-3 space-y-2">
            {f.items.map((i) => (
              <li key={i.id} className={cn("flex flex-wrap items-center gap-3 rounded-xl px-3 py-2.5", i.needsAck && !i.acknowledged ? "bg-amber-50" : "bg-surface-container-low")}>
                <span className="material-symbols-outlined text-2xl text-primary">{fileIcon(i.mimeType, i.kind)}</span>
                <button type="button" onClick={() => view(i)} className="flex-1 min-w-[12rem] text-left">
                  <span className="block text-sm font-bold hover:text-primary">
                    {i.title} {i.isNew && <Pill tone="primary">New</Pill>}
                  </span>
                  <span className="block text-xs text-on-surface-variant/70">
                    {i.kind === "link" ? "Opens a website" : `${i.fileName} · ${size(i.sizeBytes)}`}
                    {i.version > 1 ? ` · updated (v${i.version})` : ""} · {new Date(i.updatedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                    {i.validUntil ? ` · until ${i.validUntil}` : ""}
                  </span>
                  {i.description && <span className="block text-xs">{i.description}</span>}
                </button>
                <Button variant="tertiary" onClick={() => view(i)}>
                  {i.kind === "link" ? "Open" : "Open / download"}
                </Button>
                {i.needsAck && (i.acknowledged ? <Pill tone="success">Confirmed ✓</Pill> : <Button onClick={() => ack(i)}>I have read it</Button>)}
              </li>
            ))}
          </ul>
        </Card>
      ))}
    </div>
  );
}

export default function DownloadsPage() {
  return (
    <RequirePermission permission="upload.view">
      <PageHeader title="Downloads" description="Circulars, syllabus, forms and other files the school has shared with you." />
      <Downloads />
    </RequirePermission>
  );
}
