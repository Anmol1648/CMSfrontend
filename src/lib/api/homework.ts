import { api, uploadFile } from './client';

/** Homework (cmsbackend/src/modules/homework). */

export type HomeworkMode = 'online' | 'class';
export type HomeworkState = 'draft' | 'scheduled' | 'published';
export type SubmissionStatus = 'pending' | 'submitted' | 'late' | 'done' | 'not_done' | 'checked' | 'redo';
export interface HwFile {
  id: string;
  name: string;
  type: string;
}

export interface GiveOptions {
  yearId: string | null;
  sections: { id: string; label: string; subjects: { id: string; name: string }[] }[];
}

export interface GiveInput {
  sectionIds: string[];
  subjectId: string;
  typeId?: string | null;
  title: string;
  details: string;
  attachmentIds: string[];
  givenOn: string;
  dueOn: string;
  mode: HomeworkMode;
  publish: 'draft' | 'now' | 'later';
  publishAt?: string | null;
}

export interface HomeworkRow {
  id: string;
  title: string;
  section: string;
  sectionId: string;
  subject: string;
  type: string | null;
  by: string | null;
  mine: boolean;
  givenOn: string;
  dueOn: string;
  mode: HomeworkMode;
  state: HomeworkState;
  students: number;
  handedIn: number;
  toCheck: number;
  checked: number;
}

export interface HomeworkStudent {
  id: string;
  name: string;
  admissionNo: string;
  roll: number | null;
  status: SubmissionStatus;
  answer: string | null;
  files: HwFile[];
  submittedAt: string | null;
  checkedAt: string | null;
  gradeId: string | null;
  grade: string | null;
  remark: string | null;
}

export interface HomeworkFull {
  id: string;
  title: string;
  details: string;
  section: string;
  sectionId: string;
  subject: string;
  subjectId: string;
  typeId: string | null;
  type: string | null;
  by: string | null;
  givenOn: string;
  dueOn: string;
  mode: HomeworkMode;
  state: HomeworkState;
  publishAt: string | null;
  attachments: HwFile[];
  canEdit: boolean;
  canCheck: boolean;
  students: HomeworkStudent[];
}

export interface MyHomeworkItem {
  id: string;
  title: string;
  details: string;
  subject: string;
  type: string | null;
  by: string | null;
  givenOn: string;
  dueOn: string;
  mode: HomeworkMode;
  attachments: HwFile[];
  status: SubmissionStatus;
  answer: string | null;
  files: HwFile[];
  submittedAt: string | null;
  grade: string | null;
  remark: string | null;
  open: boolean;
  late: boolean;
}

export interface MyHomework {
  student: { id: string; name: string; section: string };
  canSubmit: boolean;
  homework: MyHomeworkItem[];
}

export interface DiaryItem {
  id: string;
  title: string;
  details: string;
  subject: string;
  type: string | null;
  by: string | null;
  givenOn: string;
  dueOn: string;
  mode: HomeworkMode;
  students: number;
  handedIn: number;
}

export const STATUS_LABEL: Record<SubmissionStatus, string> = { pending: 'Not handed in', submitted: 'Handed in', late: 'Handed in late', done: 'Done', not_done: 'Not done', checked: 'Checked', redo: 'Redo' };
export const STATUS_TONE: Record<SubmissionStatus, 'neutral' | 'primary' | 'warning' | 'success' | 'danger'> = { pending: 'neutral', submitted: 'primary', late: 'warning', done: 'success', not_done: 'danger', checked: 'success', redo: 'danger' };

const clean = (q: object) => Object.fromEntries(Object.entries(q).filter(([, v]) => v !== undefined && v !== '' && v !== null)) as Record<string, string | number>;

export const homeworkApi = {
  options: () => api.get<GiveOptions>('/homework/options'),
  list: (q: { section?: string; subject?: string; from?: string; to?: string; mine?: '1' | '0'; status?: string; page?: number }) => api.get<{ rows: HomeworkRow[]; total: number; page: number; pages: number; canGive: boolean }>('/homework', { params: clean(q) }),
  get: (id: string) => api.get<HomeworkFull>(`/homework/${id}`),
  give: (input: GiveInput) => api.post<{ ids: string[] }>('/homework', input),
  update: (id: string, input: Omit<GiveInput, 'sectionIds'>) => api.put<HomeworkFull>(`/homework/${id}`, input),
  remove: (id: string) => api.delete<{ id: string }>(`/homework/${id}`),
  check: (id: string, rows: { studentId: string; status: string; gradeId?: string | null; remark?: string | null }[]) => api.put<HomeworkFull>(`/homework/${id}/check`, { rows }),
  upload: (file: File) => uploadFile<{ id: string; name: string }>('/homework/files', 'file', file),
  filePath: (id: string, fileId: string) => `/homework/${id}/files/${fileId}`,

  mine: () => api.get<MyHomework[]>('/homework/mine'),
  submit: (id: string, input: { student: string; answer?: string | null; fileIds: string[] }) => api.post<MyHomework[]>(`/homework/${id}/submit`, input),

  diarySections: () => api.get<{ id: string; label: string; mine: boolean }[]>('/homework/diary/sections'),
  diary: (section: string, date?: string) => api.get<{ date: string; given: DiaryItem[]; due: DiaryItem[] }>('/homework/diary', { params: clean({ section, date }) }),
};

export const showDate = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
