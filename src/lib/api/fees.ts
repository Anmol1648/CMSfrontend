import { api, downloadFile } from './client';
import type { Paged } from './admin';

/** Fees and online payments (cmsbackend/src/modules/fees, payments). Amounts are whole rupees. */

export interface Ref {
  id: string;
  name: string;
}

/** A payment mode's code (Masters → Payment modes; names via usePaymentModes). */
export type PaymentMode = string;

export const rupees = (n: number | null | undefined) => (n == null ? '—' : `₹${n.toLocaleString('en-IN')}`);

export interface FeeHead {
  id: string;
  name: string;
  code: string | null;
  isActive: boolean;
  oneTime: boolean;
  refundable: boolean;
}

export interface FeeConfig {
  partial: boolean;
  fineMode: 'none' | 'fixed' | 'per_day' | 'per_month';
  fineAmount: number;
  graceDays: number;
  fineCap: number;
  receiptFormat: 'a4_half' | 'thermal';
  heads: FeeHead[];
}

export interface Instalment {
  id: string;
  name: string;
  dueDate: string;
  paidAgainst: boolean;
}

export interface StructureGrid {
  class: Ref;
  heads: FeeHead[];
  instalments: Instalment[];
  amounts: { feeHeadId: string; instalmentId: string; amount: number }[];
  total: number;
}

export interface ConcessionLine {
  feeHeadId: string;
  feeHead?: Ref;
  kind: 'percent' | 'amount';
  value: number;
}

export interface Concession {
  id: string;
  name: string;
  automatic: boolean;
  genderIds: string[];
  casteCategoryIds: string[];
  categoryIds: string[];
  classIds: string[];
  note: string | null;
  isActive: boolean;
  students: number;
  lines: ConcessionLine[];
}
export type ConcessionInput = Omit<Concession, 'id' | 'students' | 'lines'> & { lines: Omit<ConcessionLine, 'feeHead'>[] };

export interface DueLine {
  feeHeadId: string;
  head: string;
  gross: number;
  concession: number;
  adjustment: number;
  net: number;
  paid: number;
  balance: number;
}

export interface DueInstalment {
  id: string;
  name: string;
  dueDate: string;
  lines: DueLine[];
  fine: { charged: number; waived: number; paid: number; balance: number };
  net: number;
  paid: number;
  balance: number;
  overdue: boolean;
}

export interface StudentDues {
  studentId: string;
  instalments: DueInstalment[];
  concessions: { id: string; name: string; automatic: boolean }[];
  totals: { net: number; paid: number; fine: number; balance: number; overdue: number };
}

export interface Receipt {
  id: string;
  receiptNo: string;
  date: string;
  student: { id: string; name: string; admissionNo: string; section: string | null; roll: number | null };
  parent: { name: string; relation: string | null; mobile: string | null } | null;
  academicYear: Ref;
  mode: PaymentMode;
  reference: string | null;
  bankName: string | null;
  amount: number;
  note: string | null;
  status: 'active' | 'cancelled';
  cancelledAt: string | null;
  cancelledBy: string | null;
  cancelReason: string | null;
  collectedBy: string | null;
  online: { provider: string; paymentRef: string | null; convenienceFee: number } | null;
  createdAt: string;
  instalments: { id: string; name: string; dueDate: string; lines: { head: string; amount: number; refundable: boolean }[]; fine: number }[];
  footer?: string;
}

export interface StudentFees {
  student: { id: string; name: string; admissionNo: string; status: string; section: string | null; roll: number | null };
  academicYearId: string;
  enrolled: boolean;
  dues: StudentDues | null;
  receipts: Receipt[];
  concessions: { id: string; concession: Ref; note: string | null; createdAt: string }[];
  adjustments: { id: string; instalment: string; head: string; amount: number; reason: string; by: string | null; createdAt: string }[];
}

export interface FeeStudent {
  id: string;
  name: string;
  admissionNo: string;
  status: string;
  section: string | null;
  parent: { name: string; mobile: string | null } | null;
}

