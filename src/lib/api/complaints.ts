import { api, uploadFile } from './client';

/** Complaints / grievances (cmsbackend/src/modules/complaints). */

export type ComplaintStatus = 'new' | 'assigned' | 'in_progress' | 'resolved' | 'closed' | 'reopened';
export type Priority = 'normal' | 'high' | 'urgent';

export interface ComplaintRow {
  id: string;
  ticketNo: string;
  subject: string;
  category: string;
  priority: Priority;
  status: ComplaintStatus;
  raisedBy: string;
  student: string | null;
  handler: string;
  createdAt: string;
  updatedAt: string;
  escalation: number;
  rating: number | null;
  overdue: boolean;
}
export interface Complaint {
  /** Extra fields of the school (Setup → Form Builder). */
  custom?: Record<string, unknown>;
  id: string;
  ticketNo: string;
  category: string;
  categoryId: string | null;
  subject: string;
  details: string;
  priority: Priority;
  status: ComplaintStatus;
  anonymous: boolean;
  raisedBy: string;
  raisedAs: string;
  student: string | null;
  staff: string | null;
  route: string | null;
  assignedTo: string | null;
  handler: string;
  createdAt: string;
  respondBy: string | null;
  resolveBy: string | null;
  firstResponseAt: string | null;
  resolvedAt: string | null;
  closedAt: string | null;
  resolution: string | null;
  escalation: number;
  reopened: number;
  rating: number | null;
  ratingNote: string | null;
  attachmentIds: string[];
  overdue: boolean;
  messages: { id: string; kind: 'reply' | 'note' | 'event'; text: string; author: string; fromRaiser: boolean; attachmentIds: string[]; at: string }[];
  can: { reply: boolean; note: boolean; assign: boolean; work: boolean; close: boolean; accept: boolean; reopen: boolean; rate: boolean };
}
export interface RaiseInput {
  /** Extra fields of the school (Setup → Form Builder). */
  custom?: Record<string, unknown>;
  categoryId: string;
  subject: string;
  details: string;
  priority: 'normal' | 'high';
  anonymous: boolean;
  studentId: string | null;
  routeId?: string | null;
  attachmentIds: string[];
  contactName?: string | null;
  contactMobile?: string | null;
}

export const complaintsApi = {
  options: () => api.get<{ categories: { id: string; name: string; anonymous: boolean; urgent: boolean }[]; students: { id: string; name: string }[]; maxFiles: number; office: boolean }>('/complaints/options'),
  upload: (file: File) => uploadFile<{ id: string; name: string }>('/complaints/files', 'file', file),
  filePath: (id: string, fileId: string) => `/complaints/${id}/files/${fileId}`,
  raise: (input: RaiseInput) => api.post<Complaint>('/complaints', input),
  mine: () => api.get<ComplaintRow[]>('/complaints/mine'),
  desk: (q: { show?: string; mine?: '1'; overdue?: '1'; category?: string; priority?: string; search?: string; page?: number }) =>
    api.get<{ total: number; page: number; pageSize: number; manage: boolean; counts: { open: number; resolved: number; closed: number; overdue: number }; rows: ComplaintRow[] }>('/complaints/desk', { params: Object.fromEntries(Object.entries(q).filter(([, v]) => v)) }),
  handlers: () => api.get<{ id: string; name: string }[]>('/complaints/handlers'),
  get: (id: string) => api.get<Complaint>(`/complaints/${id}`),
  reply: (id: string, text: string, attachmentIds: string[] = []) => api.post<Complaint>(`/complaints/${id}/reply`, { text, attachmentIds }),
  note: (id: string, text: string) => api.post<Complaint>(`/complaints/${id}/note`, { text }),
  assign: (id: string, to: string) => api.post<Complaint>(`/complaints/${id}/assign`, { to }),
  resolve: (id: string, resolution: string) => api.post<Complaint>(`/complaints/${id}/resolve`, { resolution }),
  close: (id: string, note?: string) => api.post<Complaint>(`/complaints/${id}/close`, { note: note || null }),
  accept: (id: string, rating: number | null, note: string | null) => api.post<Complaint>(`/complaints/${id}/accept`, { rating, note }),
  rate: (id: string, rating: number, note: string | null) => api.post<Complaint>(`/complaints/${id}/rate`, { rating, note }),
  reopen: (id: string, reason: string) => api.post<Complaint>(`/complaints/${id}/reopen`, { reason }),
};

export const STATUS: Record<ComplaintStatus, { label: string; tone: 'neutral' | 'primary' | 'warning' | 'success' | 'danger' }> = {
  new: { label: 'New', tone: 'warning' },
  assigned: { label: 'Assigned', tone: 'primary' },
  in_progress: { label: 'In progress', tone: 'primary' },
  reopened: { label: 'Reopened', tone: 'danger' },
  resolved: { label: 'Resolved', tone: 'success' },
  closed: { label: 'Closed', tone: 'neutral' },
};
export const PRIORITY: Record<Priority, { label: string; tone: 'neutral' | 'warning' | 'danger' }> = { normal: { label: 'Normal', tone: 'neutral' }, high: { label: 'High', tone: 'warning' }, urgent: { label: 'Urgent', tone: 'danger' } };
export const when = (iso: string | null) => (iso ? new Date(iso).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true }) : '');
