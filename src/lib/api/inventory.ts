import { api, uploadFile } from './client';

/** Inventory (cmsbackend/src/modules/inventory). */

type Opt = { id: string; name: string; extra?: Record<string, unknown> };
export interface Options {
  categories: Opt[];
  units: Opt[];
  stores: Opt[];
  vendors: Opt[];
  departments: Opt[];
  staff: { id: string; name: string; departmentId: string | null }[];
  settings: { gst: boolean; sales: boolean; salesTo: 'fees' | 'counter'; negative: boolean };
  can: { manage: boolean; store: boolean; purchase: boolean; approve: boolean; sell: boolean; view: boolean };
}
export interface ItemRow {
  id: string;
  code: string;
  name: string;
  category: string;
  unit: string;
  qty: number;
  totalQty: number;
  reorderLevel: number;
  low: boolean;
  avgCost: number;
  value: number;
  sellable: boolean;
  sellPrice: number | null;
  trackExpiry: boolean;
  isActive: boolean;
  stores: { store: string; qty: number }[];
}
export interface Item {
  id: string;
  code: string;
  name: string;
  categoryId: string | null;
  unitId: string | null;
  reorderLevel: number;
  reorderQty: number;
  barcode: string | null;
  sellable: boolean;
  sellPrice: number | null;
  trackExpiry: boolean;
  gstPct: number;
  avgCost: number;
  isActive: boolean;
  category: string;
  unit: string;
  totalQty: number;
  stock: { storeId: string; store: string; qty: number }[];
  batches: { id: string; store: string; storeId: string; batchNo: string | null; expiryOn: string | null; qty: number; expired: boolean }[];
  moves: { id: string; kind: string; store: string; qty: number; rate: number; balance: number; to: string; refNo: string | null; note: string | null; by: string; at: string }[];
}
export interface ItemInput {
  name: string;
  categoryId: string | null;
  unitId: string | null;
  reorderLevel: number;
  reorderQty: number;
  barcode: string | null;
  sellable: boolean;
  sellPrice: number | null;
  trackExpiry?: boolean;
  gstPct: number;
  isActive: boolean;
  opening?: { storeId: string; qty: number; rate: number } | null;
}
export interface PickItem {
  id: string;
  code: string;
  name: string;
  unit: string;
  avgCost: number;
  sellPrice: number | null;
  gstPct: number;
  trackExpiry: boolean;
  reorderQty: number;
  qty: number;
}
export interface Request {
  id: string;
  number: string;
  status: 'pending' | 'approved' | 'partly' | 'issued' | 'rejected' | 'cancelled';
  value: number;
  purpose: string | null;
  department: string;
  departmentId: string | null;
  staffId: string | null;
  storeId: string | null;
  by: string;
  answeredBy: string;
  answer: string | null;
  createdAt: string;
  lines: { id: string; itemId: string; item: string; code: string; unit: string; qty: number; issuedQty: number; inStock: number }[];
}
export interface PoRow {
  id: string;
  number: string;
  vendor: string;
  store: string;
  orderDate: string;
  expectedOn: string | null;
  status: string;
  total: number;
  lines: number;
  received: number;
  by: string;
}
export interface Po {
  id: string;
  number: string;
  vendorId: string | null;
  storeId: string | null;
  orderDate: string;
  expectedOn: string | null;
  status: string;
  total: number;
  note: string | null;
  vendor: string;
  vendorInfo: { phone?: string; gstin?: string };
  store: string;
  createdByName: string;
  approvedByName: string;
  school: { name: string; address: string; phone: string; email: string; logoUrl: string | null } | null;
  receipts: { id: string; number: string; at: string; billNo: string | null; total: number }[];
  lines: { id: string; itemId: string; item: string; code: string; unit: string; qty: number; rate: number; gstPct: number; receivedQty: number; trackExpiry: boolean; amount: number }[];
}
export type Line = { itemId: string; qty: number };
export type PriceLine = Line & { rate: number; gstPct: number; batchNo?: string | null; expiryOn?: string | null };

