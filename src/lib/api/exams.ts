import { api } from './client';

/** Exams (cmsbackend/src/modules/exams): set-up, date sheets, marks entry, results, report cards. */

export type ExamStatus = 'draft' | 'open' | 'locked' | 'published';
export interface Part {
  key: string;
  label: string;
  max: number;
}
export interface Band {
  grade: string;
  min?: number;
  point?: number;
  remark?: string;
}
export interface GradeScale {
  id: string;
  name: string;
  kind: 'marks' | 'descriptive';
  bands: Band[];
}
export interface ResultRule {
  id: string;
  classGroupId: string | null;
  group: string;
  descriptive: boolean;
  gradeScaleId: string | null;
  coScaleId: string | null;
  passPercent: number;
  passEachPart: boolean;
  graceMarks: number;
  graceSubjects: number;
  showRank: boolean;
  showAttendance: boolean;
  cardFormat?: string;
}
export type ResultRuleInput = Omit<ResultRule, 'id' | 'group'>;
export interface Term {
  id: string;
  name: string;
  startDate: string | null;
  endDate: string | null;
}
export interface Exam {
  id: string;
  name: string;
  shortName: string | null;
  termId: string | null;
  term: string | null;
  classIds: string[];
  components: Part[];
  weightage: number;
  countsInResult: boolean;
  status: ExamStatus;
  entryDeadline: string | null;
  publishedAt: string | null;
  subjects: number;
  datesheetPublished: boolean;
}
export interface ExamInput {
  name: string;
  shortName: string | null;
  termId: string | null;
  classIds: string[];
  components: Part[];
  weightage: number;
  countsInResult: boolean;
  entryDeadline: string | null;
}
export interface ExamSubjectRow {
  id: string;
  subjectId: string;
  subject: string;
  code: string | null;
  components: Part[];
  max: number;
  date: string | null;
  startTime: string | null;
  endTime: string | null;
  room: string | null;
  invigilatorId: string | null;
  invigilator: string | null;
  marksEntered: number;
}
export interface ExamSubjects {
  exam: Exam;
  classes: { id: string; name: string; subjects: ExamSubjectRow[] }[];
  warnings?: string[];
}
export interface EditState {
  can: boolean;
  why: string | null;
  moderating?: boolean;
}
export interface Sheets {
  exam: { id: string; name: string; status: ExamStatus; entryDeadline: string | null };
  edit: EditState;
  sheets: { examSubjectId: string; sectionId: string; section: string; subject: string; max: number; mine: boolean; entered: number; submitted?: boolean }[];
  classTeacherOf: { sectionId: string; section: string }[];
}
/** "P" (present) or a code from Masters → Mark statuses (AB, ML…). */
export type MarkStatus = string;
export interface ExamLabels {
  present: string;
  stages: Record<ExamStatus, string>;
  finalName: string;
  kinds: { marks: string; descriptive: string };
  lockBeforePublish: boolean;
  statuses: { code: string; name: string; active: boolean; counts: 'zero' | 'leave_out' | 'average' }[];
}
export interface Sheet {
  exam: { id: string; name: string; status: ExamStatus };
  subject: string;
  section: string;
  parts: Part[];
  max: number;
  descriptive: boolean;
  grades: string[];
  passPercent: number;
  edit: EditState;
  lock?: { by: string; at: string; canUnlock: boolean } | null;
  students: { id: string; name: string; admissionNo: string; roll: number | null; status: MarkStatus; marks: Record<string, number | string | null>; total: number | null; entered: boolean }[];
}
export interface ClassSheet {
  exam: { id: string; name: string; status: ExamStatus };
  section: string;
  areas: { id: string; name: string }[];
  grades: string[];
  edit: EditState;
  students: { id: string; name: string; roll: number | null; coGrades: Record<string, string>; discipline: string; remark: string }[];
}
export interface Progress {
  exam: { id: string; name: string; status: ExamStatus };
  rows: { examSubjectId: string; sectionId: string; section: string; subject: string; teacher: string | null; students: number; entered: number }[];
  totals: { sheets: number; complete: number; students: number; entered: number };
}
export type ScopeKind = 'exam' | 'term' | 'final';
export interface StudentResult {
  student: { id: string; name: string; admissionNo: string; roll: number | null };
  subjects: { subjectId: string; subject: string; exams: { examId: string; obtained: number | null; max: number; status: string; grade: string | null }[]; percent: number | null; grade: string | null; passed: boolean | null; grace: number }[];
  totalObtained: number | null;
  totalMax: number | null;
  percent: number | null;
  grade: string | null;
  result: string | null;
  failedSubjects: string[];
  graced: string[];
  rank: number | null;
  promotedTo: string | null;
  co: { area: string; grade: string | null }[];
  discipline: string | null;
  remark: string | null;
  attendance: { days: number; present: number; percent: number | null } | null;
}
export interface Results {
  scope: { kind: ScopeKind; id: string; label: string; published: boolean };
  year: string;
  section: { id: string; label: string; className: string; classTeacher: string | null };
  rule: { descriptive: boolean; passPercent: number; showRank: boolean; showAttendance: boolean; cardFormat?: string };
  exams: { id: string; name: string; shortName: string; weightage: number }[];
  subjects: { id: string; name: string }[];
  areas: string[];
  students: StudentResult[];
  /** A subject teacher's view: only these subjects, no totals, rank, result or report cards. */
  limitedTo: string[] | null;
  analysis: {
    students: number;
    withResult: number;
    passed: number;
    passPercent: number | null;
    average: number | null;
    subjects: { subject: string; students: number; average: number | null; highest: number | null; lowest: number | null; passPercent: number | null; grades: Record<string, number> }[];
    toppers: { name: string; percent: number | null; grade: string | null }[];
    needSupport: { name: string; subjects: string[] }[];
  };
}
export interface ResultChoices {
  exams: { id: string; name: string; status: ExamStatus; published: boolean; classIds: string[] }[];
  terms: { id: string; name: string; published: boolean }[];
  finalPublished: boolean;
  sections: { id: string; label: string; classId: string; inFull: boolean }[];
}

