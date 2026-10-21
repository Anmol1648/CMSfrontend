"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { FormAlert } from "@/components/forms";
import { PageLoader } from "@/components/ui/PageLoader";
import { errorMessage } from "@/lib/api/client";
import { documentsApi } from "@/lib/api/documents";
import { cn } from "@/lib/utils";

/**
 * A document (PDF made on the server) shown in the app: exactly what prints, with Print, Download and
 * Open in a new tab. `inline` draws it in the page; otherwise it opens in a large window.
 */
export function DocumentViewer({
  docKey,
  params,
  title,
  filename = "document.pdf",
  inline = false,
  onClose,
  className,
}: {
  docKey: string;
  params: Record<string, string>;
  title: string;
  filename?: string;
  inline?: boolean;
  onClose?: () => void;
  className?: string;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const frame = useRef<HTMLIFrameElement>(null);
  const paramsKey = JSON.stringify(params);

  useEffect(() => {
    let alive = true;
    let made: string | null = null;
    setUrl(null);
    setError(null);
    documentsApi
      .pdf(docKey, JSON.parse(paramsKey) as Record<string, string>)
      .then((blob) => {
        if (!alive) return;
        made = URL.createObjectURL(new Blob([blob], { type: "application/pdf" }));
        setUrl(made);
      })
      .catch((err) => alive && setError(errorMessage(err)));
    return () => {
      alive = false;
      if (made) URL.revokeObjectURL(made);
    };
  }, [docKey, paramsKey]);

  const download = () => {
    if (!url) return;
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
  };

  const body = (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button variant="secondary" disabled={!url} onClick={() => url && window.open(url, "_blank", "noopener")}>
          <span className="material-symbols-outlined text-lg align-middle mr-1">open_in_new</span>
          Open
        </Button>
        <Button variant="secondary" disabled={!url} onClick={download}>
          <span className="material-symbols-outlined text-lg align-middle mr-1">download</span>
          Download PDF
        </Button>
        <Button disabled={!url} onClick={() => frame.current?.contentWindow?.print()}>
          <span className="material-symbols-outlined text-lg align-middle mr-1">print</span>
          Print
        </Button>
      </div>
      {error && <FormAlert>{error}</FormAlert>}
      {!url && !error && (
        <div className="rounded-xl border border-outline-variant/20 bg-surface-container-low p-6">
          <PageLoader label="Making the document…" />
        </div>
      )}
      {url && <iframe ref={frame} src={url} title={title} className="w-full rounded-xl border border-outline-variant/20 bg-white" style={{ height: inline ? "80vh" : "72vh" }} />}
    </div>
  );

  if (inline) return body;
  return (
    <Modal isOpen onClose={() => onClose?.()} title={title} width="max-w-5xl">
      {body}
    </Modal>
  );
}