export const invApi = {
  options: () => api.get<Options>('/inventory/options'),
  pick: (q: { q?: string; store?: string; sellable?: boolean }) => api.get<PickItem[]>('/inventory/pick', { params: { q: q.q ?? '', store: q.store || undefined, sellable: q.sellable ? '1' : undefined }, quiet: true }),
  upload: (file: File) => uploadFile<{ id: string; name: string }>('/inventory/files', 'file', file),
  filePath: (id: string) => `/inventory/files/${id}`,
  items: (q: { search?: string; category?: string; store?: string; show?: string; page?: number }) => api.get<{ total: number; page: number; pageSize: number; value: number; low: number; rows: ItemRow[] }>('/inventory/items', { params: Object.fromEntries(Object.entries(q).filter(([, v]) => v)) }),
  item: (id: string) => api.get<Item>(`/inventory/items/${id}`),
  saveItem: (id: string | null, input: ItemInput) => (id ? api.put<Item>(`/inventory/items/${id}`, (({ opening: _o, ...r }) => r)(input)) : api.post<Item>('/inventory/items', input)),
  low: () => api.get<{ id: string; code: string; name: string; unit: string; category: string; qty: number; reorderLevel: number; suggest: number; avgCost: number; gstPct: number }[]>('/inventory/low'),
  expiring: () => api.get<{ id: string; itemId: string; item: string; code: string; unit: string; store: string; storeId: string; batchNo: string | null; expiryOn: string; expired: boolean; qty: number }[]>('/inventory/expiring'),
  myRequests: () => api.get<Request[]>('/inventory/requests/mine'),
  request: (input: { storeId?: string | null; departmentId?: string | null; purpose: string | null; lines: Line[] }) => api.post<{ id: string; number: string; status: string }>('/inventory/requests', input),
  cancelRequest: (id: string) => api.post(`/inventory/requests/${id}/cancel`),
  requests: (show: string) => api.get<Request[]>('/inventory/requests', { params: { show } }),
  answerRequest: (id: string, approve: boolean, answer: string | null) => api.post(`/inventory/requests/${id}/answer`, { approve, answer }),
  closeRequest: (id: string) => api.post(`/inventory/requests/${id}/close`),
  issue: (input: { storeId: string; departmentId?: string | null; staffId?: string | null; requestId?: string | null; note?: string | null; lines: Line[] }) => api.post<{ refNo: string }>('/inventory/issue', input),
  takeBack: (input: { storeId: string; departmentId?: string | null; staffId?: string | null; note?: string | null; lines: Line[] }) => api.post<{ refNo: string }>('/inventory/return', input),
  transfer: (input: { fromStoreId: string; toStoreId: string; note?: string | null; lines: Line[] }) => api.post<{ refNo: string }>('/inventory/transfer', input),
  issued: (q: { departmentId?: string; staffId?: string; from: string; to: string }) => api.get<{ id: string; at: string; kind: string; item: string; code: string; qty: number; value: number; store: string; refNo: string | null }[]>('/inventory/issued', { params: Object.fromEntries(Object.entries(q).filter(([, v]) => v)) }),
  writeoff: (input: { storeId: string; itemId: string; batchId?: string | null; qty: number; reason: string; note: string | null }) => api.post<{ id: string; status: string }>('/inventory/writeoffs', input),
  adjustments: (show: string) => api.get<{ id: string; kind: string; item: string; code: string; store: string; qty: number; value: number; reason: string; note: string | null; status: string; by: string; answeredBy: string; at: string }[]>('/inventory/adjustments', { params: { show } }),
  answerAdjustment: (id: string, approve: boolean) => api.post(`/inventory/adjustments/${id}/answer`, { approve }),
  counts: () => api.get<{ id: string; name: string; store: string; status: string; startedAt: string; closedAt: string | null; items: number; counted: number; differences: number }[]>('/inventory/counts'),
  startCount: (storeId: string, name: string) => api.post<{ id: string }>('/inventory/counts', { storeId, name }),
  count: (id: string) => api.get<{ id: string; name: string; store: string; status: string; lines: { itemId: string; item: string; code: string; unit: string; category: string; systemQty: number; counted: number | null; diff: number | null; value: number | null }[] }>(`/inventory/counts/${id}`),
  saveCount: (id: string, lines: { itemId: string; counted: number | null }[]) => api.put(`/inventory/counts/${id}`, { lines }),
  submitCount: (id: string) => api.post<{ differences: number; approved: boolean }>(`/inventory/counts/${id}/submit`),
  pos: (show: string) => api.get<PoRow[]>('/inventory/pos', { params: { show } }),
  po: (id: string) => api.get<Po>(`/inventory/pos/${id}`),
  savePo: (id: string | null, input: { vendorId: string; storeId: string | null; orderDate: string; expectedOn: string | null; note: string | null; lines: { itemId: string; qty: number; rate: number; gstPct: number }[] }) => (id ? api.put<Po>(`/inventory/pos/${id}`, input) : api.post<Po>('/inventory/pos', input)),
  submitPo: (id: string) => api.post<Po>(`/inventory/pos/${id}/submit`),
  answerPo: (id: string, approve: boolean) => api.post<Po>(`/inventory/pos/${id}/answer`, { approve }),
  cancelPo: (id: string) => api.post<Po>(`/inventory/pos/${id}/cancel`),
  receipts: () => api.get<{ id: string; number: string; source: string; po: string | null; vendor: string; store: string; billNo: string | null; billDate: string | null; billFileId: string | null; total: number; lines: number; by: string; at: string }[]>('/inventory/receipts'),
  receive: (input: { source: 'po' | 'direct' | 'donation'; poId?: string | null; vendorId?: string | null; storeId: string; billNo: string | null; billDate: string | null; billFileId: string | null; note: string | null; lines: PriceLine[] }) => api.post<{ id: string; number: string; total: number }>('/inventory/receipts', input),
  vendorReturn: (input: { storeId: string; vendorId: string; note: string | null; lines: Line[] }) => api.post<{ refNo: string }>('/inventory/vendor-returns', input),
  students: (q: string) => api.get<{ id: string; name: string; admissionNo: string; section: string }[]>('/inventory/students', { params: { q }, quiet: true }),
  sales: (page: number) => api.get<{ total: number; page: number; pageSize: number; rows: { id: string; number: string; student: string; admissionNo: string; payAt: string; mode: string | null; total: number; items: number; status: string; at: string }[] }>('/inventory/sales', { params: { page } }),
  sell: (input: { studentId: string; storeId: string; payAt: 'fees' | 'counter'; mode: string | null; lines: Line[] }) => api.post<Sale>('/inventory/sales', input),
  sale: (id: string) => api.get<Sale>(`/inventory/sales/${id}`),
  cancelSale: (id: string) => api.post<Sale>(`/inventory/sales/${id}/cancel`),
};
export interface Sale {
  id: string;
  number: string;
  student: string;
  admissionNo: string;
  store: string;
  payAt: 'fees' | 'counter';
  mode: string | null;
  total: number;
  status: string;
  at: string;
  soldByName: string;
  school: { legalName: string; addressLine1: string | null; city: string | null; phone: string | null } | null;
  lines: { id: string; item: string; unit: string; qty: number; rate: number; amount: number }[];
}

