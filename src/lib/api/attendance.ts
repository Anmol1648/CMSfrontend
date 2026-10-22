import { api } from './client';

/** Attendance (cmsbackend/src/modules/attendance): student registers, the school calendar, staff check-in. */

/** day; am / pm (twice a day); p1, p2… (every period). */
export type Slot = string;

export interface AttendanceStatus {
  id: string;
  name: string;
  code: string;
  /** 1 present, 0.5 half, 0 absent. */
  present: number;
  /** Left out of the % (approved leave). */
  excused: boolean;
}

export interface Register {
  section: { id: string; label: string; className: string; classTeacher: string | null; year: string };
  date: string;
  slot: Slot;
  slots: { value: Slot; label: string }[];
  /** Every period: the period's subject, time and teacher. */
  period: { label: string; subject: string; time: string | null; teacher: string | null } | null;
  dayOff: string | null;
  editable: boolean;
  reason: string | null;
  statuses: AttendanceStatus[];
  defaultStatusId: string | null;
  marked: { at: string; by: string | null; changedAt: string | null; changedBy: string | null } | null;
  students: { id: string; name: string; admissionNo: string; roll: number | null; statusId: string | null; note: string | null; leave: { statusId: string | null; kind: string; kindName: string; reason: string } | null }[];
}

export interface Overview {
  date: string;
  dayOff: string | null;
  slots: { value: Slot; label: string }[];
  sections: {
    id: string;
    label: string;
    classTeacher: string | null;
    students: number;
    canMark?: boolean;
    slots: ({ slot: Slot; marked: false; total?: number; done?: number } | { slot: Slot; marked: boolean; present: number; absent: number; leave: number; markedBy: string | null; markedAt: string; total?: number; done?: number })[];
  }[];
  mode?: string;
  totals: { sections: number; marked: number; notMarked: number };
}

export interface Holidays {
  year: { id: string; name: string; from: string; to: string };
  holidays: { id: string; date: string; name: string; forStudents: boolean; forStaff: boolean }[];
  counts: { days: number; weeklyOff: number; holidays: number; schoolDays: number };
}

export interface Summary {
  days: number;
  present: number;
  absent: number;
  excused: number;
  percent: number | null;
}

export interface MyAttendance {
  children: { id: string; name: string; admissionNo: string }[];
  student: { id: string; name: string; admissionNo: string; section: string | null; roll: number | null } | null;
  month?: string;
  days?: { date: string; off: string | null; future: boolean; leave: { status: 'pending' | 'approved'; kind: string; kindName: string; reason: string } | null; marks: { slot: Slot; code: string; name: string; present: number; excused: boolean; note: string | null }[] }[];
  statuses?: Omit<AttendanceStatus, 'id'>[];
  monthSummary?: Summary;
  yearSummary?: Summary & { from: string; year: string };
  minPercent?: number;
}

export interface StaffRecord {
  id?: string | null;
  checkIn: string | null;
  checkOut: string | null;
  late: boolean;
  earlyOut: boolean;
  source: string | null;
  note: string | null;
  status: { name: string; code: string } | null;
  /** null = fine; pending = waits for the office; approved / rejected. */
  approval?: "pending" | "approved" | "rejected" | null;
  reasons?: string[];
  photoIn?: string | null;
  photoOut?: string | null;
  distance?: number | null;
  faceDistance?: number | null;
}

export interface MyDay {
  staff: { name: string; employeeCode: string };
  /** Which checks the school uses at check-in, and the person's face enrolment. */
  checks: { photo: boolean; face: boolean; liveness: boolean; location: boolean; phoneLock: boolean; enrolled: "approved" | "pending" | null; canEnrol: boolean };
  today: string;
  shift: { start: string; end: string; grace: number };
  day: StaffRecord | null;
  canCheckIn: boolean;
  canCheckOut: boolean;
  reason: string | null;
  month: (StaffRecord & { date: string; off: string | null })[];
}

export interface StaffDay {
  date: string;
  dayOff: string | null;
  isToday: boolean;
  staff: { id: string; employeeCode: string; name: string; designation: string | null; department: string | null; record: StaffRecord | null }[];
  totals: { staff: number; in: number; late: number; notIn: number };
}

