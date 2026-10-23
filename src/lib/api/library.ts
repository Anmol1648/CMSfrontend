import { api, uploadFile } from './client';

/** Library (cmsbackend/src/modules/library). */

export type BookKind = 'book' | 'reference' | 'magazine' | 'newspaper' | 'cd' | 'ebook';
export type MemberKind = 'student' | 'staff';
export const KIND_LABEL: Record<BookKind, string> = { book: 'Book', reference: 'Reference', magazine: 'Magazine', newspaper: 'Newspaper', cd: 'CD / DVD', ebook: 'E-book' };
export const COPY_STATUS: Record<string, { label: string; tone: 'success' | 'warning' | 'danger' | 'neutral' | 'primary' }> = {
  available: { label: 'On the shelf', tone: 'success' },
  issued: { label: 'Lent', tone: 'primary' },
  on_hold: { label: 'Kept for a reservation', tone: 'warning' },
  lost: { label: 'Lost', tone: 'danger' },
  damaged: { label: 'Damaged', tone: 'warning' },
  withdrawn: { label: 'Withdrawn', tone: 'neutral' },
};

export interface BookRow {
  id: string;
  title: string;
  subtitle: string | null;
  authors: string | null;
  publisher: string | null;
  year: number | null;
  isbn: string | null;
  kind: BookKind;
  category: string | null;
  language: string | null;
  location: string | null;
  callNumber: string | null;
  coverFileId: string | null;
  link: string | null;
  hasFile: boolean;
  isActive: boolean;
  isNew: boolean;
  copies: number;
  available: number;
  out: number;
}
export interface Page<T> {
  total: number;
  page: number;
  pageSize: number;
  rows: T[];
}

export interface Copy {
  id: string;
  accessionNo: string;
  status: string;
  conditionId: string | null;
  condition: string | null;
  locationId: string | null;
  location: string | null;
  acquiredOn: string | null;
  source: string | null;
  billNo: string | null;
  price: number | null;
  notes: string | null;
  loan: { id: string; member: string | null; dueOn: string; overdue: boolean } | null;
}
export interface Book {
  id: string;
  title: string;
  subtitle: string | null;
  authors: string | null;
  publisher: string | null;
  edition: string | null;
  year: number | null;
  isbn: string | null;
  kind: BookKind;
  categoryId: string | null;
  languageId: string | null;
  locationId: string | null;
  category: string | null;
  language: string | null;
  location: string | null;
  callNumber: string | null;
  level: string | null;
  price: number | null;
  pages: number | null;
  keywords: string | null;
  coverFileId: string | null;
  fileId: string | null;
  link: string | null;
  notes: string | null;
  isActive: boolean;
  copies: Copy[];
  reservations: { id: string; place: number; status: string; member: string | null; holdUntil: string | null; createdAt: string }[];
}
export type BookInput = Omit<Book, 'id' | 'category' | 'language' | 'location' | 'copies' | 'reservations'> & { copies?: number };
export type CopyInput = { accessionNo: string; status: 'available' | 'damaged' | 'lost' | 'withdrawn'; conditionId: string | null; locationId: string | null; acquiredOn: string | null; source: string | null; billNo: string | null; price: number | null; notes: string | null };

export interface MemberHit {
  kind: MemberKind;
  id: string;
  name: string;
  code: string;
  detail: string;
}
export interface MemberLoan {
  id: string;
  accessionNo: string;
  bookId: string;
  title: string;
  authors: string | null;
  issuedOn: string;
  dueOn: string;
  overdue: boolean;
  renewals: number;
}
export interface Member {
  kind: MemberKind;
  id: string;
  name: string;
  code: string;
  detail: string;
  photoFileId: string | null;
  active: boolean;
  limits: { type: string; books: number; days: number; renewals: number };
  loans: MemberLoan[];
  reservations: { id: string; bookId: string; title: string; status: string; holdUntil: string | null }[];
  fines: { counter: number; fees: number; total: number };
}

export interface LoanRow {
  id: string;
  bookId: string;
  title: string;
  accessionNo: string;
  memberKind: MemberKind;
  member: string;
  issuedOn: string;
  dueOn: string;
  returnedOn: string | null;
  status: string;
  renewals: number;
  overdue: boolean;
  fineSoFar: number;
}
export interface FineRow {
  id: string;
  member: string;
  memberKind: MemberKind;
  kind: string;
  amount: number;
  waived: number;
  waiveReason: string | null;
  net: number;
  payAt: 'fees' | 'counter';
  status: string;
  on: string;
  note: string | null;
  receiptNo: string | null;
  paidOn: string | null;
}
export interface ReservationRow {
  id: string;
  bookId: string;
  title: string;
  member: string;
  status: string;
  accessionNo: string | null;
  holdUntil: string | null;
  createdAt: string;
}
export interface Summary {
  out: number;
  overdue: number;
  dueToday: number;
  issuedToday: number;
  returnedToday: number;
  ready: number;
  books: number;
  copies: number;
}
export interface StockCheck {
  id: string;
  name: string;
  status: 'open' | 'closed';
  startedAt: string;
  closedAt: string | null;
  expected: number;
  scanned: number;
  missing: { id: string; accessionNo: string; title: string; location: string | null }[];
  missingCount: number;
}
export interface MyLibrary {
  canReserve: boolean;
  members: {
    member: { kind: MemberKind; id: string; name: string; detail: string; code: string };
    limits: Member['limits'];
    loans: (MemberLoan & { fineSoFar: number; canRenew: boolean })[];
    reservations: Member['reservations'];
    history: { id: string; title: string; authors: string | null; issuedOn: string; returnedOn: string | null; status: string }[];
    fines: { id: string; kind: string; amount: number; waived: number; net: number; payAt: string; status: string; on: string; note: string | null }[];
    unpaid: Member['fines'];
  }[];
}

