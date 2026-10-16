import { api, downloadFile, uploadFile } from './client';
import type { Paged } from './admin';

/** Students (cmsbackend/src/modules/students). */

export interface Ref {
  id: string;
  name: string;
}

export type StudentStatus = 'active' | 'left' | 'passed_out' | 'struck_off';

export interface StudentListItem {
  id: string;
  admissionNo: string;
  name: string;
  gender: Ref | null;
  dateOfBirth: string | null;
  status: StudentStatus;
  photoUrl: string | null;
  section: { id: string; label: string; classId: string };
  rollNumber: number | null;
  house: Ref | null;
  contact: { name: string; mobile: string | null; relation: Ref | null } | null;
}

export interface Guardian {
  id: string;
  relation: Ref | null;
  name: string;
  mobile: string | null;
  email: string | null;
  occupation: Ref | null;
  qualification: Ref | null;
  incomeRange: Ref | null;
  aadhaar: string | null;
  isPrimary: boolean;
  login: { id: string; username: string; status: string } | null;
}

export interface Enrolment {
  id: string;
  academicYear: { id: string; name: string; isCurrent: boolean };
  section: { id: string; label: string; classId: string; className: string; stream: Ref | null };
  rollNumber: number | null;
  house: Ref | null;
  optionalSubjectIds: string[];
}

export interface StudentDocument {
  id: string;
  type: Ref | null;
  note: string | null;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
}

export interface Student {
  id: string;
  admissionNo: string;
  admissionDate: string;
  admissionType: Ref | null;
  name: string;
  firstName: string;
  middleName: string | null;
  lastName: string | null;
  dateOfBirth: string | null;
  gender: Ref | null;
  bloodGroup: Ref | null;
  religion: Ref | null;
  casteCategory: Ref | null;
  motherTongue: Ref | null;
  nationality: Ref | null;
  disability: Ref | null;
  category: Ref | null;
  aadhaar: string | null;
  apaarId: string | null;
  pen: string | null;
  mobile: string | null;
  email: string | null;
  addressLine: string | null;
  state: Ref | null;
  district: Ref | null;
  city: Ref | null;
  pinCode: string | null;
  previousSchool: string | null;
  previousBoard: Ref | null;
  previousClass: string | null;
  tcNumber: string | null;
  medicalNotes: string | null;
  emergencyName: string | null;
  emergencyPhone: string | null;
  photoUrl: string | null;
  status: StudentStatus;
  statusDate: string | null;
  leavingReason: Ref | null;
  statusNote: string | null;
  login: { id: string; username: string; status: string; lastLoginAt: string | null } | null;
  sensitiveShown: boolean;
  family: { id: string; guardians: Guardian[]; siblings: { id: string; name: string; admissionNo: string; status: StudentStatus }[] } | null;
  enrolments: Enrolment[];
  documents: StudentDocument[];
  createdAt: string;
  updatedAt: string;
}

/** Fields the form sends (ids of master options, dates as YYYY-MM-DD). */
export type StudentFields = Partial<{
  admissionNo: string;
  admissionDate: string;
  admissionTypeId: string | null;
  firstName: string;
  middleName: string | null;
  lastName: string | null;
  dateOfBirth: string | null;
  genderId: string | null;
  bloodGroupId: string | null;
  religionId: string | null;
  casteCategoryId: string | null;
  motherTongueId: string | null;
  nationalityId: string | null;
  disabilityId: string | null;
  categoryId: string | null;
  aadhaar: string | null;
  apaarId: string | null;
  pen: string | null;
  mobile: string | null;
  email: string | null;
  addressLine: string | null;
  stateId: string | null;
  districtId: string | null;
  cityId: string | null;
  pinCode: string | null;
  previousSchool: string | null;
  previousBoardId: string | null;
  previousClass: string | null;
  tcNumber: string | null;
  medicalNotes: string | null;
  emergencyName: string | null;
  emergencyPhone: string | null;
}>;

export interface GuardianInput {
  relationId?: string | null;
  name: string;
  mobile?: string | null;
  email?: string | null;
  occupationId?: string | null;
  qualificationId?: string | null;
  incomeRangeId?: string | null;
  aadhaar?: string | null;
  isPrimary?: boolean;
}

export interface EnrolmentInput {
  academicYearId: string;
  sectionId: string;
  rollNumber?: number | null;
  houseId?: string | null;
  optionalSubjectIds?: string[];
}

