import { api, downloadFile, uploadFile } from './client';

/** Notifications, messages and alerts (cmsbackend/src/modules/alerts). */

export type Channel = 'in_app' | 'email' | 'sms' | 'whatsapp';
export const CHANNEL_LABEL: Record<Channel, string> = { in_app: 'In-app', email: 'Email', sms: 'SMS', whatsapp: 'WhatsApp' };
export const CHANNEL_ICON: Record<Channel, string> = { in_app: 'notifications', email: 'mail', sms: 'sms', whatsapp: 'chat' };

export interface NotificationItem {
  id: string;
  type: string;
  typeName?: string;
  icon: string;
  title: string;
  body: string;
  link: string | null;
  priority: string;
  read: boolean;
  at: string;
}

export interface Bell {
  on: boolean;
  unread: number;
  latest: NotificationItem[];
  toasts: NotificationItem[];
  refreshSeconds: number;
  now: string;
}

export interface NotificationPage {
  rows: NotificationItem[];
  total: number;
  unread: number;
  page: number;
  pages: number;
  types: { code: string; name: string; icon: string }[];
}

export interface Preferences {
  channels: Channel[];
  types: { code: string; name: string; icon: string; required: boolean; muted: Channel[] }[];
}

export interface Audience {
  userIds: string[];
  studentIds: string[];
  staffIds: string[];
  sectionIds: string[];
  classIds: string[];
  roleIds: string[];
  groupIds: string[];
  who: ('parent' | 'student')[];
  allStaff: boolean;
  allParents: boolean;
  allStudents: boolean;
  emails: string[];
}
export const NO_AUDIENCE: Audience = { userIds: [], studentIds: [], staffIds: [], sectionIds: [], classIds: [], roleIds: [], groupIds: [], who: ['parent'], allStaff: false, allParents: false, allStudents: false, emails: [] };

export interface ComposeInput {
  audience: Audience;
  subject: string;
  body: string;
  shortText?: string | null;
  channels: Channel[];
  categoryId?: string | null;
  priority: string;
  cc: string[];
  attachmentIds: string[];
  reportCard?: { scope: 'exam' | 'term' | 'final'; id: string } | null;
  sendAt?: string | null;
}

export interface ComposePowers {
  send: boolean;
  assigned: boolean;
  groups: boolean;
  documents: boolean;
  schedule: boolean;
  paidChannels: boolean;
  viewSent: string | null;
}

export interface PickerOptions {
  powers: ComposePowers;
  sections: { id: string; label: string }[];
  classes: { id: string; name: string }[];
  roles: { id: string; name: string }[];
  students: { id: string; label: string }[];
  staff: { id: string; label: string }[];
  groups: { id: string; name: string; label: string; audience: Partial<Audience> }[];
}

export interface ComposePreview {
  people: number;
  byKind: Record<string, number>;
  channels: { channel: Channel; on: boolean; reach: number }[];
  unreachable: number;
  audience: string;
  sample: { to: string; subject: string; body: string; shortText: string } | null;
}

export interface SentRow {
  id: string;
  subject: string;
  audience: string;
  channels: Channel[];
  status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'cancelled';
  sendAt: string | null;
  sentAt: string | null;
  recipients: number;
  by: string | null;
  counts: Record<string, number>;
}

export interface Delivery {
  id: string;
  recipientName: string;
  recipientKind: string;
  channel: Channel;
  address: string | null;
  status: 'queued' | 'sending' | 'sent' | 'failed' | 'skipped';
  reason: string | null;
  sentAt: string | null;
  read: boolean;
}

export interface MessageFull {
  id: string;
  subject: string;
  body: string;
  shortText: string | null;
  channels: Channel[];
  priority: string;
  categoryId: string | null;
  audience: string;
  cc: string[];
  status: SentRow['status'];
  sendAt: string | null;
  sentAt: string | null;
  reportCard: boolean;
  attachments: { id: string; name: string }[];
  deliveries: Delivery[];
}

export interface MessageTemplate {
  id: string;
  name: string;
  categoryId: string | null;
  subject: string;
  body: string;
  shortText: string | null;
}

export interface AlertRow {
  key: string;
  label: string;
  description: string;
  type: string;
  when: 'instant' | 'daily';
  enabled: boolean;
  channels: Channel[];
  recipients: string[];
  recipientChoices: { key: string; label: string }[];
  required: boolean;
  priority: string;
  custom: boolean;
}

export interface AlertInput {
  enabled: boolean;
  channels: Channel[];
  recipients: string[];
  priority: string;
  required: boolean;
  subject: string;
  body: string;
  shortText: string;
}

export interface AlertFull extends AlertInput {
  key: string;
  label: string;
  description: string;
  type: string;
  when: 'instant' | 'daily';
  recipientChoices: { key: string; label: string }[];
  fields: { key: string; label: string; example: string }[];
  defaults: AlertInput;
}

export interface LogRow {
  id: string;
  alertKey: string | null;
  messageId: string | null;
  source: string;
  recipientName: string;
  recipientKind: string;
  address: string | null;
  channel: Channel;
  status: Delivery['status'];
  reason: string | null;
  subject: string;
  attempts: number;
  createdAt: string;
  sentAt: string | null;
  nextAttemptAt: string;
}

