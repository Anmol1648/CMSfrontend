import { api, downloadFile } from './client';
import { Move, moveBody } from '@/lib/order';

/** Configuration → Academic (cmsbackend/src/modules/academic). */

export interface AcademicYear {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  status: 'open' | 'closed';
  sections: number;
  classSubjects: number;
  updatedAt: string;
}

export interface YearOption {
  id: string;
  name: string;
  isCurrent: boolean;
  status: 'open' | 'closed';
}

export interface Ref {
  id: string;
  name: string;
}

export interface Section {
  id: string;
  academicYearId: string;
  classId: string;
  name: string;
  stream: Ref | null;
  capacity: number | null;
  room: string | null;
  classTeacher: { id: string; name: string; code: string } | null;
  sortOrder: number;
  isActive: boolean;
}

export interface SchoolClass {
  id: string;
  name: string;
  shortName: string | null;
  group: Ref | null;
  hasStreams: boolean;
  /** Promoted to this class (empty = the next one in order). */
  nextClassId: string | null;
  sortOrder: number;
  isActive: boolean;
  sections: Section[];
  /** In the session asked for: runs there (admissions open, seats), or null = not in that session. */
  inYear?: { admissionsOpen: boolean; seats: number | null } | null;
}

export interface Subject {
  id: string;
  name: string;
  code: string | null;
  type: Ref | null;
  assessment: 'scholastic' | 'co_scholastic';
  sortOrder: number;
  isActive: boolean;
  usedBy: number;
}

export interface ClassSubject {
  id: string;
  streamId: string | null;
  stream: Ref | null;
  subject: { id: string; name: string; code: string | null; assessment: Subject['assessment']; isActive: boolean };
  isOptional: boolean;
  sortOrder: number;
}

export interface YearInput {
  name: string;
  startDate: string;
  endDate: string;
  isCurrent?: boolean;
  copyFromYearId?: string;
  /** The classes the session runs (empty = those of the year copied from). */
  classIds?: string[];
  /** Also copy the fee set-up of the year copied from. */
  copyFees?: boolean;
}

export interface ClassInput {
  name?: string;
  shortName?: string | null;
  groupId?: string | null;
  hasStreams?: boolean;
  isActive?: boolean;
  nextClassId?: string | null;
}

export interface SectionInput {
  academicYearId?: string;
  classId?: string;
  name?: string;
  streamId?: string | null;
  capacity?: number | null;
  room?: string | null;
  classTeacherId?: string | null;
  isActive?: boolean;
}

export interface SubjectInput {
  name?: string;
  code?: string | null;
  typeId?: string | null;
  assessment?: Subject['assessment'];
  isActive?: boolean;
}

/** A session's classes: every class of the catalogue, running there or not, and what uses it. */
export interface YearClasses {
  year: { id: string; name: string; status: string };
  classes: {
    id: string;
    name: string;
    shortName: string | null;
    classActive: boolean;
    runs: boolean;
    admissionsOpen: boolean;
    seats: number | null;
    seatsLeft: number | null;
    used: { sections: number; students: number; fees: number; timetable: number; enquiries: number; subjects: number };
  }[];
}

export const academicApi = {
  years: () => api.get<AcademicYear[]>('/academic/years'),
  yearOptions: () => api.get<YearOption[]>('/academic/years/options'),
  suggestYear: () => api.get<Pick<YearInput, 'name' | 'startDate' | 'endDate'>>('/academic/years/suggest'),
  createYear: (input: YearInput) => api.post<AcademicYear>('/academic/years', input),
  updateYear: (id: string, input: Partial<YearInput>) => api.patch<AcademicYear>(`/academic/years/${id}`, input),
  setCurrent: (id: string) => api.post<AcademicYear>(`/academic/years/${id}/current`),
  closeYear: (id: string) => api.post<AcademicYear>(`/academic/years/${id}/close`),
  reopenYear: (id: string) => api.post<AcademicYear>(`/academic/years/${id}/reopen`),
  deleteYear: (id: string) => api.delete<{ id: string }>(`/academic/years/${id}`),
  copyYear: (id: string, fromYearId: string, what: { sections: boolean; subjects: boolean }) =>
    api.post<{ sections: number; subjects: number }>(`/academic/years/${id}/copy`, { fromYearId, ...what }),

  /** Dropdowns (any signed-in user): the classes a session runs (the current one when no year is given). */
  classOptions: (yearId?: string) => api.get<{ id: string; name: string; shortName: string | null; hasStreams: boolean; admissionsOpen?: boolean }[]>('/academic/classes/options', { params: yearId ? { year: yearId } : {} }),
  yearClasses: (yearId: string) => api.get<YearClasses>(`/academic/years/${yearId}/classes`),
  saveYearClasses: (yearId: string, classes: { classId: string; admissionsOpen: boolean; seats: number | null }[]) => api.put<YearClasses>(`/academic/years/${yearId}/classes`, { classes }),
  sectionOptions: (yearId: string, classId?: string) =>
    api.get<{ id: string; name: string; classId: string; label: string }[]>('/academic/sections/options', { params: { year: yearId, ...(classId ? { class: classId } : {}) } }),
  classes: (yearId?: string) => api.get<SchoolClass[]>('/academic/classes', { params: yearId ? { year: yearId } : {} }),
  createClass: (input: ClassInput) => api.post<SchoolClass>('/academic/classes', input),
  updateClass: (id: string, input: ClassInput) => api.patch<SchoolClass>(`/academic/classes/${id}`, input),
  deleteClass: (id: string) => api.delete<{ id: string }>(`/academic/classes/${id}`),
  moveClass: (id: string, move: Move) => api.post<SchoolClass[]>(`/academic/classes/${id}/move`, moveBody(move)),

  createSection: (input: SectionInput) => api.post<Section>('/academic/sections', input),
  updateSection: (id: string, input: SectionInput) => api.patch<Section>(`/academic/sections/${id}`, input),
  deleteSection: (id: string) => api.delete<{ id: string }>(`/academic/sections/${id}`),
  moveSection: (id: string, move: Move) => api.post<Section>(`/academic/sections/${id}/move`, moveBody(move)),
  exportSections: (yearId: string) => downloadFile('/academic/sections/export', { year: yearId }, 'sections.xlsx'),
  teacherOptions: () => api.get<{ id: string; name: string; code: string }[]>('/academic/teachers/options'),

  subjects: () => api.get<Subject[]>('/academic/subjects'),
  subjectOptions: () => api.get<{ id: string; name: string; code: string | null; assessment: Subject['assessment'] }[]>('/academic/subjects/options'),
  createSubject: (input: SubjectInput) => api.post<Subject>('/academic/subjects', input),
  updateSubject: (id: string, input: SubjectInput) => api.patch<Subject>(`/academic/subjects/${id}`, input),
  deleteSubject: (id: string) => api.delete<{ id: string }>(`/academic/subjects/${id}`),
  moveSubject: (id: string, move: Move) => api.post<Subject[]>(`/academic/subjects/${id}/move`, moveBody(move)),
  exportSubjects: () => downloadFile('/academic/subjects/export', undefined, 'subjects.xlsx'),

  classSubjects: (yearId: string, classId: string) => api.get<ClassSubject[]>('/academic/class-subjects', { params: { year: yearId, class: classId } }),
  setClassSubjects: (input: { academicYearId: string; classId: string; streamId: string | null; subjects: { subjectId: string; isOptional: boolean }[] }) =>
    api.put<ClassSubject[]>('/academic/class-subjects', input),
};
