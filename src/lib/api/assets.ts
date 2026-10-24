import { api, uploadFile } from './client';

/** Assets (cmsbackend/src/modules/assets). */

export type AssetStatus = 'in_use' | 'in_repair' | 'disposed' | 'lost';
export type IssueStatus = 'open' | 'in_repair' | 'fixed' | 'written_off';
type Opt = { id: string; name: string; extra?: Record<string, unknown> };

export interface Options {
  categories: Opt[];
  conditions: Opt[];
  vendors: Opt[];
  rooms: Opt[];
  staff: { id: string; name: string }[];
  depreciation: boolean;
}
export interface AssetRow {
  id: string;
  code: string;
  name: string;
  category: string | null;
  room: string | null;
  staff: string | null;
  condition: string | null;
  quantity: number;
  cost: number | null;
  value: number | null;
  status: AssetStatus;
  warrantyUntil: string | null;
  maintenanceDue: boolean;
  openIssues: number;
}
export interface Asset {
  id: string;
  code: string;
  name: string;
  categoryId: string | null;
  conditionId: string | null;
  vendorId: string | null;
  roomId: string | null;
  staffId: string | null;
  make: string | null;
  model: string | null;
  serialNo: string | null;
  quantity: number;
  purchasedOn: string | null;
  billNo: string | null;
  cost: number | null;
  warrantyUntil: string | null;
  amcUntil: string | null;
  maintainEvery: number | null;
  nextMaintenanceOn: string | null;
  photoFileId: string | null;
  billFileId: string | null;
  status: AssetStatus;
  disposedOn: string | null;
  notes: string | null;
  category: string | null;
  condition: string | null;
  vendor: string | null;
  room: string | null;
  staff: string | null;
  value: number | null;
  depreciation: number;
  history: { id: string; kind: string; from: string | null; to: string | null; cost: number | null; note: string | null; by: string | null; at: string }[];
  issues: { id: string; title: string; details: string | null; status: IssueStatus; reportedBy: string | null; assignedTo: string | null; cost: number | null; resolution: string | null; createdAt: string; fixedAt: string | null }[];
  disposals: { id: string; reason: string; note: string | null; amount: number | null; status: 'pending' | 'approved' | 'rejected'; askedBy: string | null; answeredBy: string | null; createdAt: string }[];
}
export interface AssetInput {
  name: string;
  categoryId: string | null;
  conditionId: string | null;
  vendorId: string | null;
  roomId: string | null;
  staffId: string | null;
  make: string | null;
  model: string | null;
  serialNo: string | null;
  quantity: number;
  purchasedOn: string | null;
  billNo: string | null;
  cost: number | null;
  warrantyUntil: string | null;
  amcUntil: string | null;
  maintainEvery: number | null;
  nextMaintenanceOn: string | null;
  photoFileId: string | null;
  billFileId: string | null;
  notes: string | null;
}
export interface Issue {
  id: string;
  assetId: string;
  asset: string;
  room: string | null;
  title: string;
  details: string | null;
  photoFileId: string | null;
  status: IssueStatus;
  reportedBy: string | null;
  assignedTo: string | null;
  assignedToId: string | null;
  vendor: string | null;
  vendorId: string | null;
  cost: number | null;
  resolution: string | null;
  createdAt: string;
  fixedAt: string | null;
}
export interface Care {
  maintenance: { id: string; code: string; name: string; room: string | null; due: string; overdue: boolean; every: number | null }[];
  warranty: { id: string; code: string; name: string; room: string | null; warrantyUntil: string | null; amcUntil: string | null }[];
}
export interface Verification {
  id: string;
  name: string;
  status: 'open' | 'closed';
  startedAt: string;
  expected: number;
  foundCount: number;
  rooms: { roomId: string | null; room: string; assets: { id: string; code: string; name: string; quantity: number; found: boolean; foundIn: string | null }[] }[];
}

const clean = (q: Record<string, unknown>) => Object.fromEntries(Object.entries(q).filter(([, v]) => v !== '' && v !== undefined && v !== null));

