import { api, uploadFile } from './client';

/** Staff leave (cmsbackend/src/modules/leave): types and rules, asking, approving, balances, year end. */

export interface LeaveYear {
  start: string;
  end: string;
  name: string;
}

export interface LeaveType {
  id: string;
  code: string;
  name: string;
  sortOrder: number;
  isActive: boolean;
  quota: number | null;
  credit: 'yearly' | 'monthly' | 'none';
  prorate: boolean;
  carryForward: 'none' | 'all' | 'upto';
  carryMax: number | null;
  halfDay: boolean;
  minDays: number | null;
  maxDays: number | null;
  noticeDays: number;
  backDays: number;
  certificateAfter: number | null;
  overdraw: 'block' | 'lwp' | 'allow';
  sandwich: boolean;
  paid: boolean;
  countsPresent: boolean;
  attendanceCode: string;
  staffTypeIds: string[];
  employmentTypeIds: string[];
  genderIds: string[];
  approval: 'default' | 'reports_to' | 'two_level' | 'office';
  isCompOff: boolean;
  compOffDays: number | null;
}
export type LeaveTypeInput = Omit<LeaveType, 'id' | 'sortOrder'>;

export interface Balance {
  typeId: string;
  code: string;
  name: string;
  unlimited: boolean;
  isCompOff: boolean;
  credited: number;
  carried: number;
  adjusted: number;
  earned: number;
  taken: number;
  pending: number;
  balance: number;
  available: number;
}

export type LeaveStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

export interface StaffLeave {
  id: string;
  staff: { id: string; name: string; employeeCode: string | null; designation: string | null; department: string | null };
  type: { id: string; code: string; name: string; paid: boolean };
  from: string;
  to: string;
  half: 'first' | 'second' | null;
  days: number;
  lwpDays: number;
  reason: string;
  hasAttachment: boolean;
  status: LeaveStatus;
  stage: number;
  waitingFor: string | null;
  twoSteps: boolean;
  appliedBy: string | null;
  appliedAt: string;
  first: { by: string | null; at: string; note: string | null } | null;
  decided: { by: string | null; at: string; note: string | null } | null;
  cancelled: { by: string | null; at: string } | null;
  canCancel: boolean;
  canDecide: boolean;
}

export interface ApprovalItem extends StaffLeave {
  balance: Balance | null;
  away: { name: string; department: string | null; from: string; to: string; status: LeaveStatus }[];
  periods: number;
}

export interface TypeRules {
  id: string;
  code: string;
  name: string;
  halfDay: boolean;
  limited: boolean;
  certificateAfter: number | null;
  rules: string[];
}

export interface MyLeave {
  staff: { id: string; name: string; employeeCode: string | null; reportsTo: string | null };
  year: LeaveYear;
  today: string;
  balances: Balance[];
  types: TypeRules[];
  leaves: StaffLeave[];
}

export interface ApplyInput {
  staffId?: string;
  typeId: string;
  from: string;
  to: string;
  half?: 'first' | 'second' | null;
  reason: string;
  attachmentId?: string | null;
}

export interface BalanceSheet {
  year: LeaveYear;
  types: { id: string; code: string; name: string; unlimited: boolean; isCompOff: boolean }[];
  staff: { id: string; name: string; employeeCode: string | null; designation: string | null; department: string | null; balances: Balance[] }[];
}

export interface StaffBalance {
  year: LeaveYear;
  staff: { id: string; name: string; employeeCode: string | null; joiningDate: string };
  balances: Balance[];
  entries: { id: string; type: string; kind: 'carry' | 'adjust' | 'compoff'; days: number; workedOn: string | null; expiresOn: string | null; note: string | null; by: string | null; at: string }[];
}

export interface YearEnd {
  year: LeaveYear;
  next: LeaveYear;
  done: boolean;
  types: { code: string; name: string; rule: string }[];
  rows: { staffId: string; name: string; employeeCode: string | null; typeId: string; type: string; code: string; balance: number; carry: number; lapse: number }[];
  totals: { carry: number; lapse: number };
}

export interface Away {
  date: string;
  dayOff: string | null;
  away: { staffId: string; name: string; employeeCode: string | null; designation: string | null; type: string; code: string; half: string | null; status: LeaveStatus; from: string; to: string }[];
}