const y = (year: string) => ({ params: { year } });

export const examsApi = {
  scales: () => api.get<GradeScale[]>('/exams/scales'),
  saveScale: (id: string | null, input: Omit<GradeScale, 'id'>) => (id ? api.put<GradeScale[]>(`/exams/scales/${id}`, input) : api.post<GradeScale[]>('/exams/scales', input)),
  deleteScale: (id: string) => api.delete<GradeScale[]>(`/exams/scales/${id}`),
  rules: () => api.get<ResultRule[]>('/exams/rules'),
  saveRule: (id: string | null, input: ResultRuleInput) => (id ? api.put<ResultRule[]>(`/exams/rules/${id}`, input) : api.post<ResultRule[]>('/exams/rules', input)),
  deleteRule: (id: string) => api.delete<ResultRule[]>(`/exams/rules/${id}`),

  labels: () => api.get<ExamLabels>('/exams/labels'),
  terms: (year: string) => api.get<Term[]>('/exams/terms', y(year)),
  saveTerm: (year: string, id: string | null, input: { name: string; startDate: string | null; endDate: string | null }) => (id ? api.put<Term[]>(`/exams/terms/${id}`, input, y(year)) : api.post<Term[]>('/exams/terms', input, y(year))),
  deleteTerm: (id: string) => api.delete<Term[]>(`/exams/terms/${id}`),
  list: (year: string) => api.get<Exam[]>('/exams', y(year)),
  create: (year: string, input: ExamInput) => api.post<Exam>('/exams', input, y(year)),
  save: (id: string, input: ExamInput) => api.put<Exam>(`/exams/${id}`, input),
  remove: (id: string) => api.delete<null>(`/exams/${id}`),
  status: (id: string, status: ExamStatus) => api.post<Exam>(`/exams/${id}/status`, { status }),
  subjects: (id: string) => api.get<ExamSubjects>(`/exams/${id}/subjects`),
  saveSubjects: (id: string, rows: Partial<ExamSubjectRow & { id: string }>[]) => api.put<ExamSubjects>(`/exams/${id}/subjects`, { rows }),
  publishDatesheet: (id: string) => api.post<ExamSubjects>(`/exams/${id}/datesheet`),
  progress: (id: string) => api.get<Progress>(`/exams/${id}/progress`),

  entryExams: (year: string) => api.get<{ id: string; name: string; status: ExamStatus; entryDeadline: string | null }[]>('/exams/entry', y(year)),
  sheets: (examId: string) => api.get<Sheets>(`/exams/${examId}/sheets`),
  sheet: (subject: string, section: string) => api.get<Sheet>('/exams/sheet', { params: { subject, section } }),
  saveSheet: (subject: string, section: string, rows: { studentId: string; status: MarkStatus; marks: Record<string, number | string | null> }[]) => api.put<Sheet>('/exams/sheet', { rows }, { params: { subject, section } }),
  classSheet: (examId: string, section: string) => api.get<ClassSheet>(`/exams/${examId}/class-sheet`, { params: { section } }),
  saveClassSheet: (examId: string, section: string, rows: { studentId: string; coGrades: Record<string, string>; discipline: string | null; remark: string | null }[]) => api.put<ClassSheet>(`/exams/${examId}/class-sheet`, { rows }, { params: { section } }),

  choices: (year: string) => api.get<ResultChoices>('/exams/results/choices', y(year)),
  results: (scope: ScopeKind, id: string, section: string) => api.get<Results>('/exams/results', { params: { scope, id, section } }),
  publishScope: (year: string, scope: 'term' | 'final', termId: string | null, publish: boolean) => api.post<{ published: boolean }>('/exams/results/publish', { year, scope, termId, publish }),
  mine: () => api.get<{ student: { id: string; name: string }; cards: { scope: ScopeKind; id: string; label: string; year: string; sectionId: string; cardFormat?: string }[] }[]>('/exams/mine'),
};

export const EXAM_STATUS: Record<ExamStatus, { label: string; tone: 'neutral' | 'primary' | 'warning' | 'success' }> = {
  draft: { label: 'Being set up', tone: 'neutral' },
  open: { label: 'Marks entry open', tone: 'primary' },
  locked: { label: 'Entry locked', tone: 'warning' },
  published: { label: 'Results published', tone: 'success' },
};