export interface ReceiptListQuery {
  page?: number;
  pageSize?: number;
  search?: string;
  sort?: string;
  order?: 'asc' | 'desc';
  from?: string;
  to?: string;
  mode?: PaymentMode | '';
  status?: 'active' | 'cancelled' | '';
  year?: string;
  class?: string;
  student?: string;
}
const receiptParams = (q: ReceiptListQuery) => {
  const p: Record<string, string | number> = {};
  if (q.page) p.page = q.page;
  if (q.pageSize) p.pageSize = q.pageSize;
  if (q.sort) p.sort = q.sort;
  if (q.order) p.order = q.order;
  if (q.search?.trim()) p.search = q.search.trim();
  for (const k of ['from', 'to', 'mode', 'status', 'year', 'class', 'student'] as const) if (q[k]) p[`filter[${k}]`] = q[k] as string;
  return p;
};

export interface DuesRow {
  id: string;
  name: string;
  admissionNo: string;
  status: string;
  section: string;
  roll: number | null;
  parent: { name: string; mobile: string | null } | null;
  net: number;
  paid: number;
  balance: number;
  overdue: number;
  fine: number;
  overdueSince: string | null;
  overdueInstalments: string[];
}
export interface DuesQuery {
  year?: string;
  class?: string;
  section?: string;
  asOf?: string;
  show?: 'overdue' | 'all' | 'everyone';
  search?: string;
}
const clean = (q: object) => Object.fromEntries(Object.entries(q).filter(([, v]) => v !== '' && v != null)) as Record<string, string>;

export interface Collection {
  from: string;
  to: string;
  total: { count: number; amount: number };
  cancelled: { count: number; amount: number };
  byDay: { date: string; count: number; amount: number }[];
  byMode: { mode: PaymentMode; count: number; amount: number }[];
  byHead: { id: string; name: string; amount: number }[];
  byClass: { id: string; name: string; count: number; amount: number }[];
  byCollector: { id: string; name: string; count: number; amount: number }[];
  registrationFees: { count: number; amount: number; byMode: { mode: PaymentMode; amount: number }[] };
}

export interface ClassSummary {
  academicYearId: string;
  classes: { id: string; name: string; students: number; net: number; paid: number; balance: number; overdue: number; defaulters: number }[];
  totals: { students: number; net: number; paid: number; balance: number; overdue: number; defaulters: number };
}

export interface MyFees {
  academicYear: Ref | null;
  online: { enabled: boolean; provider?: 'razorpay' | 'mock' | null; partial?: boolean; minimum?: number; convenience?: { mode: 'none' | 'percent' | 'fixed'; value: number } };
  children: { id: string; name: string; admissionNo: string; section: string | null; dues: StudentDues; receipts: { id: string; receiptNo: string; date: string; amount: number; mode: PaymentMode; status: string }[] }[];
}

// ─── Online payments ─────────────────────────────────────────────────────────

export interface Checkout {
  paymentId: string;
  provider: 'razorpay' | 'mock';
  keyId: string | null;
  orderId: string;
  amount: number;
  amountPaise: number;
  currency: 'INR';
  description: string;
  prefill: { name?: string; email?: string | null; contact?: string | null };
}

export interface PaymentResult {
  id: string;
  status: 'created' | 'paid' | 'failed';
  purpose: 'fees' | 'registration';
  amount: number;
  convenienceFee: number;
  paymentRef: string | null;
  error: string | null;
  receipt: { id: string; receiptNo: string } | null;
  registrationNo: string | null;
  enquiryNo: string | null;
  mode: 'test' | 'live';
  method: 'checkout' | 'qr';
  provider: 'razorpay' | 'mock';
  /** While a QR code is waiting to be paid. */
  qrImageUrl: string | null;
  expiresAt: string | null;
}

export interface GatewayKeys {
  keyId: string | null;
  hasKeySecret: boolean;
  hasWebhookSecret: boolean;
  ready: boolean;
}

