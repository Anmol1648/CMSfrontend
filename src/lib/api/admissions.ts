import { api, downloadFile } from './client';
import type { Paged } from './admin';

/** Admission enquiries (cmsbackend/src/modules/admissions). */

export interface Ref {
  id: string;
  name: string;
}

export type EnquiryStatus = 'open' | 'won' | 'lost';
export type TestResult = 'pending' | 'passed' | 'failed' | 'not_needed';

export interface Stage extends Ref {
  won: boolean;
  lost: boolean;
  isActive: boolean;
}

export interface EnquiryListItem {
  id: string;
  enquiryNo: string;
  enquiryDate: string;
  studentName: string;
  parentName: string;
  mobile: string;
  class: { id: string; name: string; shortName: string | null };
  academicYear: Ref;
  source: Ref | null;
  stage: Ref;
  status: EnquiryStatus;
  assignedTo: { id: string; name: string; employeeCode: string } | null;
  nextFollowUp: string | null;
  followUp: 'overdue' | 'today' | 'upcoming' | null;
  registrationNo: string | null;
  testResult: TestResult;
  online: boolean;
  studentId: string | null;
}

export interface FollowUp {
  id: string;
  date: string;
  outcome: Ref | null;
  note: string | null;
  nextDate: string | null;
  by: string | null;
  createdAt: string;
}

export interface Enquiry extends EnquiryListItem {
  studentFirstName: string;
  studentLastName: string | null;
  dateOfBirth: string | null;
  gender: Ref | null;
  relation: Ref | null;
  email: string | null;
  area: string | null;
  currentSchool: string | null;
  remarks: string | null;
  lostReason: Ref | null;
  registrationDate: string | null;
  testDate: string | null;
  testScore: string | null;
  student: { id: string; admissionNo: string; name: string } | null;
  convertedAt: string | null;
  createdAt: string;
  followUps: FollowUp[];
}

export interface EnquiryFormConfig {
  registration: boolean;
  test: boolean;
  followUpDays: number;
  publicForm: boolean;
  duplicateCheck: 'warn' | 'block' | 'off';
  stages: Stage[];
  numbers: { enquiryNo: string; registrationNo: string };
}

export interface EnquirySummary {
  total: number;
  open: number;
  won: number;
  lost: number;
  overdue: number;
  dueToday: number;
  stages: (Stage & { count: number })[];
}

export type EnquiryFields = Record<string, string | null | undefined>;

export interface EnquiryListQuery {
  page?: number;
  pageSize?: number;
  search?: string;
  sort?: string;
  order?: 'asc' | 'desc';
  year?: string;
  class?: string;
  stage?: string;
  source?: string;
  assigned?: string;
  status?: EnquiryStatus | '';
  due?: 'overdue' | 'today' | 'upcoming' | 'none' | '';
  online?: 'yes' | 'no' | '';
}

const FILTERS = ['year', 'class', 'stage', 'source', 'assigned', 'status', 'due', 'online'] as const;
const params = (q: EnquiryListQuery) => {
  const p: Record<string, string | number> = {};
  if (q.page) p.page = q.page;
  if (q.pageSize) p.pageSize = q.pageSize;
  if (q.sort) p.sort = q.sort;
  if (q.order) p.order = q.order;
  if (q.search?.trim()) p.search = q.search.trim();
  for (const k of FILTERS) if (q[k]) p[`filter[${k}]`] = q[k] as string;
  return p;
};

export interface Tally {
  total: number;
  won: number;
  lost: number;
  open: number;
  conversion: number;
}

export interface AdmissionReport {
  academicYearId: string | null;
  total: Tally;
  online: number;
  stages: (Ref & { won: boolean; lost: boolean; count: number })[];
  bySource: (Tally & { id: string | null; name: string })[];
  byCounsellor: (Tally & { id: string | null; name: string })[];
  byMonth: (Tally & { month: string })[];
  lostReasons: { id: string | null; name: string; count: number }[];
  byClass: (Tally & { id: string; name: string; capacity: number | null; enrolled: number; seatsLeft: number | null })[];
}

export interface AdmissionPrefill {
  enquiryId: string;
  enquiryNo: string;
  registrationNo: string | null;
  academicYearId: string;
  classId: string;
  student: { firstName: string; lastName: string | null; dateOfBirth: string | null; genderId: string | null; previousSchool: string | null };
  guardian: { name: string; relationId: string | null; mobile: string; email: string | null };
}

const e = (id: string) => `/admissions/enquiries/${id}`;

export const admissionsApi = {
  list: (q: EnquiryListQuery) => api.get<Paged<EnquiryListItem>>('/admissions/enquiries', { params: params(q) }),
  export: (q: EnquiryListQuery) => downloadFile('/admissions/enquiries/export', params(q), 'enquiries.xlsx'),
  summary: (year?: string) => api.get<EnquirySummary>('/admissions/enquiries/summary', { params: year ? { year } : {} }),
  formConfig: () => api.get<EnquiryFormConfig>('/admissions/enquiries/form-config'),
  get: (id: string) => api.get<Enquiry>(e(id)),
  create: (input: EnquiryFields) => api.post<{ enquiry: Enquiry; warning?: string }>('/admissions/enquiries', input),
  update: (id: string, input: EnquiryFields) => api.patch<Enquiry>(e(id), input),
  remove: (id: string) => api.delete<{ id: string }>(e(id)),
  setStage: (id: string, input: { stageId: string; lostReasonId?: string | null; note?: string | null }) => api.post<Enquiry>(`${e(id)}/stage`, input),
  addFollowUp: (id: string, input: { date?: string; outcomeId?: string | null; note?: string | null; nextDate?: string | null; stageId?: string; lostReasonId?: string | null }) =>
    api.post<Enquiry>(`${e(id)}/follow-ups`, input),
  removeFollowUp: (id: string, followUpId: string) => api.delete<Enquiry>(`${e(id)}/follow-ups/${followUpId}`),
  register: (id: string, input: { registrationDate?: string; stageId?: string }) => api.post<Enquiry>(`${e(id)}/register`, input),
  setTest: (id: string, input: { testDate?: string | null; testScore?: string | null; testResult: TestResult; stageId?: string }) => api.put<Enquiry>(`${e(id)}/test`, input),
  admissionPrefill: (id: string) => api.get<AdmissionPrefill>(`${e(id)}/admission`),
  report: (q: { year?: string; from?: string; to?: string }) => api.get<AdmissionReport>('/admissions/reports', { params: Object.fromEntries(Object.entries(q).filter(([, v]) => v)) }),

  /** The website form (no login). */
  publicForm: () => api.get<{ enabled: boolean; classes: Ref[]; academicYear: Ref | null }>('/public/enquiry'),
  submitPublic: (input: Record<string, string | null>) => api.post<{ enquiryNo: string | null }>('/public/enquiry', input),
};

export const TEST_RESULT: Record<TestResult, string> = { pending: 'Pending', passed: 'Passed', failed: 'Not cleared', not_needed: 'Not needed' };