const clean = (q: Record<string, string | number | undefined>) => Object.fromEntries(Object.entries(q).filter(([, v]) => v !== undefined && v !== ''));

export const libraryApi = {
  books: (q: { search?: string; category?: string; kind?: string; show?: string; page?: number; pageSize?: number }) => api.get<Page<BookRow>>('/library/books', { params: clean(q) }),
  book: (id: string) => api.get<Book>(`/library/books/${id}`),
  saveBook: (id: string | null, input: BookInput) => (id ? api.put<Book>(`/library/books/${id}`, input) : api.post<Book>('/library/books', input)),
  deleteBook: (id: string) => api.delete(`/library/books/${id}`),
  addCopies: (id: string, input: { count: number; acquiredOn: string | null; source: string | null; price: number | null; billNo: string | null; locationId: string | null }) => api.post<{ added: number; accessionNos: string[] }>(`/library/books/${id}/copies`, input),
  updateCopy: (id: string, input: CopyInput) => api.put<Book>(`/library/copies/${id}`, input),
  deleteCopy: (id: string) => api.delete<Book>(`/library/copies/${id}`),
  labels: (q: { book?: string; from?: string; to?: string; ids?: string }) => api.get<{ school: string; labels: { id: string; accessionNo: string; title: string; authors: string | null; callNumber: string | null; location: string | null }[] }>('/library/labels', { params: clean(q) }),
  upload: (file: File) => uploadFile<{ id: string; name: string }>('/library/files', 'file', file),
  coverPath: (id: string) => `/library/books/${id}/cover`,
  filePath: (id: string) => `/library/books/${id}/file`,

  summary: () => api.get<Summary>('/library/summary', { quiet: true }),
  members: (q: string) => api.get<MemberHit[]>('/library/members', { params: { q }, quiet: true }),
  member: (kind: MemberKind, id: string) => api.get<Member>(`/library/members/${kind}/${id}`),
  findCopy: (accession: string) => api.get<{ id: string; accessionNo: string; status: string; bookId: string; title: string; authors: string | null; kind: BookKind }>('/library/copies/find', { params: { accession } }),
  issue: (input: { memberKind: MemberKind; memberId: string; accessionNo: string; dueOn?: string; override?: boolean }) => api.post<{ loanId: string; title: string; accessionNo: string; dueOn: string; member: Member }>('/library/issue', input),
  returnBook: (input: { accessionNo: string; conditionId?: string | null; waiveLate?: boolean }) => api.post<{ title: string; accessionNo: string; lateDays: number; lateFine: number; fines: { kind: string; amount: number }[]; heldFor: { member: string; until: string } | null; member: Member }>('/library/return', input),
  renew: (loanId: string) => api.post<{ title: string; dueOn: string; renewals: number }>(`/library/loans/${loanId}/renew`),
  lost: (loanId: string) => api.post<{ charged: number; lateFine: number }>(`/library/loans/${loanId}/lost`),
  loans: (q: { show?: string; search?: string; from?: string; to?: string; page?: number; pageSize?: number }) => api.get<Page<LoanRow>>('/library/loans', { params: clean(q) }),

  reservations: (q: { show?: string; page?: number }) => api.get<Page<ReservationRow>>('/library/reservations', { params: clean(q) }),
  reserve: (input: { bookId: string; memberKind: MemberKind; memberId: string }) => api.post<{ id: string; ready: boolean; place: number }>('/library/reservations', input),
  cancelReservation: (id: string) => api.post(`/library/reservations/${id}/cancel`),

  fines: (q: { show?: string; payAt?: string; search?: string; page?: number }) => api.get<Page<FineRow> & { sum: { amount: number; waived: number } }>('/library/fines', { params: clean(q) }),
  waive: (id: string, amount: number, reason: string) => api.post(`/library/fines/${id}/waive`, { amount, reason }),
  collect: (id: string) => api.post<{ receiptNo: string; amount: number }>(`/library/fines/${id}/collect`),

  stockChecks: () => api.get<{ id: string; name: string; status: string; startedAt: string; closedAt: string | null; scanned: number }[]>('/library/stock'),
  startStock: (name: string) => api.post<StockCheck>('/library/stock', { name }),
  stock: (id: string) => api.get<StockCheck>(`/library/stock/${id}`),
  scanStock: (id: string, accessionNo: string) => api.postRead<{ accessionNo: string; title: string; note: string | null }>(`/library/stock/${id}/scan`, { accessionNo }),
  closeStock: (id: string, markLost: boolean) => api.post<StockCheck>(`/library/stock/${id}/close`, { markLost }),

  mine: () => api.get<MyLibrary>('/library/mine'),
  renewMine: (loanId: string) => api.post<{ title: string; dueOn: string }>(`/library/mine/renew/${loanId}`),
  reserveMine: (input: { bookId: string; memberKind: MemberKind; memberId: string }) => api.post<{ id: string; ready: boolean; place: number }>('/library/mine/reserve', input),
  cancelMine: (id: string) => api.post(`/library/mine/reservations/${id}/cancel`),
};

export const showDate = (iso: string | null | undefined) => (iso ? new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }) : '');
export const rupees = (n: number) => `₹${n.toLocaleString('en-IN')}`;
export const todayIST = () => new Date(Date.now() + 5.5 * 3_600_000).toISOString().slice(0, 10);
