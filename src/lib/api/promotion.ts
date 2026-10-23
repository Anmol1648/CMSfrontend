import { api } from './client';

/** Promotion to the next session, and transfer certificates (cmsbackend/src/modules/promotion). */

export type Outcome = 'promoted' | 'detained' | 'passed_out' | 'leaving';

export interface PromotionOverview {
  from: { id: string; name: string; status: string };
  to: { id: string; name: string; status: string } | null;
  sections: { id: string; label: string; className: string; students: number; done: number; promoted: number; detained: number; passedOut: number; leaving: number; nextClass: string | null }[];
}

export interface SectionPromotion {
  from: { id: string; name: string };
  to: { id: string; name: string; status: string } | null;
  section: { id: string; label: string; className: string };
  nextClass: { id: string; name: string } | null;
  missing: string | null;
  targets: { id: string; label: string }[];
  sameClassSections: { id: string; label: string }[];
  students: {
    id: string;
    name: string;
    admissionNo: string;
    roll: number | null;
    attendance: number | null;
    dues: number;
    /** The session's final result, once published (Passed / Needs improvement). */
    result: string | null;
    done: { outcome: Outcome; toSection: string | null; carried: number; at: string } | null;
    suggestion: { outcome: Outcome; toSectionId: string | null };
  }[];
  defaults: { promoted: string | null; detained: string | null };
}

export interface Tc {
  id: string;
  status: 'requested' | 'issued' | 'cancelled';
  tcNo: string | null;
  student: { id: string; name: string; admissionNo: string; status: string; section: string | null };
  applicationDate: string;
  leavingDate: string;
  reasonId: string | null;
  reason: string | null;
  lastClass: string | null;
  result: string | null;
  conduct: string;
  remarks: string | null;
  clearances: { id: string; label: string; done: boolean; by: string | null; at: string | null }[];
  cleared: boolean;
  requestedBy: string | null;
  issuedBy: string | null;
  issuedAt: string | null;
  printCount: number;
  cancelNote: string | null;
  dues?: { total: number; by: { year: string; amount: number }[] };
}

export const promotionApi = {
  overview: (year: string) => api.get<PromotionOverview>('/promotion', { params: { year } }),
  section: (year: string, section: string) => api.get<SectionPromotion>('/promotion/section', { params: { year, section } }),
  promote: (input: { year: string; section: string; students: { studentId: string; outcome: Outcome; toSectionId?: string | null }[] }) =>
    api.post<{ promoted: number; detained: number; passedOut: number; leaving: number; carried: number; warnings: string[] }>('/promotion', input),
  undo: (year: string, studentIds: string[]) => api.post<{ undone: number; warnings: string[] }>('/promotion/undo', { year, studentIds }),
};

export const tcApi = {
  list: (status: string, search?: string) => api.get<Tc[]>('/tc', { params: { status, ...(search ? { search } : {}) } }),
  ofStudent: (studentId: string) => api.get<Tc[]>(`/tc/student/${studentId}`),
  get: (id: string) => api.get<Tc>(`/tc/${id}`),
  request: (input: { studentId: string; leavingDate: string; applicationDate?: string; reasonId?: string | null; remarks?: string | null }) => api.post<Tc>('/tc', input),
  save: (id: string, input: { leavingDate: string; reasonId: string | null; lastClass: string | null; result: string | null; conduct: string; remarks: string | null }) => api.put<Tc>(`/tc/${id}`, input),
  clear: (id: string, clearanceId: string, done: boolean) => api.post<Tc>(`/tc/${id}/clearances`, { clearanceId, done }),
  issue: (id: string) => api.post<Tc>(`/tc/${id}/issue`),
  cancel: (id: string, note: string) => api.post<Tc>(`/tc/${id}/cancel`, { note }),
};

export const OUTCOME: Record<Outcome, { label: string; tone: 'success' | 'warning' | 'primary' | 'danger' }> = {
  promoted: { label: 'Promoted', tone: 'success' },
  detained: { label: 'Kept back', tone: 'warning' },
  passed_out: { label: 'Passed out', tone: 'primary' },
  leaving: { label: 'Leaving (TC)', tone: 'danger' },
};
