import { api, downloadFile, uploadFile } from './client';
import type { Paged } from './admin';

/** Staff (cmsbackend/src/modules/staff). */

export interface Ref {
  id: string;
  name: string;
}

export type StaffStatus = 'working' | 'relieved' | 'retired' | 'suspended';

export interface StaffListItem {
  id: string;
  employeeCode: string;
  name: string;
  department: Ref | null;
  designation: Ref | null;
  staffType: Ref | null;
  mobile: string | null;
  status: StaffStatus;
  canSignIn: boolean;
  photoUrl: string | null;
}

export interface Qualification {
  id?: string;
  qualification: Ref | null;
  subject: string | null;
  institution: string | null;
  year: number | null;
}

export interface Experience {
  id?: string;
  organisation: string;
  role: string | null;
  fromDate: string | null;
  toDate: string | null;
}

export interface Staff {
  id: string;
  employeeCode: string;
  joiningDate: string;
  name: string;
  firstName: string;
  middleName: string | null;
  lastName: string | null;
  dateOfBirth: string | null;
  gender: Ref | null;
  bloodGroup: Ref | null;
  religion: Ref | null;
  casteCategory: Ref | null;
  maritalStatus: Ref | null;
  mobile: string | null;
  email: string | null;
  aadhaar: string | null;
  pan: string | null;
  addressLine: string | null;
  state: Ref | null;
  district: Ref | null;
  city: Ref | null;
  pinCode: string | null;
  department: Ref | null;
  designation: Ref | null;
  staffType: (Ref & { teaching: boolean }) | null;
  employmentType: Ref | null;
  teachingPost: Ref | null;
  reportsTo: { id: string; name: string; code: string } | null;
  teachableSubjectIds: string[];
  bank: Ref | null;
  bankAccountNo: string | null;
  ifsc: string | null;
  pfNumber: string | null;
  uan: string | null;
  emergencyName: string | null;
  emergencyPhone: string | null;
  photoUrl: string | null;
  status: StaffStatus;
  statusDate: string | null;
  relievingReason: Ref | null;
  statusNote: string | null;
  login: { id: string; username: string; status: string; lastLoginAt: string | null; roles: Ref[] } | null;
  sensitiveShown: boolean;
  qualifications: Qualification[];
  experience: Experience[];
  documents: { id: string; type: Ref | null; note: string | null; fileName: string; mimeType: string; sizeBytes: number; createdAt: string }[];
  thisYear: { classTeacherOf: { id: string; label: string }[]; teaches: { section: { id: string; label: string }; subject: Ref }[] };
  createdAt: string;
  updatedAt: string;
}

export type StaffFields = Record<string, string | string[] | null | undefined>;

export interface StaffFormConfig {
  required: string[];
  hidden: string[];
  editable: boolean;
  loginDefault: 'teaching' | 'all' | 'none';
  selfEdit: string[];
}

export interface StaffListQuery {
  page?: number;
  pageSize?: number;
  search?: string;
  sort?: string;
  department?: string;
  designation?: string;
  type?: string;
  status?: StaffStatus | '';
}

const params = (q: StaffListQuery) => {
  const p: Record<string, string | number> = {};
  if (q.page) p.page = q.page;
  if (q.pageSize) p.pageSize = q.pageSize;
  if (q.sort) p.sort = q.sort;
  if (q.search?.trim()) p.search = q.search.trim();
  for (const k of ['department', 'designation', 'type', 'status'] as const) if (q[k]) p[`filter[${k}]`] = q[k] as string;
  return p;
};

export interface QualificationInput {
  qualificationId: string | null;
  subject: string | null;
  institution: string | null;
  year: number | null;
}
export interface ExperienceInput {
  organisation: string;
  role: string | null;
  fromDate: string | null;
  toDate: string | null;
}

export interface AssignmentGrid {
  sections: { id: string; label: string; streamId: string | null; classTeacher: Ref | null }[];
  subjects: { id: string; name: string; code: string | null; appliesTo: string[] }[];
  cells: { sectionId: string; subjectId: string; staff: { id: string; name: string; code: string } }[];
}

export interface StaffOption {
  id: string;
  name: string;
  code: string;
  designation: string | null;
  teachableSubjectIds: string[];
}

const s = (id: string) => `/staff/${id}`;
type Login = { username: string; temporaryPassword: string; emailed: boolean };

export const staffApi = {
  list: (q: StaffListQuery) => api.get<Paged<StaffListItem>>('/staff', { params: params(q) }),
  export: (q: StaffListQuery) => downloadFile('/staff/export', params(q), 'staff.xlsx'),
  formConfig: () => api.get<StaffFormConfig>('/staff/form-config'),
  nextCode: () => api.get<{ next: string; editable: boolean; pattern: string }>('/staff/next-code'),
  options: (teaching = false) => api.get<StaffOption[]>('/staff/options', { params: teaching ? { teaching: '1' } : {} }),
  get: (id: string) => api.get<Staff>(s(id)),
  create: (input: { staff: StaffFields; qualifications?: QualificationInput[]; experience?: ExperienceInput[]; login?: { enabled: boolean; roleIds?: string[] } }) =>
    api.post<{ staff: Staff; login: (Login & { for: string }) | null }>('/staff', input, { timeout: 120_000 }),
  update: (id: string, input: StaffFields) => api.patch<Staff>(s(id), input),
  setQualifications: (id: string, list: QualificationInput[]) => api.put<Staff>(`${s(id)}/qualifications`, list),
  setExperience: (id: string, list: ExperienceInput[]) => api.put<Staff>(`${s(id)}/experience`, list),
  setStatus: (id: string, input: { status: StaffStatus; date?: string; relievingReasonId?: string | null; note?: string | null }) => api.post<Staff>(`${s(id)}/status`, input),
  createLogin: (id: string, roleIds?: string[]) => api.post<Login>(`${s(id)}/login`, { roleIds }),
  uploadPhoto: (id: string, file: File) => uploadFile<{ photoUrl: string }>(`${s(id)}/photo`, 'image', file),
  addDocument: (id: string, file: File, typeId?: string) => {
    const form = new FormData();
    form.append('file', file);
    if (typeId) form.append('typeId', typeId);
    return api.post<Staff>(`${s(id)}/documents`, form, { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 120_000 });
  },
  openDocument: (id: string, documentId: string, name: string) => downloadFile(`${s(id)}/documents/${documentId}`, undefined, name),
  removeDocument: (id: string, documentId: string) => api.delete<Staff>(`${s(id)}/documents/${documentId}`),
  me: () => api.get<{ record: Staff; selfEdit: string[] } | null>('/staff/me'),
  updateMe: (input: { fields?: StaffFields; qualifications?: QualificationInput[]; experience?: ExperienceInput[] }) =>
    api.patch<{ record: Staff; selfEdit: string[] }>('/staff/me', { ...input.fields, ...(input.qualifications ? { qualifications: input.qualifications } : {}), ...(input.experience ? { experience: input.experience } : {}) }),
  myTeaching: () => api.get<{ classTeacherOf: { id: string; label: string }[]; teaches: { section: { id: string; label: string }; subject: Ref }[] }>('/staff/me/teaching'),
  grid: (yearId: string, classId: string) => api.get<AssignmentGrid>('/staff/teaching/grid', { params: { year: yearId, class: classId } }),
  assign: (sectionId: string, subjectId: string, staffId: string | null) => api.put<AssignmentGrid>('/staff/teaching', { sectionId, subjectId, staffId }),
  copyTeaching: (toYearId: string, fromYearId: string) => api.post<{ copied: number }>('/staff/teaching/copy', { toYearId, fromYearId }),
};
