import { api } from './client';

/** Hostel (cmsbackend/src/modules/hostel). */

export interface Hostel {
  id: string;
  name: string;
  gender: 'boys' | 'girls' | 'mixed';
  wardenId: string | null;
  warden: string | null;
  phone: string | null;
  isActive: boolean;
  rooms: number;
  beds: number;
  boarders: number;
}
export interface RoomType {
  id: string;
  name: string;
  fee: number;
}
export interface Bed {
  bed: number;
  allotmentId: string | null;
  studentId: string | null;
  name: string | null;
  admissionNo: string | null;
  section: string | null;
  from: string | null;
}
export interface Room {
  id: string;
  block: string | null;
  floor: number;
  number: string;
  roomTypeId: string | null;
  type: string;
  beds: number;
  isActive: boolean;
  occupants: number;
  bedList: Bed[];
}
export interface Boarder {
  studentId: string;
  name: string;
  admissionNo: string;
  photo: string | null;
  section: string;
  roomId: string;
  room: string;
  block: string;
  floor: number;
  bed: number;
  onLeave: boolean;
  mark: 'present' | 'absent' | 'leave';
}
export interface Leave {
  id: string;
  studentId: string;
  student: string;
  admissionNo: string;
  photo: string | null;
  hostel: string;
  fromAt: string;
  toAt: string;
  reason: string;
  escort: string | null;
  destination: string | null;
  status: 'pending' | 'approved' | 'rejected' | 'out' | 'returned' | 'cancelled';
  passCode: string | null;
  requestedBy: string;
  answeredBy: string;
  answer: string | null;
  outAt: string | null;
  inAt: string | null;
  late: boolean;
}
export interface Medical {
  id: string;
  studentId: string;
  student: string;
  at: string;
  complaint: string;
  treatment: string | null;
  medicine: string | null;
  referred: boolean;
  parentTold: boolean;
}
export interface Note {
  id: string;
  at: string;
  kind: 'inspection' | 'fine';
  note: string;
  fine: number | null;
  student: string | null;
  room: string | null;
}
export interface Visitor {
  id: string;
  studentId: string;
  name: string;
  relation: string | null;
  phone: string | null;
}
export interface FoundStudent {
  id: string;
  name: string;
  admissionNo: string;
  section: string;
  current: string | null;
}
export interface MyChild {
  studentId: string;
  name: string;
  hostel: string;
  hostelPhone: string | null;
  warden: { name: string; phone: string | null } | null;
  room: string;
  bed: number;
  since: string;
  roommates: string[];
  leaves: Leave[];
  medical: Medical[];
  visitors: Visitor[];
  nights: { date: string; mark: string }[];
}

export type HostelInput = { name: string; gender: Hostel['gender']; wardenId: string | null; phone: string | null; isActive: boolean };
export type RoomInput = { block: string | null; floor: number; number: string; roomTypeId: string | null; beds: number; isActive: boolean };
export type LeaveInput = { studentId: string; fromAt: string; toAt: string; reason: string; escort?: string | null; destination?: string | null };

export const hostelApi = {
  list: () => api.get<{ hostels: Hostel[]; staff: { id: string; name: string }[]; roomTypes: RoomType[] }>('/hostel'),
  save: (id: string | null, b: HostelInput) => (id ? api.put<Hostel>(`/hostel/${id}`, b) : api.post<Hostel>('/hostel', b)),
  rooms: (id: string) => api.get<{ hostel: Hostel; rooms: Room[] }>(`/hostel/${id}/rooms`),
  saveRoom: (hostelId: string, id: string | null, b: RoomInput) => (id ? api.put(`/hostel/${hostelId}/rooms/${id}`, b) : api.post(`/hostel/${hostelId}/rooms`, b)),
  addRooms: (hostelId: string, b: { block: string | null; floor: number; from: number; to: number; prefix: string; roomTypeId: string | null; beds: number }) => api.post<{ added: number }>(`/hostel/${hostelId}/rooms/bulk`, b),
  deleteRoom: (hostelId: string, id: string) => api.delete<{ deactivated: boolean }>(`/hostel/${hostelId}/rooms/${id}`),
  findStudents: (q: string) => api.get<FoundStudent[]>('/hostel/find/students', { params: { q }, quiet: true }),
  allot: (b: { studentId: string; roomId: string; bed: number; fromDate: string; note?: string | null }) => api.post<{ id: string; moved: boolean }>('/hostel/allot', b),
  vacate: (id: string, date: string, note: string | null) => api.post(`/hostel/allotments/${id}/vacate`, { date, note }),
  rollCall: (id: string, date: string) => api.get<{ taken: boolean; takenAt: string | null; boarders: Boarder[] }>(`/hostel/${id}/roll-call`, { params: { date } }),
  saveRollCall: (id: string, date: string, marks: Record<string, string>) => api.put<{ saved: boolean; absent: number }>(`/hostel/${id}/roll-call`, { date, marks }),
  leaves: (show: string) => api.get<Leave[]>('/hostel/leave/list', { params: { show } }),
  addLeave: (b: LeaveInput) => api.post<{ id: string; status: string; passCode: string }>('/hostel/leave', b),
  answerLeave: (id: string, approve: boolean, answer: string | null) => api.post(`/hostel/leave/${id}/answer`, { approve, answer }),
  cancelLeave: (id: string) => api.post(`/hostel/leave/${id}/cancel`),
  scan: (code: string) => api.post<{ action: 'out' | 'in'; leave: Leave }>('/hostel/gate/scan', { code }),
  out: () => api.get<Leave[]>('/hostel/gate/out'),
  visitors: (studentId: string) => api.get<Visitor[]>(`/hostel/visitors/${studentId}`),
  addVisitor: (b: { studentId: string; name: string; relation: string | null; phone: string | null }) => api.post<Visitor[]>('/hostel/visitors', b),
  removeVisitor: (id: string) => api.delete<Visitor[]>(`/hostel/visitors/${id}`),
  medical: () => api.get<Medical[]>('/hostel/care/medical'),
  addMedical: (b: { studentId: string; complaint: string; treatment: string | null; medicine: string | null; referred: boolean; tellParent: boolean }) => api.post('/hostel/care/medical', b),
  notes: (hostelId: string) => api.get<Note[]>(`/hostel/${hostelId}/notes`),
  addNote: (b: { hostelId: string; roomId: string | null; studentId: string | null; kind: 'inspection' | 'fine'; note: string; fine: number | null }) => api.post<Note[]>('/hostel/notes', b),
  mine: () => api.get<{ parentLeave: boolean; children: MyChild[] }>('/hostel/mine/view'),
  askLeave: (b: LeaveInput) => api.post<{ id: string; status: string }>('/hostel/mine/leave', b),
};

export const todayISO = () => new Date(Date.now() + 5.5 * 3_600_000).toISOString().slice(0, 10);
export const when = (d: string | null) => (d ? new Date(d).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '—');
/** A datetime-local value (IST) as an ISO string with the +05:30 offset. */
export const istIso = (local: string) => `${local}:00+05:30`;
export const LEAVE_STATUS: Record<Leave['status'], { label: string; tone: 'neutral' | 'success' | 'warning' | 'danger' | 'primary' }> = {
  pending: { label: 'Waiting', tone: 'warning' },
  approved: { label: 'Approved', tone: 'success' },
  rejected: { label: 'Not approved', tone: 'danger' },
  out: { label: 'Out', tone: 'primary' },
  returned: { label: 'Back', tone: 'neutral' },
  cancelled: { label: 'Cancelled', tone: 'neutral' },
};
