import { api, downloadFile } from './client';

/** Payroll (cmsbackend/src/modules/payroll). */

export type Mode = 'fixed' | 'pct_basic' | 'pct_basic_da';
export type Line = { headId: string; mode: Mode; value: number };
export interface Head {
  id: string;
  name: string;
  code: string;
  kind: 'earning' | 'deduction';
  pf: boolean;
}
export interface Structure {
  id: string;
  name: string;
  lines: Line[];
  isActive: boolean;
}
export interface Amount {
  code: string;
  name: string;
  full?: number;
  amount: number;
}
export interface SalaryRow {
  staffId: string;
  name: string;
  employeeCode: string;
  designation: string;
  department: string;
  bank: boolean;
  salary: { id: string; basic: number; gross: number; structure: string; effectiveFrom: string; pf: boolean; esi: boolean; tds: number } | null;
}
export interface SalaryHistory {
  id: string;
  structureId: string | null;
  effectiveFrom: string;
  basic: number;
  lines: Line[];
  tdsMonthly: number;
  pf: boolean;
  esi: boolean;
  esiNumber: string | null;
  reason: string;
  note: string | null;
  earnings: Amount[];
  deductions: Amount[];
  gross: number;
}
export interface Slip {
  id: string;
  staffId: string;
  name: string;
  employeeCode: string;
  department: string;
  designation: string;
  totalDays: number;
  paidDays: number;
  days: Record<string, number>;
  earnings: Amount[];
  deductions: Amount[];
  employer: Record<string, number>;
  gross: number;
  deducted: number;
  net: number;
  bank: { bank: string; accountNo: string; ifsc: string };
  warnings: string[];
}
export interface RunView {
  month: string;
  label: string;
  run: { id: string; status: 'prepared' | 'approved' | 'finalised'; totalDays: number; preparedBy: string; preparedAt: string; approvedBy: string; approvedAt: string | null; finalisedAt: string | null; reopenReason: string | null } | null;
  slips: Slip[];
  totals: { staff: number; gross: number; deducted: number; net: number; pfEmployee: number; pfEmployer: number; esiEmployee: number; esiEmployer: number; tds: number; warnings: number } | null;
  missing: string[];
}
export interface Loan {
  id: string;
  staffId: string;
  name: string;
  employeeCode: string;
  kind: 'loan' | 'advance';
  amount: number;
  emi: number;
  startMonth: string;
  balance: number;
  status: 'active' | 'closed';
  note: string | null;
  paid: number;
  left: number;
}

export const payrollApi = {
  heads: () => api.get<{ heads: Head[]; ptStates: { value: string; label: string; slabs: { upto: number | null; tax: number }[] }[] }>('/payroll/heads'),
  structures: () => api.get<Structure[]>('/payroll/structures'),
  saveStructure: (id: string | null, input: { name: string; lines: Line[]; isActive: boolean }) => (id ? api.put<Structure[]>(`/payroll/structures/${id}`, input) : api.post<Structure[]>('/payroll/structures', input)),
  deleteStructure: (id: string) => api.delete<Structure[]>(`/payroll/structures/${id}`),
  salaries: () => api.get<SalaryRow[]>('/payroll/salaries'),
  salary: (staffId: string) => api.get<{ staff: { id: string; name: string; employeeCode: string; bank: string | null; pan: string | null; uan: string | null; pfNumber: string | null }; history: SalaryHistory[] }>(`/payroll/salaries/${staffId}`),
  saveSalary: (staffId: string, input: { structureId: string | null; effectiveFrom: string; basic: number; lines: Line[]; tdsMonthly: number; pf: boolean; esi: boolean; esiNumber: string | null; reason: 'new' | 'revision' | 'increment'; note: string | null }) => api.post<{ id: string; arrears: number }>(`/payroll/salaries/${staffId}`, input),
  preview: (basic: number, lines: Line[]) => api.post<{ earnings: Amount[]; deductions: Amount[]; gross: number }>('/payroll/preview', { basic, lines }, { quiet: true } as never),
  increments: (input: { staffIds: string[]; effectiveFrom: string; percent: number; amount: number; note: string | null }) => api.post<{ done: number; skipped: number; arrears: number }>('/payroll/increments', input),
  runs: () => api.get<{ month: string; label: string; status: string; staff: number; gross: number; net: number; finalisedAt: string | null }[]>('/payroll/runs'),
  run: (month: string) => api.get<RunView>(`/payroll/runs/${month}`),
  prepare: (month: string) => api.post<RunView>(`/payroll/runs/${month}/prepare`, undefined, { timeout: 120_000 }),
  approve: (month: string) => api.post<RunView>(`/payroll/runs/${month}/approve`),
  finalise: (month: string) => api.post<RunView>(`/payroll/runs/${month}/finalise`),
  reopen: (month: string, reason: string) => api.post<RunView>(`/payroll/runs/${month}/reopen`, { reason }),
  download: (month: string, file: 'bank.xlsx' | 'register.xlsx' | 'esi.xlsx' | 'pf-ecr.txt') => downloadFile(`/payroll/runs/${month}/${file}`, undefined, `${file.replace('.', `-${month}.`)}`),
  pfMissing: (month: string) => api.get<string[]>(`/payroll/runs/${month}/pf-missing`, { quiet: true } as never),
  adjustments: (month: string) => api.get<{ id: string; staffId: string; name: string; month: string; kind: 'earning' | 'deduction'; label: string; amount: number; source: string }[]>(`/payroll/adjustments/${month}`),
  addAdjustment: (input: { staffId: string; month: string; kind: 'earning' | 'deduction'; label: string; amount: number }) => api.post('/payroll/adjustments', input),
  deleteAdjustment: (id: string) => api.delete(`/payroll/adjustments/${id}`),
  loans: () => api.get<Loan[]>('/payroll/loans'),
  giveLoan: (input: { staffId: string; kind: 'loan' | 'advance'; amount: number; emi: number; startMonth: string; note: string | null }) => api.post<Loan[]>('/payroll/loans', input),
  closeLoan: (id: string) => api.post<Loan[]>(`/payroll/loans/${id}/close`),
  mine: () => api.get<{ slips: { id: string; month: string; label: string; gross: number; deducted: number; net: number; paidDays: number; totalDays: number }[]; loans: { id: string; kind: string; amount: number; emi: number; balance: number; status: string; startMonth: string }[] }>('/payroll/mine'),
};

export const RUN: Record<string, { label: string; tone: 'warning' | 'primary' | 'success' }> = { prepared: { label: 'Waiting for approval', tone: 'warning' }, approved: { label: 'Approved: finalise to lock', tone: 'primary' }, finalised: { label: 'Finalised', tone: 'success' } };
export const MODES: { value: Mode; label: string }[] = [
  { value: 'fixed', label: '₹ a month' },
  { value: 'pct_basic', label: '% of basic' },
  { value: 'pct_basic_da', label: '% of basic + DA' },
];
export const inr = (n: number | null | undefined) => (n == null ? '—' : `₹${Number(n).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`);
export const thisMonth = () => new Date(Date.now() + 5.5 * 3_600_000).toISOString().slice(0, 7);
export const monthName = (m: string) => new Date(`${m}-01T00:00:00`).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