export const assetsApi = {
  options: () => api.get<Options>('/assets/options'),
  upload: (file: File) => uploadFile<{ id: string; name: string }>('/assets/files', 'file', file),
  fileUrl: (fileId: string) => `/assets/files/${fileId}`,
  list: (q: { search?: string; category?: string; room?: string; condition?: string; staff?: string; status?: string; page?: number; pageSize?: number }) => api.get<{ total: number; page: number; pageSize: number; totals: { cost: number; items: number }; rows: AssetRow[] }>('/assets', { params: clean(q) }),
  get: (id: string) => api.get<Asset>(`/assets/${id}`),
  byCode: (code: string) => api.get<Asset>(`/assets/code/${encodeURIComponent(code)}`),
  create: (input: AssetInput) => api.post<Asset>('/assets', input),
  update: (id: string, input: AssetInput) => api.put<Asset>(`/assets/${id}`, input),
  move: (id: string, input: { roomId?: string | null; staffId?: string | null; note?: string | null }) => api.post<Asset>(`/assets/${id}/move`, input),
  maintained: (id: string, input: { doneOn: string; cost: number | null; note: string | null }) => api.post<Asset>(`/assets/${id}/maintained`, input),
  dispose: (id: string, input: { reason: string; note: string | null; amount: number | null }) => api.post<Asset>(`/assets/${id}/dispose`, input),
  labels: (q: { ids?: string; room?: string }) => api.get<{ school: string; labels: { id: string; code: string; name: string; room: string | null; quantity: number }[] }>('/assets/labels', { params: clean(q) }),
  mine: () => api.get<{ assets: { id: string; code: string; name: string; category: string | null; condition: string | null; serialNo: string | null; room: string | null; quantity: number }[]; reported: { id: string; asset: string; title: string; status: IssueStatus; resolution: string | null; createdAt: string }[] }>('/assets/mine'),
  pick: (q: string) => api.get<{ id: string; code: string; name: string; room: string | null }[]>('/assets/pick', { params: { q }, quiet: true }),
  report: (input: { assetId: string; title: string; details: string | null; photoFileId: string | null }) => api.post<{ id: string }>('/assets/issues', input),
  issues: (show: string) => api.get<Issue[]>('/assets/issues', { params: { show } }),
  updateIssue: (id: string, input: { status: IssueStatus; assignedTo?: string | null; vendorId: string | null; cost: number | null; resolution: string | null }) => api.put(`/assets/issues/${id}`, input),
  care: () => api.get<Care>('/assets/care'),
  disposals: () => api.get<{ id: string; assetId: string; asset: string; cost: number | null; reason: string; note: string | null; amount: number | null; by: string; at: string }[]>('/assets/disposals'),
  answerDisposal: (id: string, approve: boolean) => api.post<Asset>(`/assets/disposals/${id}/answer`, { approve }),
  verifications: () => api.get<{ id: string; name: string; status: 'open' | 'closed'; startedAt: string; closedAt: string | null; found: number }[]>('/assets/verifications'),
  startVerification: (name: string) => api.post<Verification>('/assets/verifications', { name }),
  verification: (id: string) => api.get<Verification>(`/assets/verifications/${id}`),
  markFound: (id: string, input: { assetId?: string; code?: string; roomId?: string | null; found: boolean }) => api.post<{ code: string; name: string; misplaced: boolean }>(`/assets/verifications/${id}/found`, input),
  closeVerification: (id: string, moveMisplaced: boolean) => api.post<Verification>(`/assets/verifications/${id}/close`, { moveMisplaced }),
};

export const STATUS: Record<AssetStatus, { label: string; tone: 'success' | 'warning' | 'neutral' | 'danger' }> = { in_use: { label: 'In use', tone: 'success' }, in_repair: { label: 'In repair', tone: 'warning' }, disposed: { label: 'Written off', tone: 'neutral' }, lost: { label: 'Lost', tone: 'danger' } };
export const ISSUE: Record<IssueStatus, { label: string; tone: 'danger' | 'warning' | 'success' | 'neutral' }> = { open: { label: 'Open', tone: 'danger' }, in_repair: { label: 'In repair', tone: 'warning' }, fixed: { label: 'Fixed', tone: 'success' }, written_off: { label: 'Written off', tone: 'neutral' } };
export const EVENT: Record<string, string> = { added: 'Added', moved: 'Moved', assigned: 'Given to', returned: 'Taken back', condition: 'Condition', maintained: 'Maintained', repaired: 'Repaired', disposed: 'Written off', verified: 'Verified' };
export const REASON: Record<string, string> = { sold: 'Sold', scrapped: 'Scrapped', lost: 'Lost', donated: 'Donated' };
export const rupees = (n: number | null | undefined) => (n === null || n === undefined ? '—' : `₹${n.toLocaleString('en-IN')}`);
export const day = (iso: string | null) => (iso ? new Date(iso.length === 10 ? `${iso}T00:00:00` : iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');