export interface LogQuery {
  page?: number;
  search?: string;
  channel?: string;
  status?: string;
  alert?: string;
  from?: string;
  to?: string;
}

export interface ChannelSetup {
  inApp: boolean;
  email: { on: boolean; configured: boolean };
  sms: { on: boolean; provider: string; saved: { key: boolean; account: boolean; template: boolean } };
  whatsapp: { on: boolean; provider: string; saved: { key: boolean; account: boolean; template: boolean } };
}

const clean = (q: object) => Object.fromEntries(Object.entries(q).filter(([, v]) => v !== undefined && v !== '' && v !== null)) as Record<string, string | number>;

export const alertsApi = {
  bell: (since?: string) => api.get<Bell>('/alerts/bell', { params: since ? { since } : {}, quiet: true }),
  notifications: (q: { unread?: boolean; type?: string; page?: number }) => api.get<NotificationPage>('/alerts/notifications', { params: clean({ ...q, unread: q.unread ? 'true' : undefined }) }),
  markRead: (ids: string[] | 'all') => api.post<{ read: number }>('/alerts/notifications/read', { ids }),
  remove: (id: string) => api.delete<{ id: string }>(`/alerts/notifications/${id}`),
  preferences: () => api.get<Preferences>('/alerts/preferences'),
  savePreferences: (types: { code: string; muted: Channel[] }[]) => api.put<Preferences>('/alerts/preferences', { types }),

  pickerOptions: (search?: string) => api.get<PickerOptions>('/alerts/compose/options', { params: search ? { search } : {}, quiet: !!search }),
  preview: (input: ComposeInput) => api.postRead<ComposePreview>('/alerts/compose/preview', input),
  send: (input: ComposeInput) => api.post<MessageFull>('/alerts/compose', input),
  upload: (file: File) => uploadFile<{ id: string; name: string }>('/alerts/attachments', 'file', file),
  sent: (q: { page?: number; search?: string; status?: string }) => api.get<{ rows: SentRow[]; total: number; page: number; pages: number }>('/alerts/messages', { params: clean(q) }),
  message: (id: string) => api.get<MessageFull>(`/alerts/messages/${id}`),
  cancel: (id: string) => api.post<MessageFull>(`/alerts/messages/${id}/cancel`),

  templates: () => api.get<MessageTemplate[]>('/alerts/templates'),
  saveTemplate: (id: string | null, input: Omit<MessageTemplate, 'id'>) => (id ? api.put<MessageTemplate>(`/alerts/templates/${id}`, input) : api.post<MessageTemplate>('/alerts/templates', input)),
  deleteTemplate: (id: string) => api.delete<{ id: string }>(`/alerts/templates/${id}`),
  saveGroup: (name: string, audience: Audience) => api.post<{ id: string }>('/alerts/groups', { name, audience }),
  deleteGroup: (id: string) => api.delete<{ id: string }>(`/alerts/groups/${id}`),

  builtin: () => api.get<AlertRow[]>('/alerts/builtin'),
  alert: (key: string) => api.get<AlertFull>(`/alerts/builtin/${key}`),
  saveAlert: (key: string, input: AlertInput) => api.put<AlertFull>(`/alerts/builtin/${key}`, input),
  resetAlert: (key: string) => api.post<AlertFull>(`/alerts/builtin/${key}/reset`),
  previewAlert: (key: string, input: Partial<AlertInput>) => api.postRead<{ subject: string; body: string; shortText: string }>(`/alerts/builtin/${key}/preview`, input),
  testAlert: (key: string, input: Partial<AlertInput>) => api.post<{ people: number; inApp: number; queued: number; unreachable: number }>(`/alerts/builtin/${key}/test`, input),
  jobs: () => api.get<{ key: string; lastDay: string | null; lastResult: string | null }[]>('/alerts/jobs'),
  runJob: (key: string) => api.post<{ key: string; result: string | null }>(`/alerts/jobs/${key}/run`),

  log: (q: LogQuery) => api.get<{ rows: LogRow[]; total: number; page: number; pages: number; counts: Record<string, number>; alerts: { key: string; label: string }[] }>('/alerts/log', { params: clean(q) }),
  exportLog: (q: LogQuery) => downloadFile('/alerts/log/export', clean({ ...q, page: undefined }), 'alert-log.xlsx'),
  bouncing: () => api.get<{ address: string; channel: Channel; name: string; failures: number }[]>('/alerts/log/bouncing'),
  retry: (id: string) => api.post<{ id: string }>(`/alerts/log/${id}/retry`),

  channels: () => api.get<ChannelSetup>('/alerts/channels'),
  saveKeys: (keys: Record<string, string>) => api.put<ChannelSetup>('/alerts/channels/keys', keys),
};

/** "5 min ago", "yesterday", "12 Oct". */
export const timeAgo = (iso: string) => {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86_400) return `${Math.floor(s / 3600)} h ago`;
  if (s < 172_800) return 'yesterday';
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
};