export interface GatewaySettings {
  provider: 'razorpay' | 'mock' | null;
  /** Which keys are in use: test (no real money) or live. */
  mode: 'test' | 'live';
  test: GatewayKeys;
  live: GatewayKeys;
  ready: boolean;
  mockAllowed: boolean;
  webhookUrl: string;
  onlineFees: boolean;
  onlineRegistration: boolean;
  updatedAt: string | null;
}

export interface OnlinePaymentRow {
  id: string;
  createdAt: string;
  paidAt: string | null;
  purpose: 'fees' | 'registration';
  provider: string;
  orderId: string;
  paymentRef: string | null;
  amount: number;
  convenienceFee: number;
  status: 'created' | 'paid' | 'failed';
  error: string | null;
  mode: 'test' | 'live';
  method: 'checkout' | 'qr';
  student: { id: string; name: string; admissionNo: string } | null;
  enquiry: { id: string; enquiryNo: string; name: string } | null;
  receipt: { id: string; receiptNo: string } | null;
}

const y = (year: string) => ({ params: { year } });

export const feesApi = {
  config: () => api.get<FeeConfig>('/fees/setup/config'),
  instalments: (year: string) => api.get<Instalment[]>('/fees/setup/instalments', y(year)),
  addInstalment: (year: string, input: { name: string; dueDate: string }) => api.post<Instalment[]>('/fees/setup/instalments', input, y(year)),
  generateInstalments: (year: string, input: { plan: 'monthly' | 'quarterly' | 'half_yearly' | 'yearly'; dueDay: number }) => api.post<Instalment[]>('/fees/setup/instalments/generate', input, y(year)),
  updateInstalment: (id: string, input: Partial<{ name: string; dueDate: string }>) => api.patch<Instalment[]>(`/fees/setup/instalments/${id}`, input),
  deleteInstalment: (id: string) => api.delete<Instalment[]>(`/fees/setup/instalments/${id}`),
  structureOverview: (year: string) => api.get<{ id: string; name: string; total: number }[]>('/fees/setup/structure', y(year)),
  structure: (year: string, classId: string) => api.get<StructureGrid>(`/fees/setup/structure/${classId}`, y(year)),
  saveStructure: (year: string, classId: string, amounts: StructureGrid['amounts']) => api.put<StructureGrid>(`/fees/setup/structure/${classId}`, { amounts }, y(year)),
  copyStructure: (year: string, classId: string, toClassIds: string[]) => api.post<{ classes: number }>(`/fees/setup/structure/${classId}/copy`, { toClassIds }, y(year)),
  copyYear: (year: string, fromYearId: string) => api.post<{ instalments: number; amounts: number; concessions: number }>('/fees/setup/copy-year', { fromYearId }, { ...y(year), timeout: 120_000 }),
  concessions: (year: string) => api.get<Concession[]>('/fees/setup/concessions', y(year)),
  addConcession: (year: string, input: ConcessionInput) => api.post<Concession>('/fees/setup/concessions', input, y(year)),
  updateConcession: (id: string, input: ConcessionInput) => api.put<Concession>(`/fees/setup/concessions/${id}`, input),
  deleteConcession: (id: string) => api.delete<{ id: string }>(`/fees/setup/concessions/${id}`),

  searchStudents: (search: string) => api.get<FeeStudent[]>('/fees/students', { params: { search } }),
  studentFees: (id: string, year?: string) => api.get<StudentFees>(`/fees/students/${id}`, { params: year ? { year } : {} }),
  giveConcession: (id: string, input: { concessionId: string; note?: string | null }) => api.post<StudentFees>(`/fees/students/${id}/concessions`, input),
  removeConcession: (id: string, concessionId: string) => api.delete<StudentFees>(`/fees/students/${id}/concessions/${concessionId}`),
  addAdjustment: (id: string, input: { instalmentId: string; feeHeadId: string; amount: number; reason: string }) => api.post<StudentFees>(`/fees/students/${id}/adjustments`, input),
  removeAdjustment: (id: string, adjustmentId: string) => api.delete<StudentFees>(`/fees/students/${id}/adjustments/${adjustmentId}`),
  collect: (input: { studentId: string; academicYearId?: string; date?: string; mode: PaymentMode; reference?: string | null; bankName?: string | null; amount: number; instalmentIds?: string[]; note?: string | null }) =>
    api.post<Receipt>('/fees/receipts', input, { timeout: 60_000 }),
  receipts: (q: ReceiptListQuery) => api.get<Paged<Receipt> & { totalAmount: number }>('/fees/receipts', { params: receiptParams(q) }),
  exportReceipts: (q: ReceiptListQuery) => downloadFile('/fees/receipts/export', receiptParams(q), 'receipts.xlsx'),
  receipt: (id: string) => api.get<Receipt>(`/fees/receipts/${id}`),
  cancelReceipt: (id: string, reason: string) => api.post<Receipt>(`/fees/receipts/${id}/cancel`, { reason }),

  dues: (q: DuesQuery) => api.get<{ academicYearId: string; asOf: string; students: DuesRow[]; totals: { students: number; net: number; paid: number; balance: number; overdue: number } }>('/fees/reports/dues', { params: clean(q), timeout: 120_000 }),
  exportDues: (q: DuesQuery) => downloadFile('/fees/reports/dues/export', clean(q), 'fee-dues.xlsx'),
  classSummary: (year?: string) => api.get<ClassSummary>('/fees/reports/classes', { params: clean({ year }), timeout: 120_000 }),
  collection: (from: string, to: string) => api.get<Collection>('/fees/reports/collection', { params: { from, to } }),

  my: () => api.get<MyFees>('/fees/my'),
  myReceipt: (id: string) => api.get<Receipt>(`/fees/my/receipts/${id}`),
};

