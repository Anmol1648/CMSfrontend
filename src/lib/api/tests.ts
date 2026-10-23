import { api } from './client';
import type { QuestionType } from './questions';

/** Online tests (cmsbackend/src/modules/tests). */

export type TestState = 'draft' | 'upcoming' | 'open' | 'closed' | 'results';
export const STATE: Record<TestState, { label: string; tone: 'neutral' | 'warning' | 'primary' | 'success' | 'danger' }> = {
  draft: { label: 'Draft', tone: 'neutral' },
  upcoming: { label: 'Coming', tone: 'warning' },
  open: { label: 'Open now', tone: 'primary' },
  closed: { label: 'Closed', tone: 'neutral' },
  results: { label: 'Results out', tone: 'success' },
};

export interface TestInput {
  sectionIds: string[];
  subjectId: string;
  chapterIds: string[];
  title: string;
  instructions: string;
  durationMin: number;
  startsAt: string;
  endsAt: string;
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  showResult: 'instant' | 'after_review';
  negativeMarks: number;
}

export interface CreateOptions {
  classes: { id: string; name: string; subjects: { id: string; name: string; sectionIds: string[] }[]; sections: { id: string; label: string }[] }[];
  defaults?: { durationMin: number; shuffleQuestions: boolean; shuffleOptions: boolean; showResult: 'instant' | 'after_review'; negativeMarks: number };
}

export interface TestRow {
  id: string;
  title: string;
  className: string;
  subject: string;
  sections: string[];
  by: string | null;
  mine: boolean;
  startsAt: string;
  endsAt: string;
  durationMin: number;
  totalMarks: number;
  questions: number;
  state: TestState;
  taken: number;
  toMark: number;
}

export interface TestQuestion {
  id: string;
  questionId: string | null;
  marks: number;
  type: QuestionType;
  text: string;
  options: { text: string; correct: boolean }[];
  answer: string | null;
  explanation: string | null;
  imageFileId: string | null;
  chapter: string | null;
}

export interface TestFull extends TestInput {
  id: string;
  classId: string;
  className: string;
  subject: string;
  sections: { id: string; label: string }[];
  chapters: { id: string; name: string }[];
  by: string | null;
  state: TestState;
  status: string;
  totalMarks: number;
  locked: boolean;
  canEdit: boolean;
  canMark: boolean;
  questions: TestQuestion[];
}

export interface BankItem {
  id: string;
  type: QuestionType;
  text: string;
  marks: number;
  chapter: string | null;
  difficulty: string | null;
  inTest: boolean;
}

export interface TestResults {
  test: { id: string; title: string; totalMarks: number; state: TestState; status: string; showResult: string; written: number };
  canMark: boolean;
  students: { id: string; name: string; admissionNo: string; roll: number | null; section: string; attemptId: string | null; status: 'not_started' | 'absent' | 'in_progress' | 'submitted' | 'marked'; score: number | null; submittedAt: string | null }[];
}

export interface AttemptQuestion extends TestQuestion {
  given: unknown;
  got: number | null;
  by?: string | null;
  note: string | null;
}

export interface AttemptFull {
  id: string;
  student: string;
  status: string;
  score: number | null;
  totalMarks: number;
  startedAt: string;
  submittedAt: string | null;
  canMark: boolean;
  aiMarking: boolean;
  questions: AttemptQuestion[];
}

export interface Analysis {
  taken: number;
  average: number | null;
  highest: number | null;
  lowest: number | null;
  totalMarks: number;
  bands: { label: string; count: number }[];
  questions: { n: number; id: string; text: string; type: QuestionType; marks: number; chapter: string | null; answered: number; correct: number; percent: number | null }[];
  chapters: { chapter: string; percent: number | null }[];
}

export interface MyTestItem {
  id: string;
  title: string;
  subject: string;
  instructions: string;
  startsAt: string;
  endsAt: string;
  durationMin: number;
  totalMarks: number;
  questions: number;
  state: TestState;
  attempt: { status: string; dueAt: string; submittedAt: string | null } | null;
  canStart: boolean;
  canContinue: boolean;
  result: { score: number | null; totalMarks: number } | null;
}

export interface MyTests {
  student: { id: string; name: string; section: string; self: boolean };
  tests: MyTestItem[];
}

export interface Taking {
  attemptId: string;
  test: { id: string; title: string; instructions: string; totalMarks: number; negativeMarks: number };
  dueAt: string;
  now: string;
  answers: Record<string, unknown>;
  questions: { id: string; n: number; type: QuestionType; text: string; marks: number; hasImage: boolean; options: { index: number; text: string }[] }[];
}

