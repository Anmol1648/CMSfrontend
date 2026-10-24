import { api } from './client';

/** Parent–teacher meetings (cmsbackend/src/modules/ptm). */

export type PtmMode = 'in_person' | 'online' | 'both';
export type WhoSits = 'class' | 'class_subject';
export type PtmStatus = 'draft' | 'published' | 'done' | 'cancelled';

export interface PtmRow {
  id: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  mode: PtmMode;
  status: PtmStatus;
  sections: number;
  booked: number;
  met: number;
  absent: number;
}
export interface PtmInput {
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  slotMinutes: number;
  breakStart: string | null;
  breakEnd: string | null;
  mode: PtmMode;
  whoSits: WhoSits;
  booking: boolean;
  sectionIds: string[];
  note: string | null;
}
/** A PTM as the API gives it: its settings, the sections (with students and class teacher), and the teachers who sit. */
export interface PtmDetail extends Omit<PtmInput, 'sectionIds'> {
  id: string;
  status: PtmStatus;
  sectionIds: string[];
  slots: string[];
  sections: { id: string; label: string; students: number; classTeacher: string | null }[];
  teachers: { staffId: string; name: string; sections: string[]; subjects: string[]; room: string | null; link: string | null; away: boolean; booked: number; met: number }[];
  totals: { students: number; booked: number; met: number };
}

export interface PtmMeetingRow {
  id: string;
  teacher: string;
  student: string;
  slot: string | null;
  status: string;
  remarks: string;
  actions: string | null;
  followUpOn: string | null;
}

export interface MyPtm {
  id: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  mode: PtmMode;
  booking: boolean;
  bookingOpen: boolean;
  canChange: boolean;
  note: string | null;
  topics: { id: string; name: string }[];
  children: {
    id: string;
    name: string;
    section: string;
    teachers: {
      staffId: string;
      name: string;
      role: string;
      room: string | null;
      link: string | null;
      away: boolean;
      meeting: { id: string; slot: string | null; status: string; topicIds: string[]; note: string | null; remarks: { points: { name: string; tone: string }[]; text: string | null; actions: string | null } | null } | null;
      free: string[];
    }[];
  }[];
}

export interface Family {
  studentId: string;
  name: string;
  admissionNo: string;
  roll: number | null;
  section: string;
  attendance: number | null;
  meeting: { id: string; slot: string | null; status: string; topics: string[]; note: string | null; remarkIds: string[]; remarks: string | null; actions: string | null; followUpOn: string | null; shared: boolean; checkedInAt: string | null } | null;
}
export interface MyMeetings {
  ptms: { id: string; title: string; date: string; status: PtmStatus }[];
  ptm: { id: string; title: string; date: string; startTime: string; endTime: string; status: PtmStatus; mode: PtmMode; room: string | null; link: string | null; away: boolean; slots: string[]; sharedByDefault: boolean } | null;
  families?: Family[];
}
export type MeetingInput = { status: 'attended' | 'absent'; remarkIds: string[]; remarks: string | null; actions: string | null; followUpOn: string | null; shared: boolean };

export interface Board {
  ptm: { id: string; title: string; date: string; startTime: string; endTime: string; status: PtmStatus; now: string };
  teachers: { staffId: string; name: string; room: string | null; away: boolean; waiting: { id: string; student: string; slot: string | null }[]; next: { id: string; student: string; slot: string | null }[]; booked: number; met: number }[];
}
export interface DeskFamily {
  student: { id: string; name: string; admissionNo: string; section: string };
  teachers: { staffId: string; name: string; role: string; room: string | null; meeting: { id: string; slot: string | null; status: string } | null }[];
}

export const ptmApi = {
  list: () => api.get<PtmRow[]>('/ptm'),
  defaults: () => api.get<{ slotMinutes: number; whoSits: WhoSits }>('/ptm/defaults'),
  options: () => api.get<{ id: string; label: string }[]>('/ptm/options'),
  get: (id: string) => api.get<PtmDetail>(`/ptm/${id}`),
  save: (id: string | null, input: PtmInput) => (id ? api.put<PtmDetail>(`/ptm/${id}`, input) : api.post<PtmDetail>('/ptm', input)),
  remove: (id: string) => api.delete(`/ptm/${id}`),
  meetings: (id: string) => api.get<PtmMeetingRow[]>(`/ptm/${id}/meetings`),
  setTeacher: (id: string, staffId: string, input: { room: string | null; link: string | null; away: boolean }) => api.put<PtmDetail>(`/ptm/${id}/teachers/${staffId}`, input),
  publish: (id: string) => api.post<PtmDetail>(`/ptm/${id}/publish`),
  cancel: (id: string, reason: string) => api.post<PtmDetail>(`/ptm/${id}/cancel`, { reason }),
  complete: (id: string) => api.post<PtmDetail>(`/ptm/${id}/complete`),

  mine: () => api.get<{ upcoming: MyPtm[]; past: MyPtm[] }>('/ptm/mine'),
  book: (input: { ptmId: string; staffId: string; studentId: string; slot: string; topicIds: string[]; note: string | null }) => api.post<{ id: string; slot: string }>('/ptm/mine/book', input),
  cancelBooking: (id: string) => api.post(`/ptm/mine/cancel/${id}`),

  meet: (ptm?: string) => api.get<MyMeetings>('/ptm/meet', { params: ptm ? { ptm } : {} }),
  saveMeeting: (ptmId: string, studentId: string, input: MeetingInput) => api.put<{ id: string; status: string }>(`/ptm/meet/${ptmId}/${studentId}`, input),

  deskPtms: () => api.get<{ id: string; title: string; date: string }[]>('/ptm/desk'),
  board: (id: string) => api.get<Board>(`/ptm/desk/${id}`, { quiet: true }),
  deskSearch: (id: string, q: string) => api.get<{ id: string; name: string; admissionNo: string; section: string }[]>(`/ptm/desk/${id}/search`, { params: { q }, quiet: true }),
  family: (id: string, studentId: string) => api.get<DeskFamily>(`/ptm/desk/${id}/family/${studentId}`),
  checkIn: (id: string, studentId: string, staffIds: string[]) => api.post<DeskFamily>(`/ptm/desk/${id}/check-in`, { studentId, staffIds }),
};

export const showTime = (t: string | null | undefined) => {
  if (!t) return 'Walk-in';
  const h = Number(t.slice(0, 2));
  return `${((h + 11) % 12) + 1}:${t.slice(3, 5)} ${h < 12 ? 'am' : 'pm'}`;
};
export const showDay = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
export const MODE_LABEL: Record<PtmMode, string> = { in_person: 'At school', online: 'Online', both: 'At school or online' };
export const STATUS: Record<PtmStatus, { label: string; tone: 'neutral' | 'success' | 'primary' | 'danger' }> = { draft: { label: 'Draft', tone: 'neutral' }, published: { label: 'Published', tone: 'success' }, done: { label: 'Held', tone: 'primary' }, cancelled: { label: 'Cancelled', tone: 'danger' } };
export const MEETING: Record<string, { label: string; tone: 'neutral' | 'success' | 'warning' | 'danger' | 'primary' }> = { booked: { label: 'Booked', tone: 'primary' }, waiting: { label: 'Waiting', tone: 'warning' }, attended: { label: 'Met', tone: 'success' }, absent: { label: 'Didn’t come', tone: 'danger' }, cancelled: { label: 'Cancelled', tone: 'neutral' } };