export interface FormConfig {
  required: string[];
  hidden: string[];
  editable: boolean;
  studentLogin: 'auto' | 'on_request' | 'off';
  parentLogin: 'auto' | 'on_request' | 'off';
  rollOrder: string;
  houses: boolean;
  capacity: 'warn' | 'block' | 'off';
}

export interface LoginCreated {
  for: string;
  username: string;
  temporaryPassword: string;
  emailed: boolean;
}

export interface FamilyMatch {
  id: string;
  guardians: { name: string; mobile: string | null; relation: string | null }[];
  students: { id: string; name: string; admissionNo: string; status: StudentStatus }[];
}

export interface StudentListQuery {
  page?: number;
  pageSize?: number;
  search?: string;
  sort?: string;
  order?: 'asc' | 'desc';
  year?: string;
  class?: string;
  section?: string;
  house?: string;
  gender?: string;
  category?: string;
  caste?: string;
  status?: StudentStatus | '';
}

export const studentParams = (q: StudentListQuery) => {
  const p: Record<string, string | number> = {};
  if (q.page) p.page = q.page;
  if (q.pageSize) p.pageSize = q.pageSize;
  if (q.sort) p.sort = q.sort;
  if (q.order) p.order = q.order;
  if (q.search?.trim()) p.search = q.search.trim();
  for (const k of ['year', 'class', 'section', 'house', 'gender', 'category', 'caste', 'status'] as const) if (q[k]) p[`filter[${k}]`] = q[k] as string;
  return p;
};

const s = (id: string) => `/students/${id}`;

export const studentsApi = {
  list: (q: StudentListQuery) => api.get<Paged<StudentListItem>>('/students', { params: studentParams(q) }),
  export: (q: StudentListQuery) => downloadFile('/students/export', studentParams(q), 'students.xlsx'),
  get: (id: string) => api.get<Student>(s(id)),
  formConfig: () => api.get<FormConfig>('/students/form-config'),
  nextAdmissionNumber: (sectionId?: string) => api.get<{ next: string; editable: boolean; pattern: string }>('/students/next-admission-number', { params: sectionId ? { section: sectionId } : {} }),
  searchFamilies: (q: string) => api.get<FamilyMatch[]>('/students/families', { params: { q } }),
  admit: (input: { student: StudentFields; familyId?: string; guardians?: GuardianInput[]; enrolment: EnrolmentInput; createLogin?: boolean }) =>
    api.post<{ student: Student; logins: LoginCreated[]; warning: string | null }>('/students', input, { timeout: 120_000 }),
  update: (id: string, input: StudentFields) => api.patch<Student>(s(id), input),
  setStatus: (id: string, input: { status: StudentStatus; date?: string; leavingReasonId?: string | null; note?: string | null }) => api.post<Student>(`${s(id)}/status`, input),
  place: (id: string, input: EnrolmentInput) => api.put<{ warning: string | null; student: Student }>(`${s(id)}/enrolment`, input),
  createLogin: (id: string) => api.post<{ username: string; temporaryPassword: string; emailed: boolean }>(`${s(id)}/login`),
  addGuardian: (id: string, input: GuardianInput) => api.post<Student>(`${s(id)}/guardians`, input),
  updateGuardian: (id: string, guardianId: string, input: Partial<GuardianInput>) => api.patch<Student>(`${s(id)}/guardians/${guardianId}`, input),
  removeGuardian: (id: string, guardianId: string) => api.delete<Student>(`${s(id)}/guardians/${guardianId}`),
  parentLogin: (id: string, guardianId: string) => api.post<{ username: string; temporaryPassword: string; emailed: boolean }>(`${s(id)}/guardians/${guardianId}/login`),
  linkFamily: (id: string, familyId: string) => api.post<Student>(`${s(id)}/family`, { familyId }),
  uploadPhoto: (id: string, file: File) => uploadFile<{ photoUrl: string }>(`${s(id)}/photo`, 'image', file),
  removePhoto: (id: string) => api.delete<{ photoUrl: null }>(`${s(id)}/photo`),
  addDocument: (id: string, file: File, typeId?: string, note?: string) => {
    const form = new FormData();
    form.append('file', file);
    if (typeId) form.append('typeId', typeId);
    if (note) form.append('note', note);
    return api.post<Student>(`${s(id)}/documents`, form, { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 120_000 });
  },
  openDocument: (id: string, documentId: string, name: string) => downloadFile(`${s(id)}/documents/${documentId}`, undefined, name),
  removeDocument: (id: string, documentId: string) => api.delete<Student>(`${s(id)}/documents/${documentId}`),
  renumber: (sectionId: string) => api.post<{ section: string; students: number }>(`/students/sections/${sectionId}/renumber`),
};
