import { api, uploadFile } from './client';

/** Accounts (cmsbackend/src/modules/accounts). */

export type Nature = 'asset' | 'liability' | 'income' | 'expense';
export type VType = 'receipt' | 'payment' | 'contra' | 'journal';
export interface Group {
  id: string;
  name: string;
  nature: Nature;
  parentId: string | null;
  sortOrder: number;
  systemKey: string | null;
}
export interface Ledger {
  id: string;
  groupId: string;
  name: string;
  code: string | null;
  kind: 'cash' | 'bank' | 'other';
  details: { bank?: string; accountNo?: string; ifsc?: string; branch?: string };
  isDefault: boolean;
  systemKey: string | null;
  isActive: boolean;
  nature: Nature;
}
export interface VoucherRow {
  id: string;
  type: VType;
  number: string;
  date: string;
  narration: string | null;
  reference: string | null;
  total: number;
  status: 'posted' | 'pending' | 'cancelled';
  source: string;
  debits: string[];
  credits: string[];
}
export interface Voucher {
  id: string;
  type: VType;
  number: string;
  date: string;
  narration: string | null;
  reference: string | null;
  total: number;
  status: 'posted' | 'pending' | 'cancelled';
  source: string;
  attachmentId: string | null;
  cancelReason: string | null;
  createdByName: string;
  approvedByName: string;
  entries: { id: string; ledgerId: string; ledger: string; dr: number; cr: number; note: string | null; reconciledOn: string | null }[];
}
export interface Statement {
  ledger: { id: string; name: string; kind: string; group: string; nature: Nature };
  from: string;
  to: string;
  opening: number;
  rows: { voucherId: string; date: string; number: string; type: VType; against: string; narration: string | null; dr: number; cr: number; balance: number }[];
  closing: number;
  totalDr: number;
  totalCr: number;
}
type Amt = { name: string; group?: string; amount: number };

