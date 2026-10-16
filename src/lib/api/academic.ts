import { api, downloadFile } from './client';

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
  classTeacher: { id: string; displayName: string; username: string } | null;
  sortOrder: number;
  isActive: boolean;
}

export interface SchoolClass {
  id: string;
  name: string;
  shortName: string | null;
  group: Ref | null;
  hasStreams: boolean;
  sortOrder: number;
  isActive: boolean;
  sections: Section[];
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
}

export interface ClassInput {
  name?: string;
  shortName?: string | null;
  groupId?: string | null;
  hasStreams?: boolean;
  isActive?: boolean;
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

type Direction = 'up' | 'down';

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

  classes: (yearId?: string) => api.get<SchoolClass[]>('/academic/classes', { params: yearId ? { year: yearId } : {} }),
  createClass: (input: ClassInput) => api.post<SchoolClass>('/academic/classes', input),
  updateClass: (id: string, input: ClassInput) => api.patch<SchoolClass>(`/academic/classes/${id}`, input),
  deleteClass: (id: string) => api.delete<{ id: string }>(`/academic/classes/${id}`),
  moveClass: (id: string, direction: Direction) => api.post<SchoolClass[]>(`/academic/classes/${id}/move`, { direction }),

  createSection: (input: SectionInput) => api.post<Section>('/academic/sections', input),
  updateSection: (id: string, input: SectionInput) => api.patch<Section>(`/academic/sections/${id}`, input),
  deleteSection: (id: string) => api.delete<{ id: string }>(`/academic/sections/${id}`),
  moveSection: (id: string, direction: Direction) => api.post<Section>(`/academic/sections/${id}/move`, { direction }),
  exportSections: (yearId: string) => downloadFile('/academic/sections/export', { year: yearId }, 'sections.xlsx'),
  teacherOptions: () => api.get<{ id: string; displayName: string; username: string }[]>('/academic/teachers/options'),

  subjects: () => api.get<Subject[]>('/academic/subjects'),
  subjectOptions: () => api.get<{ id: string; name: string; code: string | null; assessment: Subject['assessment'] }[]>('/academic/subjects/options'),
  createSubject: (input: SubjectInput) => api.post<Subject>('/academic/subjects', input),
  updateSubject: (id: string, input: SubjectInput) => api.patch<Subject>(`/academic/subjects/${id}`, input),
  deleteSubject: (id: string) => api.delete<{ id: string }>(`/academic/subjects/${id}`),
  moveSubject: (id: string, direction: Direction) => api.post<Subject[]>(`/academic/subjects/${id}/move`, { direction }),
  exportSubjects: () => downloadFile('/academic/subjects/export', undefined, 'subjects.xlsx'),

  classSubjects: (yearId: string, classId: string) => api.get<ClassSubject[]>('/academic/class-subjects', { params: { year: yearId, class: classId } }),
  setClassSubjects: (input: { academicYearId: string; classId: string; streamId: string | null; subjects: { subjectId: string; isOptional: boolean }[] }) =>
    api.put<ClassSubject[]>('/academic/class-subjects', input),
};
