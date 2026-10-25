import { api, uploadFile } from './client';

/** ID cards (cmsbackend/src/modules/idcards). */

export type HolderType = 'student' | 'staff';
export interface Design {
  id: string;
  name: string;
  kind: HolderType;
  orientation: 'portrait' | 'landscape';
  color: string;
  textColor: string;
  fields: string[];
  code: 'qr' | 'barcode' | 'none';
  back: boolean;
  backFields: string[];
  backText: string | null;
  signatureFileId: string | null;
  signatureLabel: string | null;
  signatureUrl: string | null;
  isDefault: boolean;
  isActive: boolean;
  cards?: number;
}
export type DesignInput = Omit<Design, 'id' | 'signatureUrl' | 'cards'>;
export interface School {
  name: string;
  short: string;
  address: string;
  phone: string;
  logoUrl: string | null;
}
export interface Holder {
  type: HolderType;
  id: string;
  name: string;
  photo: string | null;
  sub: string;
  values: Record<string, string>;
  /** Names of the school's extra fields on the card (Setup → Form Builder). */
  labels?: Record<string, string>;
  card: { id: string; cardNo: string; validUntil: string; status: string } | null;
}
export interface Options {
  designs: Design[];
  fields: Record<HolderType, { key: string; label: string }[]>;
  sections: { id: string; name: string }[];
  departments: { id: string; name: string }[];
  designations: { id: string; name: string }[];
  duplicateFee: number;
  school: School;
  can: { print: boolean; design: boolean };
}
export interface CardRow {
  id: string;
  cardNo: string;
  type: HolderType;
  holderId: string;
  designId: string | null;
  name: string;
  code: string;
  design: string;
  validUntil: string;
  status: 'active' | 'replaced' | 'cancelled';
  reason: string;
  fee: number | null;
  printCount: number;
  issuedBy: string;
  createdAt: string;
}
export interface Verify {
  status: 'valid' | 'replaced' | 'cancelled' | 'expired' | 'no_card' | 'left';
  cardNo: string | null;
  validUntil: string | null;
  holder: { type: HolderType; name: string; sub: string; photo: string | null; bloodGroup: string; transport: string };
  current: string | null;
}
export interface Mine {
  digital: boolean;
  parentPhotos: boolean;
  approval: boolean;
  school: School;
  people: (Holder & { design: Design | null })[];
  requests: { id: string; studentId: string; status: 'pending' | 'approved' | 'rejected'; note: string | null; at: string }[];
}

export const idCardsApi = {
  options: () => api.get<Options>('/idcards/options'),
  designs: () => api.get<Design[]>('/idcards/designs'),
  saveDesign: (id: string | null, input: DesignInput) => (id ? api.put<Design>(`/idcards/designs/${id}`, input) : api.post<Design>('/idcards/designs', input)),
  copyDesign: (id: string) => api.post<Design>(`/idcards/designs/${id}/copy`),
  deleteDesign: (id: string) => api.delete<{ deactivated: boolean }>(`/idcards/designs/${id}`),
  uploadImage: (file: File) => uploadFile<{ id: string }>('/idcards/designs/image', 'image', file),
  imagePath: (fileId: string) => `idcards/images/${fileId}`,
  pick: (input: { type: HolderType; sectionId?: string; departmentId?: string; ids?: string[]; withoutCard?: boolean }) => api.post<Holder[]>('/idcards/pick', input),
  search: (type: HolderType, q: string) => api.get<{ id: string; name: string; sub: string }[]>('/idcards/search', { params: { type, q }, quiet: true }),
  print: (input: { type: HolderType; designId: string; ids: string[] }) => api.post<{ added: number; reprinted: number; holders: Holder[] }>('/idcards/print', input),
  cards: (q: { type?: string; status?: string; search?: string; page?: number }) => api.get<{ total: number; page: number; pageSize: number; rows: CardRow[] }>('/idcards/cards', { params: q }),
  duplicate: (id: string, input: { reason: string; fee: number | null }) => api.post<{ id: string; cardNo: string; designId: string | null; type: HolderType; holderId: string; fee: number }>(`/idcards/cards/${id}/duplicate`, input),
  cancel: (id: string) => api.post(`/idcards/cards/${id}/cancel`),
  printed: (id: string) => api.post<Holder[]>(`/idcards/cards/${id}/printed`),
  verify: (code: string) => api.get<Verify>(`/idcards/verify/${encodeURIComponent(code)}`),
  photoSections: () => api.get<{ id: string; name: string; students: number; withPhoto: number }[]>('/idcards/photos/sections'),
  sectionPhotos: (id: string) => api.get<{ id: string; name: string; admissionNo: string; rollNo: number | null; photo: string | null }[]>(`/idcards/photos/sections/${id}`),
  takeStudentPhoto: (id: string, file: File) => uploadFile<{ photo: string | null }>(`/idcards/photos/student/${id}`, 'image', file),
  takeStaffPhoto: (id: string, file: File) => uploadFile<{ photo: string | null }>(`/idcards/photos/staff/${id}`, 'image', file),
  photoRequests: () => api.get<{ id: string; studentId: string; student: string; admissionNo: string; section: string; current: string | null; sent: string; by: string; at: string }[]>('/idcards/photo-requests'),
  answerRequest: (id: string, approve: boolean, note: string | null) => api.post(`/idcards/photo-requests/${id}/answer`, { approve, note }),
  mine: () => api.get<Mine>('/idcards/mine'),
  sendPhoto: (studentId: string, file: File) => uploadFile<{ pending: boolean }>(`/idcards/mine/photo/${studentId}`, 'image', file),
};

export const VERIFY: Record<Verify['status'], { label: string; tone: 'success' | 'danger' | 'warning' }> = {
  valid: { label: 'Valid card', tone: 'success' },
  replaced: { label: 'Card replaced: not valid', tone: 'danger' },
  cancelled: { label: 'Card cancelled: not valid', tone: 'danger' },
  expired: { label: 'Card expired', tone: 'warning' },
  no_card: { label: 'Person found (no card number scanned)', tone: 'warning' },
  left: { label: 'Has left the school', tone: 'danger' },
};
export const REASON: Record<string, string> = { new: 'New', lost: 'Lost', damaged: 'Damaged', changed: 'Details changed' };