export const MOVE: Record<string, string> = { opening: 'Opening', receive: 'Received', issue: 'Issued', return: 'Returned', transfer_in: 'Transfer in', transfer_out: 'Transfer out', vendor_return: 'Back to vendor', writeoff: 'Written off', adjust: 'Count adjustment', sale: 'Sold', sale_cancel: 'Sale cancelled' };
export const REQ: Record<string, { label: string; tone: 'warning' | 'primary' | 'success' | 'danger' | 'neutral' }> = { pending: { label: 'Waiting for approval', tone: 'warning' }, approved: { label: 'To issue', tone: 'primary' }, partly: { label: 'Partly issued', tone: 'primary' }, issued: { label: 'Issued', tone: 'success' }, rejected: { label: 'Not approved', tone: 'danger' }, cancelled: { label: 'Cancelled', tone: 'neutral' } };
export const PO: Record<string, { label: string; tone: 'warning' | 'primary' | 'success' | 'danger' | 'neutral' }> = { draft: { label: 'Draft', tone: 'neutral' }, pending: { label: 'Waiting for approval', tone: 'warning' }, approved: { label: 'Approved', tone: 'primary' }, partly: { label: 'Part received', tone: 'primary' }, received: { label: 'Received', tone: 'success' }, cancelled: { label: 'Cancelled', tone: 'neutral' }, rejected: { label: 'Not approved', tone: 'danger' } };
export const money = (n: number | null | undefined) => (n === null || n === undefined ? '—' : `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`);
export const qty = (n: number) => n.toLocaleString('en-IN', { maximumFractionDigits: 3 });
export const day = (iso: string | null) => (iso ? new Date(iso.length === 10 ? `${iso}T00:00:00` : iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');
export const todayISO = () => new Date(Date.now() + 5.5 * 3_600_000).toISOString().slice(0, 10);
