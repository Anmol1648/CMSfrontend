import { api, downloadFile, uploadFile } from './client';
import type { Part, ScopeKind } from './exams';

/** Exams v2 (cmsbackend/src/modules/exams: hall, papers, entry2, after, analysis). */

export interface Session {
  date: string;
  startTime: string;
  endTime: string | null;
  papers: { examSubjectId: string; classId: string; className: string; subjectId: string; subject: string }[];
  seated: number;
  duties: number;
}
export interface Seating {
  exam: { id: string; name: string };
  date: string;
  startTime: string;
  rooms: { roomId: string; room: string; invigilators: { dutyId: string; staffId: string; name: string }[]; seats: { seatNo: number; studentId: string; name: string; admissionNo: string; roll: number | null; section: string }[] }[];
}
export interface AdmitList {
  section: string;
  hold: boolean;
  limit: number;
  students: { id: string; name: string; admissionNo: string; roll: number | null; photo: boolean; due: number; held: boolean; released: boolean }[];
}
export interface PaperRow {
  classId: string;
  className: string;
  subjectId: string;
  subject: string;
  date: string | null;
  max: number;
  paper: { id: string; status: 'draft' | 'final'; questions: number; marks: number; file: boolean } | null;
}
export interface PaperLine {
  section: string;
  questionId: string;
  marks: number;
  type?: string;
  text?: string;
  chapter?: string;
}
export interface Paper {
  id: string | null;
  exam: { id: string; name: string };
  className: string;
  subject: string;
  date: string | null;
  max: number;
  title: string;
  instructions: string | null;
  durationMins: number;
  status: 'draft' | 'final';
  fileId: string | null;
  lines: PaperLine[];
}
export interface BankQuestion {
  id: string;
  type: string;
  text: string;
  marks: number;
  chapter: string;
}
export interface Recheck {
  id: string;
  exam: string;
  examId: string;
  examSubjectId: string;
  subject: string;
  parts: Part[];
  student: string;
  admissionNo: string;
  studentId: string;
  reason: string | null;
  fee: number | null;
  status: 'pending' | 'reviewed' | 'approved' | 'rejected';
  oldMarks: Record<string, number>;
  oldTotal: number | null;
  newMarks: Record<string, number> | null;
  newTotal: number | null;
  reviewNote: string | null;
  askedBy: string;
  reviewedBy: string;
  decidedBy: string;
  createdAt: string;
}
export interface Analysis {
  label: string;
  previous: string | null;
  sections: { sectionId: string; section: string; students: number; withResult: number; passPercent: number | null; average: number | null; top: { name: string; percent: number } | null }[];
  subjects: { subject: string; students: number; average: number | null; highest: number; passPercent: number | null }[];
  teachers: { teacher: string; subject: string; section: string; students: number; average: number | null; passPercent: number | null }[];
  grades: Record<string, number>;
  atRisk: { name: string; section: string; subjects: string[] }[];
  fell: { name: string; section: string; from: number; to: number }[];
  toppers: { name: string; section: string; percent: number }[];
}
export interface Health {
  terms: { id: string; name: string }[];
  students: { id: string; name: string; admissionNo: string; roll: number | null; heightCm: number | null; weightKg: number | null; vision: string; activities: string }[];
}

const P = (examId: string, classId: string, subjectId: string) => `/exams2/papers/${examId}/${classId}/${subjectId}`;