export const paymentsApi = {
  gateway: () => api.get<GatewaySettings>('/payments/gateway'),
  saveGateway: (input: {
    provider: 'razorpay' | 'mock';
    mode?: 'test' | 'live';
    keyId?: string | null;
    keySecret?: string;
    webhookSecret?: string;
    liveKeyId?: string | null;
    liveKeySecret?: string;
    liveWebhookSecret?: string;
  }) => api.put<GatewaySettings>('/payments/gateway', input),
  /** A UPI QR for the parent (My Fees) or at the counter. */
  qrForFees: (input: { studentId: string; instalmentIds?: string[]; amount?: number }) => api.post<PaymentResult>('/payments/fees/qr', input, { timeout: 60_000 }),
  qrAtCounter: (input: { studentId: string; instalmentIds?: string[]; amount?: number }) => api.post<PaymentResult>('/payments/counter-qr', input, { timeout: 60_000 }),
  pollQr: (id: string) => api.get<PaymentResult>(`/payments/${id}/qr`, { quiet: true }),
  cancelQr: (id: string) => api.post<PaymentResult>(`/payments/${id}/qr/cancel`),
  list: (q: { page?: number; pageSize?: number; search?: string; status?: string; purpose?: string; attention?: string }) =>
    api.get<Paged<OnlinePaymentRow>>('/payments', {
      params: clean({ page: q.page, pageSize: q.pageSize, search: q.search, 'filter[status]': q.status, 'filter[purpose]': q.purpose, 'filter[attention]': q.attention }),
    }),
  check: (id: string) => api.post<PaymentResult>(`/payments/${id}/check`),
  payFees: (input: { studentId: string; instalmentIds?: string[]; amount?: number }) => api.post<Checkout>('/payments/fees', input, { timeout: 60_000 }),
  /** `anonymous`: a payment made without login (the website form). */
  confirm: (id: string, input: { paymentRef: string; signature: string }, anonymous = false) => api.post<PaymentResult>(`/${anonymous ? 'public/' : ''}payments/${id}/confirm`, input, { timeout: 60_000 }),
  failed: (id: string, error: string | undefined, anonymous = false) => api.post<PaymentResult>(`/${anonymous ? 'public/' : ''}payments/${id}/failed`, { error }),
  mock: (id: string, outcome: 'paid' | 'failed', anonymous = false) => api.post<PaymentResult>(`/${anonymous ? 'public/' : ''}payments/${id}/mock`, { outcome }, { timeout: 60_000 }),
};
