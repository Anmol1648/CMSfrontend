import { api } from './client';

/** Setup → Email Templates (cmsbackend/src/modules/email-templates). */

export interface EmailTemplateSummary {
  key: string;
  label: string;
  description: string;
  isCustom: boolean;
  updatedAt: string | null;
}

export interface EmailTemplate extends EmailTemplateSummary {
  subject: string;
  body: string;
  defaults: { subject: string; body: string };
  placeholders: { key: string; label: string; example: string; required: boolean }[];
}

export interface EmailPreview {
  subject: string;
  html: string;
  problems: { field: string; message: string }[];
}

type Wording = { subject: string; body: string };

export const emailTemplatesApi = {
  list: () => api.get<EmailTemplateSummary[]>('/email-templates'),
  get: (key: string) => api.get<EmailTemplate>(`/email-templates/${key}`),
  save: (key: string, w: Wording) => api.put<EmailTemplate>(`/email-templates/${key}`, w),
  reset: (key: string) => api.delete<EmailTemplate>(`/email-templates/${key}`),
  preview: (key: string, w?: Wording) => api.post<EmailPreview>(`/email-templates/${key}/preview`, w ?? {}),
  // Waits for the mail server, which can be slow.
  sendTest: (key: string, w?: Wording) => api.post<{ to: string }>(`/email-templates/${key}/test`, w ?? {}, { timeout: 120_000 }),
};
