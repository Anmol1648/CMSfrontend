import { api, uploadFile } from './client';

/** Visitors and student pickups (cmsbackend/src/modules/visitors). */

export type HostKind = 'staff' | 'student' | 'office';

export interface Visit {
  id: string;
  passNo: string | null;
  day: string;
  status: 'expected' | 'waiting' | 'in' | 'out' | 'denied' | 'no_show';
  visitor: { id: string; name: string; mobile: string | null; idType: string | null; idNumber: string | null; blacklisted: boolean };
  photoFileId: string | null;
  purpose: string | null;
  hostKind: HostKind;
  host: string;
  people: number;
  vehicleNo: string | null;
  note: string | null;
  inAt: string | null;
  outAt: string | null;
  answerNote: string | null;
}
export interface GateToday {
  inside: Visit[];
  waiting: Visit[];
  expected: Visit[];
  denied: Visit[];
  outToday: number;
  inToday: number;
}
export interface Known {
  id: string;
  name: string;
  mobile: string | null;
  photoFileId: string | null;
  idTypeId: string | null;
  idNumber: string | null;
  address: string | null;
  blacklisted: boolean;
  blacklistReason: string | null;
  visits: { day: string; purpose: string | null; met: string }[];
}
export interface EntryInput {
  expectedVisitId?: string | null;
  name: string;
  mobile: string | null;
  idTypeId: string | null;
  idNumber: string | null;
  address: string | null;
  photoFileId: string | null;
  purposeId: string | null;
  hostKind: HostKind;
  staffId: string | null;
  studentId: string | null;
  people: number;
  vehicleNo: string | null;
  note: string | null;
}
export interface PickupList {
  guardians: { id: string; name: string; relation: string; mobile: string | null }[];
  people: { id: string; name: string; relationId: string | null; relation: string; mobile: string | null; photoFileId: string | null; note: string | null }[];
}
export interface GateStudent extends PickupList {
  student: { id: string; name: string; admissionNo: string; hasPhoto: boolean; section: string; classTeacher: { name: string; mobile: string | null } | null; active: boolean };
  today: { id: string; at: string; name: string; relation: string | null; status: string }[];
}
export interface PickupRow {
  id: string;
  student: string;
  studentId: string;
  name: string;
  relation: string | null;
  mobile: string | null;
  reason: string | null;
  byKind: 'guardian' | 'person' | 'other';
  status: 'done' | 'waiting' | 'refused';
  at: string;
  photoFileId: string | null;
}
export type PersonInput = { name: string; relationId: string | null; mobile: string; photoFileId?: string | null; note: string | null };

export const visitorsApi = {
  setup: () => api.get<{ photoRequired: boolean; idRequired: boolean; approval: boolean; passSize: 'a6' | 'thermal'; today: string; yesterday: string }>('/visitors/setup'),
  today: () => api.get<GateToday>('/visitors/today', { quiet: true }),
  lookup: (mobile: string) => api.get<Known | null>('/visitors/lookup', { params: { mobile }, quiet: true }),
  hosts: (kind: 'staff' | 'student', q: string) => api.get<{ id: string; label: string; detail: string }[]>('/visitors/hosts', { params: { kind, q }, quiet: true }),
  enter: (input: EntryInput) => api.post<Visit>('/visitors/enter', input),
  out: (key: string) => api.post<Visit>('/visitors/out', { key }),
  visit: (id: string) => api.get<Visit>(`/visitors/visits/${id}`),
  pass: (id: string) => api.get<{ visit: Visit; school: { name: string; hasLogo: boolean }; size: 'a6' | 'thermal' }>(`/visitors/visits/${id}/pass`),
  uploadPhoto: (file: File) => uploadFile<{ id: string }>('/visitors/photos', 'file', file),
  visitPhoto: (id: string) => `/visitors/visits/${id}/photo`,
  visitorPhoto: (id: string) => `/visitors/visitors/${id}/photo`,
  studentPhoto: (id: string) => `/visitors/students/${id}/photo`,
  personPhoto: (id: string) => `/visitors/people/${id}/photo`,
  pickupPhoto: (id: string) => `/visitors/pickups/${id}/photo`,

  mine: () => api.get<{ waiting: Visit[]; expected: Visit[]; recent: Visit[] }>('/visitors/mine', { quiet: true }),
  expect: (input: { name: string; mobile: string | null; day: string; purposeId: string | null; people: number; note: string | null }) => api.post<Visit>('/visitors/expect', input),
  cancelExpected: (id: string) => api.delete(`/visitors/expect/${id}`),
  answer: (id: string, allow: boolean, note?: string) => api.post<Visit>(`/visitors/visits/${id}/answer`, { allow, note: note || null }),

  log: (q: { from?: string; to?: string; purpose?: string; status?: string; search?: string; page?: number }) => api.get<{ total: number; page: number; pageSize: number; rows: Visit[] }>('/visitors/log', { params: Object.fromEntries(Object.entries(q).filter(([, v]) => v)) }),
  blacklist: () => api.get<{ id: string; name: string; mobile: string | null; reason: string | null; photoFileId: string | null }[]>('/visitors/blacklist'),
  setBlacklist: (input: { visitorId?: string; name?: string; mobile?: string; blacklisted: boolean; reason?: string | null }) => api.post('/visitors/blacklist', input),

  pickupsToday: () => api.get<PickupRow[]>('/visitors/pickup/today', { quiet: true }),
  gateStudent: (id: string) => api.get<GateStudent>(`/visitors/pickup/student/${id}`),
  pickup: (input: { studentId: string; byKind: 'guardian' | 'person' | 'other'; guardianId?: string | null; personId?: string | null; name?: string | null; relation?: string | null; mobile?: string | null; photoFileId?: string | null; reason: string }) => api.post<{ id: string; status: string }>('/visitors/pickup', input),
  answerPickup: (id: string, allow: boolean) => api.post(`/visitors/pickup/${id}/answer`, { allow }),
  myPickup: () => api.get<{ canAdd: boolean; children: (PickupList & { student: { id: string; name: string }; recent: { id: string; at: string; name: string; relation: string | null; reason: string | null; status: string }[] })[] }>('/visitors/pickup/mine'),
  addPerson: (studentId: string, input: PersonInput) => api.post<PickupList>(`/visitors/pickup/student/${studentId}/people`, input),
  updatePerson: (id: string, input: PersonInput) => api.put<PickupList>(`/visitors/pickup/people/${id}`, input),
  removePerson: (id: string) => api.delete<PickupList>(`/visitors/pickup/people/${id}`),
};

export const clock = (iso: string | null | undefined) => (iso ? new Date(iso).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: 'numeric', minute: '2-digit', hour12: true }) : '');
export const sinceMin = (iso: string | null) => (iso ? Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000)) : 0);
export const VISIT_STATUS: Record<Visit['status'], { label: string; tone: 'success' | 'warning' | 'danger' | 'neutral' | 'primary' }> = { in: { label: 'Inside', tone: 'success' }, out: { label: 'Left', tone: 'neutral' }, waiting: { label: 'Waiting for OK', tone: 'warning' }, denied: { label: 'Not allowed', tone: 'danger' }, expected: { label: 'Expected', tone: 'primary' }, no_show: { label: 'Didn’t come', tone: 'neutral' } };