export const attendanceApi = {
  statuses: () => api.get<AttendanceStatus[]>('/attendance/statuses'),
  sections: () => api.get<{ id: string; label: string; mine: boolean }[]>('/attendance/sections'),
  register: (section: string, date: string, slot?: Slot) => api.get<Register>('/attendance/register', { params: { section, date, ...(slot ? { slot } : {}) } }),
  save: (input: { section: string; date: string; slot: Slot; marks: { studentId: string; statusId: string; note?: string }[] }) => api.put<Register>('/attendance/register', input),
  students: (q: { section?: string; search?: string }) =>
    api.get<{ sections: { id: string; label: string }[]; section: string | null; minPercent: number; students: { id: string; name: string; admissionNo: string; roll: number | null; section: string; month: Summary; session: Summary }[] }>('/attendance/students', { params: q }),
  student: (student: string, month: string) => api.get<MyAttendance>('/attendance/student', { params: { student, month } }),
  overview: (date: string) => api.get<Overview>('/attendance/overview', { params: { date } }),
  holidays: (year?: string) => api.get<Holidays>('/attendance/holidays', { params: year ? { year } : {} }),
  addHoliday: (input: { from: string; to?: string; name: string; forStudents: boolean; forStaff: boolean }) => api.post<{ days: number }>('/attendance/holidays', input),
  deleteHoliday: (id: string) => api.delete<null>(`/attendance/holidays/${id}`),
  mine: (q: { student?: string; month?: string }) => api.get<MyAttendance>('/attendance/me', { params: q }),
  myDay: () => api.get<MyDay>('/attendance/staff/me'),
  checkIn: (input: CheckInInput = {}) => api.post<MyDay>('/attendance/staff/check-in', input, { timeout: 90_000 }),
  checkOut: (input: CheckInInput = {}) => api.post<MyDay>('/attendance/staff/check-out', input, { timeout: 90_000 }),
  staffDay: (date: string) => api.get<StaffDay>('/attendance/staff/day', { params: { date } }),
  correct: (staffId: string, input: { date: string; checkIn?: string | null; checkOut?: string | null; statusId?: string | null; note?: string }) => api.put<StaffDay>(`/attendance/staff/${staffId}`, input),
};

/** The colour of a status chip, by its code (unknown codes are grey). */
export const statusTone = (code: string | undefined) => {
  switch ((code ?? '').toUpperCase()) {
    case 'P':
      return 'bg-emerald-100 text-emerald-800 border-emerald-300';
    case 'A':
      return 'bg-red-100 text-red-700 border-red-300';
    case 'LT':
      return 'bg-amber-100 text-amber-800 border-amber-300';
    case 'HD':
      return 'bg-orange-100 text-orange-800 border-orange-300';
    case 'LV':
    case 'ML':
      return 'bg-sky-100 text-sky-800 border-sky-300';
    default:
      return 'bg-surface-container text-on-surface-variant border-outline-variant/40';
  }
};