export const exams2Api = {
  rooms: () => api.get<{ id: string; name: string; capacity: number }[]>('/exams2/rooms'),
  teachers: () => api.get<{ id: string; name: string }[]>('/exams2/teachers'),
  myDuties: () => api.get<{ id: string; exam: string; examId: string; date: string; startTime: string; endTime: string | null; room: string; students: number }[]>('/exams2/duties/mine'),
  sessions: (examId: string) => api.get<{ exam: { id: string; name: string; status: string; kind: string }; sessions: Session[] }>(`/exams2/hall/${examId}/sessions`),
  makeSeating: (examId: string, input: { date: string; startTime: string; roomIds: string[]; duties: boolean }) => api.post<Seating>(`/exams2/hall/${examId}/seating`, input),
  seating: (examId: string, date: string, time: string) => api.get<Seating>(`/exams2/hall/${examId}/seating`, { params: { date, time } }),
  clearSeating: (examId: string, date: string, time: string) => api.delete(`/exams2/hall/${examId}/seating`, { params: { date, time } }),
  autoDuties: (examId: string, date: string, startTime: string) => api.post<Seating>(`/exams2/hall/${examId}/duties/auto`, { date, startTime }),
  setDuty: (examId: string, input: { date: string; startTime: string; roomId: string; staffIds: string[] }) => api.put<Seating>(`/exams2/hall/${examId}/duties`, input),
  admit: (examId: string, section: string) => api.get<AdmitList>(`/exams2/hall/${examId}/admit`, { params: { section } }),
  release: (examId: string, studentId: string, release: boolean) => api.post(`/exams2/hall/${examId}/admit/release`, { studentId, release }),
  papers: (examId: string) => api.get<{ exam: { id: string; name: string }; rows: PaperRow[] }>(`/exams2/papers/${examId}`),
  paper: (examId: string, classId: string, subjectId: string) => api.get<Paper>(P(examId, classId, subjectId)),
  savePaper: (examId: string, classId: string, subjectId: string, input: { title: string; instructions: string | null; durationMins: number; lines: { section: string; questionId: string; marks: number }[]; fileId: string | null; status: 'draft' | 'final' }) => api.put<Paper>(P(examId, classId, subjectId), input),
  bank: (examId: string, classId: string, subjectId: string, q: { chapter?: string; type?: string; search?: string }) => api.get<{ chapters: { id: string; name: string }[]; questions: BankQuestion[] }>(`${P(examId, classId, subjectId)}/bank`, { params: Object.fromEntries(Object.entries(q).filter(([, v]) => v)) }),
  autoFill: (examId: string, classId: string, subjectId: string, input: { chapterIds: string[]; plan: { section: string; type: string; marks: number; count: number }[] }) => api.post<{ lines: { section: string; questionId: string; marks: number }[]; short: string[] }>(`${P(examId, classId, subjectId)}/auto`, input),
  paperFilePath: (examId: string, classId: string, subjectId: string) => `${P(examId, classId, subjectId)}/file`,
  uploadPaperFile: (file: File) => uploadFile<{ id: string; name: string }>('/exams2/papers/file', 'file', file),
  sheetExcel: (examSubjectId: string, section: string) => downloadFile('/exams2/sheet/excel', { examSubjectId, section }, 'marks.xlsx'),
  readSheetExcel: (examSubjectId: string, section: string, file: File) => uploadFile<{ rows: { studentId: string; status: string; marks: Record<string, number | string | null> }[]; issues: string[] }>(`/exams2/sheet/excel?examSubjectId=${examSubjectId}&section=${section}`, 'file', file),
  submitSheet: (examSubjectId: string, sectionId: string) => api.post('/exams2/sheet/submit', { examSubjectId, sectionId }),
  unlockSheet: (examSubjectId: string, sectionId: string) => api.post('/exams2/sheet/unlock', { examSubjectId, sectionId }),
  health: (section: string, term: string) => api.get<Health>('/exams2/health', { params: { section, term } }),
  saveHealth: (section: string, termKey: string, rows: { studentId: string; heightCm: number | null; weightKg: number | null; vision: string; activities: string }[]) => api.put<Health>(`/exams2/health?section=${section}`, { termKey, rows }),
  remarks: (percent: number | null) => api.get<string[]>('/exams2/remarks', { params: percent == null ? {} : { percent } }),
  aiRemark: (scope: ScopeKind, id: string, section: string, student: string) => api.post<{ remark: string }>('/exams2/remarks/ai', { scope, id, section, student }),
  candidates: (year: string, classId?: string) => api.get<{ limit: number; sections: { sectionId: string; section: string; classId: string; students: { studentId: string; name: string; admissionNo: string; subjects: { subjectId: string; subject: string; percent: number | null }[] }[] }[]; existing: { id: string; name: string; status: string; students: number }[] }>('/exams2/supplementary', { params: { year, ...(classId ? { class: classId } : {}) }, timeout: 120_000 }),
  createSupplementary: (year: string, input: { name: string; candidates: Record<string, string[]> }) => api.post<{ id: string; papers: number; students: number }>(`/exams2/supplementary?year=${year}`, input),
  recheckOptions: (exam: string, student: string) => api.get<{ allowed: boolean; why: string | null; lastDate: string | null; fee: number; subjects: { examSubjectId: string; subject: string; marks: number | null; max: number; asked: string | null }[] }>('/exams2/rechecks/options', { params: { exam, student } }),
  askRecheck: (input: { examId: string; studentId: string; examSubjectId: string; reason: string | null }) => api.post('/exams2/rechecks', input),
  myRechecks: () => api.get<Recheck[]>('/exams2/rechecks/mine'),
  rechecks: (show: string) => api.get<Recheck[]>('/exams2/rechecks', { params: { show } }),
  reviewRecheck: (id: string, newMarks: Record<string, number>, note: string | null) => api.post(`/exams2/rechecks/${id}/review`, { newMarks, note }),
  decideRecheck: (id: string, approve: boolean) => api.post<{ id: string; changed: boolean }>(`/exams2/rechecks/${id}/decide`, { approve }),
  analysis: (scope: ScopeKind, id: string, classId?: string) => api.get<Analysis>('/exams2/analysis', { params: { scope, id, ...(classId ? { class: classId } : {}) }, timeout: 120_000 }),
  progress: (studentId: string) => api.get<{ points: { exam: string; percent: number | null; subjects: Record<string, number | null> }[]; subjects: { subject: string; average: number | null }[]; stronger: { subject: string; average: number | null }[]; weaker: { subject: string; average: number | null }[] }>(`/exams2/progress/${studentId}`),
  signaturePath: '/exams2/signature',
  uploadSignature: (file: File) => uploadFile<{ fileId: string }>('/exams2/signature', 'image', file),
  removeSignature: () => api.delete('/exams2/signature'),
};

export const RECHECK: Record<Recheck['status'], { label: string; tone: 'warning' | 'primary' | 'success' | 'neutral' }> = { pending: { label: 'Waiting for review', tone: 'warning' }, reviewed: { label: 'Reviewed: to decide', tone: 'primary' }, approved: { label: 'Done', tone: 'success' }, rejected: { label: 'Refused', tone: 'neutral' } };
export const CARD_DOC: Record<string, string> = { standard: 'report_card', state: 'report_card', cbse: 'report_card_cbse', cbse_senior: 'report_card_cbse', preprimary: 'report_card_preprimary' };
export const fmtDay = (iso: string | null) => (iso ? new Date(`${iso.slice(0, 10)}T00:00:00`).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' }) : '—');
