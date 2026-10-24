import { api, uploadFile } from './client';

/** Discipline (cmsbackend/src/modules/discipline). */

export type Severity = 'minor' | 'moderate' | 'serious';
export type Role = 'did' | 'affected' | 'witness';

export interface Options {
  types: { id: string; name: string; positive?: boolean; severity?: string; points?: number }[];
  actions: { id: string; name: string; approval: boolean; dates: boolean }[];
  points: boolean;
  alertFrom: string;
  can: { record: boolean; action: boolean; approve: boolean };
}
export interface IncidentRow {
  id: string;
  title: string;
  type: string;
  positive: boolean;
  severity: Severity;
  occurredAt: string;
  status: 'open' | 'resolved';
  students: string[];
  actions: number;
  pending: number;
  acknowledged: boolean;
}
export interface Incident {
  id: string;
  type: string;
  typeId: string | null;
  positive: boolean;
  severity: Severity;
  occurredAt: string;
  place: string | null;
  title: string;
  details: string | null;
  attachmentIds: string[];
  status: 'open' | 'resolved';
  followUpOn: string | null;
  recordedBy: string | null;
  resolvedBy: string | null;
  resolvedAt: string | null;
  parentsSee: boolean;
  students: { id: string; studentId: string; name: string; admissionNo: string; section: string; role: Role; roleLabel: string; points: number; informedHow: string; informedAt: string | null; acknowledgedAt: string | null; acknowledgedBy: string | null; parentReply: string | null }[];
  actions: { id: string; action: string; student: string; note: string | null; fromDate: string | null; toDate: string | null; status: 'done' | 'pending' | 'rejected'; decidedBy: string | null; approvedBy: string | null; answer: string | null; at: string }[];
  can: { action: boolean; approve: boolean; resolve: boolean };
}
export interface RecordInput {
  typeId: string;
  severity?: Severity;
  occurredAt: string;
  placeId: string | null;
  title: string | null;
  details: string | null;
  students: { studentId: string; role: Role }[];
  attachmentIds: string[];
  phoned: boolean;
  followUpOn: string | null;
}
export interface Conduct {
  student: { id: string; name: string; admissionNo: string; section: string };
  points: number;
  incidents: number;
  positives: number;
  history: { id: string; title: string; type: string; positive: boolean; severity: Severity; role: string; points: number; occurredAt: string; status: string; actions: string[] }[];
}
export interface MyConduct {
  visible: boolean;
  points: boolean;
  children: { id: string; name: string; points: number; items: { id: string; incidentId: string; title: string; type: string; positive: boolean; severity: Severity; role: string; details: string | null; place: string | null; occurredAt: string; points: number; actions: string[]; acknowledgedAt: string | null; parentReply: string | null }[] }[];
}

export const disciplineApi = {
  options: () => api.get<Options>('/discipline/options'),
  students: (q: string) => api.get<{ id: string; name: string; admissionNo: string; section: string }[]>('/discipline/students', { params: { q }, quiet: true }),
  upload: (file: File) => uploadFile<{ id: string; name: string }>('/discipline/files', 'file', file),
  filePath: (id: string, fileId: string) => `/discipline/${id}/files/${fileId}`,
  record: (input: RecordInput) => api.post<Incident>('/discipline', input),
  list: (q: { from?: string; to?: string; section?: string; type?: string; severity?: string; status?: string; kind?: string; search?: string; page?: number }) => api.get<{ total: number; page: number; pageSize: number; rows: IncidentRow[] }>('/discipline', { params: Object.fromEntries(Object.entries(q).filter(([, v]) => v)) }),
  get: (id: string) => api.get<Incident>(`/discipline/${id}`),
  pending: () => api.get<{ id: string; incidentId: string; title: string; severity: Severity; action: string; student: string; fromDate: string | null; toDate: string | null; note: string | null; by: string; at: string }[]>('/discipline/pending'),
  student: (id: string) => api.get<Conduct>(`/discipline/student/${id}`),
  addAction: (id: string, input: { studentId: string | null; actionId: string; note: string | null; fromDate: string | null; toDate: string | null }) => api.post<Incident>(`/discipline/${id}/actions`, input),
  answer: (actionId: string, approve: boolean, answer: string | null) => api.post<Incident>(`/discipline/actions/${actionId}/answer`, { approve, answer }),
  resolve: (id: string, resolved: boolean) => api.post<Incident>(`/discipline/${id}/resolve`, { resolved }),
  informed: (id: string, incidentStudentId: string, how: 'phone' | 'meeting' | 'alert') => api.post<Incident>(`/discipline/${id}/informed`, { incidentStudentId, how }),
  mine: () => api.get<MyConduct>('/discipline/mine'),
  acknowledge: (incidentStudentId: string, reply: string | null) => api.post(`/discipline/mine/${incidentStudentId}/acknowledge`, { reply }),
};

export const SEVERITY: Record<Severity, { label: string; tone: 'neutral' | 'warning' | 'danger' }> = { minor: { label: 'Minor', tone: 'neutral' }, moderate: { label: 'Moderate', tone: 'warning' }, serious: { label: 'Serious', tone: 'danger' } };
export const when = (iso: string | null) => (iso ? new Date(iso).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true }) : '');
export const INFORMED: Record<string, string> = { none: 'Not told yet', alert: 'Told (app / email)', phone: 'Told by phone', meeting: 'Told in a meeting' };