/** Today in India (the school's day), as YYYY-MM-DD. */
export const todayIST = () => new Date(Date.now() + 5.5 * 3600_000).toISOString().slice(0, 10);
export const showDay = (iso: string, opts: Intl.DateTimeFormatOptions = { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) => new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-IN', { ...opts, timeZone: 'UTC' });

// ─── Period mode, leave, staff requests ──────────────────────────────────────

export interface Lesson {
  sectionId: string;
  section: string;
  periodNo: number;
  slot: Slot;
  label: string;
  time: string | null;
  subject: string;
  substitute: boolean;
  marked: boolean;
}

export interface LeaveRequest {
  id: string;
  student: { id: string; name: string; admissionNo: string; section: string | null; roll: number | null };
  from: string;
  to: string;
  days: number;
  /** A student leave type's code (Masters → Student leave types). */
  kind: string;
  kindName: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  appliedBy: string | null;
  appliedAt: string;
  decidedBy: string | null;
  decidedAt: string | null;
  decisionNote: string | null;
}

export interface CorrectionRequest {
  id: string;
  staff: { id: string; name: string; employeeCode: string };
  date: string;
  checkIn: string | null;
  checkOut: string | null;
  recorded: { checkIn: string | null; checkOut: string | null };
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  askedAt: string;
  decidedBy: string | null;
  decidedAt: string | null;
  decisionNote: string | null;
}

export const leaveApi = {
  lessons: (date?: string) => api.get<{ mode: string; date: string; lessons: Lesson[] }>('/attendance/lessons', { params: date ? { date } : {} }),
  apply: (input: { student: string; from: string; to: string; kind: string; reason: string }) => api.post<LeaveRequest>('/attendance/leave', input),
  mine: (student: string) => api.get<{ canAsk: boolean; backDays: number; leaves: LeaveRequest[] }>('/attendance/leave/mine', { params: { student } }),
  cancel: (id: string) => api.post<null>(`/attendance/leave/${id}/cancel`),
  requests: (status: string) => api.get<LeaveRequest[]>('/attendance/leave', { params: { status } }),
  decide: (id: string, approve: boolean, note?: string) => api.post<LeaveRequest>(`/attendance/leave/${id}/decide`, { approve, ...(note ? { note } : {}) }),
  askCorrection: (input: { date: string; checkIn?: string; checkOut?: string; reason: string }) => api.post<CorrectionRequest[]>('/attendance/staff/requests', input),
  myCorrections: () => api.get<CorrectionRequest[]>('/attendance/staff/requests/mine'),
  corrections: (status: string) => api.get<CorrectionRequest[]>('/attendance/staff/requests', { params: { status } }),
  decideCorrection: (id: string, approve: boolean, note?: string) => api.post<CorrectionRequest[]>(`/attendance/staff/requests/${id}/decide`, { approve, ...(note ? { note } : {}) }),
};

export const LEAVE_STATUS: Record<LeaveRequest['status'], { label: string; tone: 'warning' | 'success' | 'danger' | 'neutral' }> = {
  pending: { label: 'Waiting', tone: 'warning' },
  approved: { label: 'Approved', tone: 'success' },
  rejected: { label: 'Not approved', tone: 'danger' },
  cancelled: { label: 'Cancelled', tone: 'neutral' },
};

// ─── Selfie, location and face checks ────────────────────────────────────────

export interface CheckInInput {
  /** data:image/jpeg;base64,… from the live camera. */
  photo?: string;
  /** Liveness: the second photo, head turned. */
  photo2?: string;
  /** This browser's id and what it is (registered-phone lock). */
  deviceId?: string;
  deviceLabel?: string;
  lat?: number;
  lng?: number;
  accuracy?: number;
}

export interface PendingCheckIn {
  id: string;
  staff: { id: string; name: string; employeeCode: string; facePhotoId: string | null };
  date: string;
  checkIn: string | null;
  checkOut: string | null;
  late: boolean;
  photoIn: string | null;
  photoOut: string | null;
  distance: number | null;
  accuracy: number | null;
  location: { lat: number; lng: number } | null;
  faceDistance: number | null;
  reasons: string[];
}

export interface StaffFaceRow {
  id: string;
  name: string;
  employeeCode: string;
  designation: string | null;
  face: { status: "approved" | "pending"; photoIds: string[]; enrolledAt: string } | null;
  phone: { label: string; registeredAt: string } | null;
}

export interface CheckInLocation {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  radius: number;
  isActive: boolean;
}

/** The address of a check-in / face photo (shown with authedImageUrl). */
export const photoPath = (fileId: string) => `/attendance/staff/photo/${fileId}`;

export const checkInApi = {
  pending: () => api.get<PendingCheckIn[]>('/attendance/staff/pending'),
  decide: (id: string, approve: boolean, note?: string) => api.post<PendingCheckIn[]>(`/attendance/staff/pending/${id}/decide`, { approve, ...(note ? { note } : {}) }),
  faces: () => api.get<StaffFaceRow[]>('/attendance/faces'),
  enrol: (staffId: string, photos: string[]) => api.post<StaffFaceRow[]>(`/attendance/faces/${staffId}`, { photos }, { timeout: 120_000 }),
  approveFace: (staffId: string) => api.post<StaffFaceRow[]>(`/attendance/faces/${staffId}/approve`),
  removeFace: (staffId: string) => api.delete<StaffFaceRow[]>(`/attendance/faces/${staffId}`),
  resetPhone: (staffId: string) => api.delete<StaffFaceRow[]>(`/attendance/phones/${staffId}`),
  myFace: () => api.get<{ face: { status: "approved" | "pending"; enrolledAt: string } | null; canEnrol: boolean }>('/attendance/my-face'),
  enrolSelf: (photos: string[]) => api.post<{ face: { status: "approved" | "pending"; enrolledAt: string } | null; canEnrol: boolean }>('/attendance/my-face', { photos }, { timeout: 120_000 }),
  locations: () => api.get<CheckInLocation[]>('/attendance/locations'),
  addLocation: (input: Omit<CheckInLocation, 'id'>) => api.post<CheckInLocation[]>('/attendance/locations', input),
  saveLocation: (id: string, input: Omit<CheckInLocation, 'id'>) => api.put<CheckInLocation[]>(`/attendance/locations/${id}`, input),
  deleteLocation: (id: string) => api.delete<CheckInLocation[]>(`/attendance/locations/${id}`),
};

/** The phone's location (null when it can't be had: refused, not available, too slow). */
export const currentPosition = (): Promise<{ lat: number; lng: number; accuracy: number } | null> =>
  new Promise((resolve) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude, accuracy: Math.round(p.coords.accuracy) }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 0 }
    );
  });