export const accApi = {
  chart: () => api.get<{ groups: Group[]; ledgers: Ledger[] }>('/accounts/chart'),
  saveGroup: (id: string | null, input: { name: string; nature: Nature; parentId: string | null }) => (id ? api.put(`/accounts/groups/${id}`, input) : api.post('/accounts/groups', input)),
  saveLedger: (id: string | null, input: { name: string; groupId: string; code: string | null; kind: 'cash' | 'bank' | 'other'; details: Ledger['details']; isDefault: boolean; isActive: boolean }) => (id ? api.put(`/accounts/ledgers/${id}`, input) : api.post('/accounts/ledgers', input)),
  years: () => api.get<{ id: string; start: string; end: string; status: 'open' | 'closed'; closedAt: string | null; openings: Record<string, number>; budgets: Record<string, number> }[]>('/accounts/years'),
  saveOpenings: (yearStart: string, openings: Record<string, number>) => api.put<{ saved: boolean; difference: number }>('/accounts/openings', { yearStart, openings }),
  saveBudgets: (yearStart: string, budgets: Record<string, number>) => api.put('/accounts/budgets', { yearStart, budgets }),
  closeYear: (start: string) => api.post('/accounts/years/close', { start }),
  upload: (file: File) => uploadFile<{ id: string; name: string }>('/accounts/files', 'file', file),
  filePath: (id: string) => `/accounts/files/${id}`,
  vouchers: (q: { from: string; to: string; type?: string; status?: string; source?: string; search?: string }) => api.get<VoucherRow[]>('/accounts/vouchers', { params: Object.fromEntries(Object.entries(q).filter(([, v]) => v)) }),
  voucher: (id: string) => api.get<Voucher>(`/accounts/vouchers/${id}`),
  createVoucher: (input: { type: VType; date: string; narration: string | null; reference: string | null; attachmentId: string | null; lines: { ledgerId: string; dr: number; cr: number; note: string | null }[] }) => api.post<{ id: string; number: string; status: string }>('/accounts/vouchers', input),
  approve: (id: string, approve: boolean, reason: string | null) => api.post<Voucher>(`/accounts/vouchers/${id}/approve`, { approve, reason }),
  cancel: (id: string, reason: string) => api.post<Voucher>(`/accounts/vouchers/${id}/cancel`, { reason }),
  post: (from?: string) => api.post<{ fees: { made: number; updated: number } | null; payroll: { made: number } | null; store: { made: number } | null; loans: { made: number } | null }>('/accounts/post', { from }, { timeout: 180_000 }),
  salaryMonths: () => api.get<{ month: string; paid: boolean }[]>('/accounts/salary-months'),
  salaryPaid: (input: { month: string; date: string; bankLedgerId: string | null; reference: string | null }) => api.post('/accounts/salary-paid', input),
  money: () => api.get<{ rows: { id: string; name: string; kind: string; balance: number }[]; cash: number; bank: number; cashWarning: number | null; pending: number }>('/accounts/money'),
  dayBook: (from: string, to: string) => api.get<{ id: string; date: string; number: string; type: VType; narration: string | null; total: number; lines: { ledger: string; dr: number; cr: number }[] }[]>('/accounts/daybook', { params: { from, to } }),
  ledger: (id: string, from: string, to: string) => api.get<Statement>(`/accounts/ledger/${id}`, { params: { from, to } }),
  trialBalance: (asOf: string) => api.get<{ asOf: string; rows: { id: string; name: string; group: string; top: string; nature: Nature; dr: number; cr: number }[]; totalDr: number; totalCr: number }>('/accounts/trial-balance', { params: { asOf } }),
  incomeExpenditure: (from: string, to: string) => api.get<{ income: Amt[]; expense: Amt[]; totalIncome: number; totalExpense: number; surplus: number }>('/accounts/income-expenditure', { params: { from, to } }),
  balanceSheet: (asOf: string) => api.get<{ assets: Amt[]; liabilities: Amt[]; totalAssets: number; totalLiabilities: number; difference: number }>('/accounts/balance-sheet', { params: { asOf } }),
  receiptsPayments: (from: string, to: string) => api.get<{ opening: Amt[]; openingTotal: number; receipts: Amt[]; payments: Amt[]; totalReceipts: number; totalPayments: number; closing: number }>('/accounts/receipts-payments', { params: { from, to } }),
  budget: (start: string) => api.get<{ ledgerId: string; name: string; group: string; budget: number; actual: number; left: number; used: number | null }[]>('/accounts/budget', { params: { start } }),
  payables: () => api.get<{ ledgerId: string; name: string; owed: number }[]>('/accounts/payables'),
  bank: (ledgerId: string, upTo: string, show: 'open' | 'all') => api.get<{ ledger: { id: string; name: string }; upTo: string; books: number; notInBank: number; bank: number; rows: { id: string; date: string; number: string; narration: string | null; reference: string | null; deposit: number; withdrawal: number; reconciledOn: string | null }[] }>(`/accounts/bank/${ledgerId}`, { params: { upTo, show } }),
  reconcile: (entryIds: string[], date: string | null) => api.post('/accounts/bank/reconcile', { entryIds, date }),
  statement: (ledgerId: string, file: File) => uploadFile<{ lines: { date: string; description: string; deposit: number; withdrawal: number; entryId: string | null; voucher: string | null }[]; matched: number }>(`/accounts/bank/${ledgerId}/statement`, 'file', file),
};

export const VT: Record<VType, { label: string; tone: 'success' | 'danger' | 'primary' | 'neutral' }> = { receipt: { label: 'Receipt', tone: 'success' }, payment: { label: 'Payment', tone: 'danger' }, contra: { label: 'Contra', tone: 'primary' }, journal: { label: 'Journal', tone: 'neutral' } };
export const SRC: Record<string, string> = { manual: 'By hand', fees: 'Fees', payroll: 'Payroll', salary_paid: 'Salary paid', store: 'Store', loan: 'Staff loan' };
export const inr = (n: number | null | undefined) => (n == null ? '—' : `₹${Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
export const drcr = (n: number) => (Math.abs(n) < 0.005 ? '₹0.00' : `${inr(Math.abs(n))} ${n > 0 ? 'Dr' : 'Cr'}`);
export const todayISO = () => new Date(Date.now() + 5.5 * 3_600_000).toISOString().slice(0, 10);
export const fyStartISO = (startMonth = 4) => {
  const t = todayISO();
  const y = Number(t.slice(5, 7)) >= startMonth ? Number(t.slice(0, 4)) : Number(t.slice(0, 4)) - 1;
  return `${y}-${String(startMonth).padStart(2, '0')}-01`;
};