export interface MyResult {
  test: { id: string; title: string; totalMarks: number };
  student: string;
  status: string;
  submittedAt: string | null;
  visible: boolean;
  score: number | null;
  questions: (AttemptQuestion & { n: number })[];
}

export const testsApi = {
  options: () => api.get<CreateOptions>('/tests/options'),
  list: (q: { mine?: '1' | '0'; state?: string; page?: number }) => api.get<{ rows: TestRow[]; total: number; page: number; pages: number; canCreate: boolean }>('/tests', { params: Object.fromEntries(Object.entries(q).filter(([, v]) => v)) }),
  get: (id: string) => api.get<TestFull>(`/tests/${id}`),
  create: (input: TestInput) => api.post<TestFull>('/tests', input),
  update: (id: string, input: TestInput) => api.put<TestFull>(`/tests/${id}`, input),
  remove: (id: string) => api.delete<{ id: string }>(`/tests/${id}`),
  bank: (id: string, q: { chapter?: string; type?: string; difficulty?: string; search?: string }) => api.get<BankItem[]>(`/tests/${id}/bank`, { params: Object.fromEntries(Object.entries(q).filter(([, v]) => v)) }),
  addQuestions: (id: string, ids: string[]) => api.post<TestFull>(`/tests/${id}/questions`, { ids }),
  auto: (id: string, rules: { count: number; type?: string | null; difficultyId?: string | null; chapterId?: string | null }[]) => api.post<{ added: number; short: string[]; test: TestFull }>(`/tests/${id}/auto`, { rules }),
  editQuestion: (id: string, tqId: string, input: { marks?: number; move?: 'up' | 'down' }) => api.put<TestFull>(`/tests/${id}/questions/${tqId}`, input),
  removeQuestion: (id: string, tqId: string) => api.delete<TestFull>(`/tests/${id}/questions/${tqId}`),
  publish: (id: string, publish: boolean) => api.post<TestFull>(`/tests/${id}/publish`, { publish }),
  results: (id: string) => api.get<TestResults>(`/tests/${id}/results`),
  publishResults: (id: string, publish: boolean) => api.post<TestResults>(`/tests/${id}/results/publish`, { publish }),
  analysis: (id: string) => api.get<Analysis>(`/tests/${id}/analysis`),
  attempt: (attemptId: string) => api.get<AttemptFull>(`/tests/attempts/${attemptId}`),
  mark: (attemptId: string, marks: Record<string, { marks: number | null; note?: string | null }>) => api.put<AttemptFull>(`/tests/attempts/${attemptId}/marks`, { marks }),
  suggest: (attemptId: string, question: string) => api.post<{ marks: number; reason: string }>(`/tests/attempts/${attemptId}/suggest`, { question }, { timeout: 120_000 }),
  examTargets: (id: string) => api.get<{ examSubjectId: string; exam: string; parts: { key: string; label: string; max: number }[] }[]>(`/tests/${id}/exam-targets`),
  toExam: (id: string, examSubjectId: string, part: string) => api.post<{ students: number; exam: string; part: string }>(`/tests/${id}/to-exam`, { examSubjectId, part }),

  mine: () => api.get<MyTests[]>('/tests/mine'),
  start: (id: string) => api.post<Taking>(`/tests/${id}/start`),
  save: (id: string, answers: Record<string, unknown>) => api.put<{ saved: boolean; at: string }>(`/tests/${id}/answers`, { answers }),
  submit: (id: string, answers: Record<string, unknown>) => api.post<MyResult>(`/tests/${id}/submit`, { answers }),
  myResult: (id: string, student?: string) => api.get<MyResult>(`/tests/${id}/my-result`, { params: student ? { student } : {} }),
  imagePath: (id: string, tqId: string) => `/tests/${id}/questions/${tqId}/image`,
};

export const when = (iso: string) => new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true });
/** For <input type="datetime-local">: local time without seconds. */
export const toLocalInput = (iso: string) => {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};
/** How an answer looks to a person ("B. Oxygen", "True", the text). */
export const showAnswer = (q: { type: string; options: { text: string }[] }, given: unknown) => {
  if (given === null || given === undefined || given === '' || (Array.isArray(given) && !given.length)) return '— (not answered)';
  if (q.type === 'mcq') return `${String.fromCharCode(65 + Number(given))}. ${q.options[Number(given)]?.text ?? ''}`;
  if (q.type === 'multi') return (given as number[]).map((i) => `${String.fromCharCode(65 + i)}. ${q.options[i]?.text ?? ''}`).join(', ');
  if (q.type === 'true_false') return given === 'true' ? 'True' : 'False';
  return String(given);
};
