import { api, fetchPdf } from './client';

/** Documents (cmsbackend/src/modules/documents): PDFs made on the server from editable templates. */

export type PaperSize = 'A4' | 'A5' | 'A4_HALF' | 'THERMAL_80';
export const PAPER_SIZES: Record<PaperSize, string> = { A4: 'A4', A5: 'A5', A4_HALF: 'Half A4', THERMAL_80: 'Thermal roll 80 mm' };

export interface Paper {
  size: PaperSize;
  orientation: 'portrait' | 'landscape';
  margin: number;
  copies: string[];
  copiesOnOnePage?: boolean;
}

export interface DocumentListItem {
  key: string;
  label: string;
  description: string;
  custom: boolean;
  updatedAt: string | null;
  paper: Paper;
}

export interface DocumentTemplate {
  key: string;
  label: string;
  description: string;
  html: string;
  css: string;
  paper: Paper;
  custom: boolean;
  updatedAt: string | null;
  fields: { key: string; label: string }[];
  defaults: { html: string; css: string; paper: Paper };
}

export const documentsApi = {
  list: () => api.get<DocumentListItem[]>('/documents'),
  template: (key: string) => api.get<DocumentTemplate>(`/documents/${key}/template`),
  save: (key: string, input: { html: string; css: string; paper: Paper }) => api.put<DocumentTemplate>(`/documents/${key}/template`, input),
  reset: (key: string) => api.delete<DocumentTemplate>(`/documents/${key}/template`),
  /** The template being edited, drawn with a sample record. */
  preview: (key: string, input: { html: string; css: string; paper: Paper }) => fetchPdf(`/documents/${key}/preview`, { body: input }),
  /** A document of a record, e.g. pdf("fee_receipt", { id }). */
  pdf: (key: string, params: Record<string, string>) => fetchPdf(`/documents/${key}/pdf`, { params }),
};