export const leaveApi = {
  years: () => api.get<{ current: LeaveYear; years: LeaveYear[] }>('/leave/years'),
  types: () => api.get<LeaveType[]>('/leave/types'),
  addType: (input: LeaveTypeInput) => api.post<LeaveType[]>('/leave/types', input),
  saveType: (id: string, input: LeaveTypeInput) => api.put<LeaveType[]>(`/leave/types/${id}`, input),
  moveType: (id: string, direction: 'up' | 'down') => api.post<LeaveType[]>(`/leave/types/${id}/move`, { direction }),
  removeType: (id: string) => api.delete<LeaveType[]>(`/leave/types/${id}`),

  mine: (year?: string) => api.get<MyLeave>('/leave/mine', { params: year ? { year } : {} }),
  preview: (input: ApplyInput) => api.postRead<{ ok: boolean; days: number | null; lwpDays: number; available: number | null; message: string | null }>('/leave/preview', input, { quiet: true }),
  apply: (input: ApplyInput) => api.post<StaffLeave>('/leave', input),
  upload: (file: File) => uploadFile<{ id: string; name: string }>('/leave/attachments', 'file', file),
  cancel: (id: string) => api.post<StaffLeave>(`/leave/${id}/cancel`),
  attachmentPath: (id: string) => `/leave/${id}/attachment`,

  approvals: (status: 'pending' | 'decided') => api.get<ApprovalItem[]>('/leave/approvals', { params: { status } }),
  decide: (id: string, approve: boolean, note?: string) => api.post<StaffLeave>(`/leave/${id}/decide`, { approve, ...(note ? { note } : {}) }),

  register: (q: { from?: string; to?: string; status?: string; type?: string; search?: string }) => api.get<{ from: string; to: string; leaves: StaffLeave[] }>('/leave/register', { params: Object.fromEntries(Object.entries(q).filter(([, v]) => v)) }),
  away: (date?: string) => api.get<Away>('/leave/away', { params: date ? { date } : {} }),
  balances: (q: { year?: string; search?: string }) => api.get<BalanceSheet>('/leave/balances', { params: Object.fromEntries(Object.entries(q).filter(([, v]) => v)) }),
  staffBalance: (staffId: string, year?: string) => api.get<StaffBalance>(`/leave/balances/${staffId}`, { params: year ? { year } : {} }),
  adjust: (input: { staffId: string; typeId: string; year?: string; days: number; note: string }) => api.post<StaffBalance>('/leave/adjustments', input),
  compOff: (input: { staffId: string; workedOn: string; days: 1 | 0.5; note?: string }) => api.post<StaffBalance>('/leave/comp-offs', input),
  compOffSuggestions: () => api.get<{ staffId: string; name: string; employeeCode: string | null; date: string; dayOff: string }[]>('/leave/comp-offs/suggestions'),
  removeEntry: (id: string) => api.delete<StaffBalance>(`/leave/entries/${id}`),
  yearEnd: (year: string) => api.get<YearEnd>('/leave/year-end', { params: { year } }),
  closeYear: (year: string) => api.post<YearEnd>('/leave/year-end', { year }),
  undoYear: (year: string) => api.post<YearEnd>('/leave/year-end/undo', { year }),
};

export const LEAVE_STATUS: Record<LeaveStatus, { label: string; tone: 'warning' | 'success' | 'danger' | 'neutral' }> = {
  pending: { label: 'Waiting', tone: 'warning' },
  approved: { label: 'Approved', tone: 'success' },
  rejected: { label: 'Not approved', tone: 'danger' },
  cancelled: { label: 'Cancelled', tone: 'neutral' },
};

const day = (iso: string, opts: Intl.DateTimeFormatOptions) => new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-IN', { ...opts, timeZone: 'UTC' });
/** "12 Nov 2026" or "12 – 14 Nov 2026", with the half day. */
export const leaveDates = (l: { from: string; to: string; half?: string | null }) =>
  (l.from === l.to ? day(l.from, { day: 'numeric', month: 'short', year: 'numeric' }) : `${day(l.from, { day: 'numeric', month: 'short' })} – ${day(l.to, { day: 'numeric', month: 'short', year: 'numeric' })}`) + (l.half ? ` (${l.half} half)` : '');
export const dayCount = (n: number) => `${n} day${n === 1 ? '' : 's'}`;
