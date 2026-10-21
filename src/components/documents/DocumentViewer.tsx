"use client";

import { documentsApi } from "@/lib/api/documents";
import { PdfViewer } from "./PdfViewer";

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
  const paramsKey = JSON.stringify(params);
  return (
    <PdfViewer
      load={() => documentsApi.pdf(docKey, JSON.parse(paramsKey) as Record<string, string>)}
      loadKey={`${docKey}|${paramsKey}`}
      title={title}
      filename={filename}
      inline={inline}
      onClose={onClose}
      className={className}
    />
  );
}
