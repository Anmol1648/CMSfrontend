import { api, uploadFile } from './client';

/** Notices and the school calendar (cmsbackend/src/modules/notices). */

export interface Audience {
  forEveryone: boolean;
  forAllStaff: boolean;
  roleIds: string[];
  forStudents: boolean;
  forParents: boolean;
  classIds: string[];
  sectionIds: string[];
}
export const NO_AUDIENCE: Audience = { forEveryone: false, forAllStaff: false, roleIds: [], forStudents: false, forParents: false, classIds: [], sectionIds: [] };
export const hasAudience = (a: Audience) => a.forEveryone || a.forAllStaff || a.roleIds.length > 0 || a.forStudents || a.forParents;

export interface AudienceOptions {
  roles: { id: string; name: string }[];
  classes: { id: string; name: string }[];
  sections: { id: string; classId: string; label: string }[];
  /** Notices need approval (System Settings); new ones ask for “I have read this” by default. */
  approval: boolean;
  ackDefault: boolean;
}

export interface NoticeItem {
  id: string;
  title: string;
  excerpt: string;
  category: string | null;
  important: boolean;
  publishAt: string;
  expiresOn: string | null;
  by: string | null;
  attachments: number;
  needsAck: boolean;
  read: boolean;
  acknowledged: boolean;
}

export interface NoticeFull {
  id: string;
  title: string;
  body: string;
  category: string | null;
  important: boolean;
  status: string;
  publishAt: string | null;
  expiresOn: string | null;
  by: string | null;
  audience: string;
  attachments: { id: string; name: string; type: string }[];
  needsAck: boolean;
  meantForMe: boolean;
  acknowledgedAt: string | null;
}

export type NoticeState = 'draft' | 'pending' | 'scheduled' | 'published' | 'expired';

export interface ManagedNotice extends Audience {
  id: string;
  title: string;
  category: string | null;
  categoryId?: string | null;
  important: boolean;
  state: NoticeState;
  publishAt: string | null;
  expiresOn: string | null;
  audience: string;
  audienceCount: number;
  readCount: number;
  ackCount: number;
  needsAck: boolean;
  writtenBy: string | null;
  sentBy: string | null;
  publishedBy: string | null;
  body?: string;
  attachments?: { id: string; name: string }[];
  attachmentIds?: string[];
}

export interface NoticeInput extends Audience {
  title: string;
  body: string;
  categoryId: string | null;
  important: boolean;
  publishAt: string | null;
  expiresOn: string | null;
  needsAck: boolean;
  attachmentIds: string[];
}

export interface Readers {
  title: string;
  needsAck: boolean;
  total: number;
  read: number;
  acknowledged: number;
  groups: { group: string; read: number; people: { name: string; readAt: string | null; acknowledgedAt: string | null }[] }[];
}

export interface SchoolEvent extends Audience {
  kind: 'event';
  id: string;
  title: string;
  type: string | null;
  typeId: string | null;
  from: string;
  to: string;
  startTime: string | null;
  endTime: string | null;
  venue: string | null;
  description: string | null;
  holidayFor: 'none' | 'students' | 'staff' | 'both';
  status: 'scheduled' | 'cancelled';
  audience: string;
  attachments: { id: string; name: string }[];
}

export interface HolidayItem {
  kind: 'holiday';
  id: string;
  title: string;
  from: string;
  to: string;
  forStudents: boolean;
  forStaff: boolean;
}

export interface EventInput extends Audience {
  title: string;
  typeId: string | null;
  from: string;
  to: string;
  startTime: string | null;
  endTime: string | null;
  venue: string | null;
  description: string | null;
  holidayFor: SchoolEvent['holidayFor'];
  attachmentIds: string[];
  postNotice?: boolean;
}

export const noticesApi = {
  mine: (q: { archive?: boolean; category?: string; search?: string } = {}) =>
    api.get<NoticeItem[]>('/notices', { params: { ...(q.archive ? { archive: '1' } : {}), ...(q.category ? { category: q.category } : {}), ...(q.search ? { search: q.search } : {}) } }),
  unread: () => api.get<{ unread: number; toAcknowledge: number }>('/notices/unread', { quiet: true }),
  open: (id: string) => api.get<NoticeFull>(`/notices/${id}`),
  acknowledge: (id: string) => api.post<NoticeFull>(`/notices/${id}/acknowledge`),
  attachmentPath: (id: string, fileId: string) => `/notices/${id}/attachments/${fileId}`,

  audienceOptions: () => api.get<AudienceOptions>('/notices/audience-options'),
  manage: (q: { status?: string; search?: string }) => api.get<ManagedNotice[]>('/notices/manage', { params: Object.fromEntries(Object.entries(q).filter(([, v]) => v)) }),
  manageOne: (id: string) => api.get<ManagedNotice>(`/notices/${id}/manage`),
  create: (input: NoticeInput) => api.post<ManagedNotice>('/notices', input),
  save: (id: string, input: NoticeInput) => api.put<ManagedNotice>(`/notices/${id}`, input),
  publish: (id: string) => api.post<ManagedNotice>(`/notices/${id}/publish`),
  unpublish: (id: string) => api.post<ManagedNotice>(`/notices/${id}/unpublish`),
  remove: (id: string) => api.delete<null>(`/notices/${id}`),
  readers: (id: string) => api.get<Readers>(`/notices/${id}/readers`),
  upload: (file: File) => uploadFile<{ id: string; name: string }>('/notices/attachments', 'file', file),
};

export const eventsApi = {
  calendar: (from: string, to: string) => api.get<{ from: string; to: string; canManage: boolean; events: SchoolEvent[]; holidays: HolidayItem[] }>('/events', { params: { from, to } }),
  upcoming: () => api.get<SchoolEvent[]>('/events/upcoming'),
  create: (input: EventInput) => api.post<SchoolEvent>('/events', input),
  save: (id: string, input: EventInput) => api.put<SchoolEvent>(`/events/${id}`, input),
  cancel: (id: string, cancelled: boolean) => api.post<SchoolEvent>(`/events/${id}/cancel`, { cancelled }),
  remove: (id: string) => api.delete<null>(`/events/${id}`),
  upload: (file: File) => uploadFile<{ id: string; name: string }>('/events/attachments', 'file', file),
  attachmentPath: (id: string, fileId: string) => `/events/${id}/attachments/${fileId}`,
};

export const NOTICE_STATE: Record<NoticeState, { label: string; tone: 'neutral' | 'warning' | 'primary' | 'success' }> = {
  draft: { label: 'Draft', tone: 'neutral' },
  pending: { label: 'Waiting for approval', tone: 'warning' },
  scheduled: { label: 'Scheduled', tone: 'primary' },
  published: { label: 'Published', tone: 'success' },
  expired: { label: 'Expired', tone: 'neutral' },
};