export const mapLink = (lat: number, lng: number) => `https://www.google.com/maps?q=${lat},${lng}`;

/** This browser's own random id (kept on the phone), for the registered-phone lock. */
export const browserId = () => {
  const KEY = 'erp-device-id';
  try {
    let id = localStorage.getItem(KEY);
    if (!id) {
      id = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`;
      localStorage.setItem(KEY, id);
    }
    return id;
  } catch {
    return undefined;
  }
};

/** "Chrome on Android", "Safari on iPhone"… */
export const browserLabel = () => {
  if (typeof navigator === 'undefined') return 'Phone';
  const ua = navigator.userAgent;
  const os = /Android/i.test(ua) ? 'Android' : /iPhone|iPad/i.test(ua) ? 'iPhone' : /Windows/i.test(ua) ? 'Windows' : /Mac OS/i.test(ua) ? 'Mac' : /Linux/i.test(ua) ? 'Linux' : 'device';
  const browser = /Edg\//.test(ua) ? 'Edge' : /OPR\//.test(ua) ? 'Opera' : /Chrome\//.test(ua) ? 'Chrome' : /Firefox\//.test(ua) ? 'Firefox' : /Safari\//.test(ua) ? 'Safari' : 'Browser';
  return `${browser} on ${os}`;
};

// ─── Attendance devices (machines / other systems) ──────────────────────────

export type DeviceKind = 'essl_adms' | 'webhook' | 'import';

export interface AttendanceDevice {
  id: string;
  name: string;
  kind: DeviceKind;
  serialNo: string | null;
  token: string;
  isActive: boolean;
  lastSeenAt: string | null;
  lastPunchAt: string | null;
  punches: number;
}

export const DEVICE_KINDS: Record<DeviceKind, string> = {
  essl_adms: 'Biometric machine (eSSL / ZKTeco, ADMS)',
  webhook: 'Another system (sends punches to a web address)',
  import: 'File import (export from a machine)',
};

export const devicesApi = {
  list: () => api.get<AttendanceDevice[]>('/attendance-devices'),
  add: (input: { name: string; kind: DeviceKind; serialNo?: string; isActive: boolean }) => api.post<AttendanceDevice[]>('/attendance-devices', input),
  save: (id: string, input: { name: string; kind: DeviceKind; serialNo?: string; isActive: boolean }) => api.put<AttendanceDevice[]>(`/attendance-devices/${id}`, input),
  newToken: (id: string) => api.post<AttendanceDevice[]>(`/attendance-devices/${id}/token`),
  remove: (id: string) => api.delete<AttendanceDevice[]>(`/attendance-devices/${id}`),
  numbers: () => api.get<{ staff: { id: string; name: string; employeeCode: string; deviceUserId: string | null }[]; unmatched: { deviceUserId: string; punches: number; lastAt: string | null }[] }>('/attendance-devices/numbers'),
  setNumber: (staffId: string, deviceUserId: string | null) => api.put<{ staff: { id: string; name: string; employeeCode: string; deviceUserId: string | null }[]; unmatched: { deviceUserId: string; punches: number; lastAt: string | null }[] }>(`/attendance-devices/numbers/${staffId}`, { deviceUserId }),
  punches: () => api.get<{ id: string; at: string; deviceUserId: string; staff: string | null; device: string }[]>('/attendance-devices/punches'),
  importText: (text: string, deviceId?: string) => api.post<{ received: number; added: number; unmatched: number; lines: number; unreadable: number }>('/attendance-devices/import', { text, ...(deviceId ? { deviceId } : {}) }, { timeout: 120_000 }),
};
