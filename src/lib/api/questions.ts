import { api, uploadFile } from './client';
import { Move, moveBody } from '@/lib/order';

/** Chapters, the question bank and the AI layer (cmsbackend/src/modules/questions, /ai). */

export type QuestionType = 'mcq' | 'multi' | 'true_false' | 'fill' | 'short' | 'long';
export const QUESTION_TYPES: QuestionType[] = ['mcq', 'multi', 'true_false', 'fill', 'short', 'long'];
export const TYPE_LABEL: Record<QuestionType, string> = { mcq: 'Multiple choice (one answer)', multi: 'Multiple choice (several answers)', true_false: 'True / false', fill: 'Fill in the blank', short: 'Short answer', long: 'Long answer' };
export const TYPE_SHORT: Record<QuestionType, string> = { mcq: 'MCQ', multi: 'MCQ (many)', true_false: 'True/False', fill: 'Fill in', short: 'Short', long: 'Long' };
export type QuestionStatus = 'draft' | 'pending' | 'approved' | 'rejected';
export const STATUS: Record<QuestionStatus, { label: string; tone: 'neutral' | 'warning' | 'success' | 'danger' }> = {
  draft: { label: 'Draft', tone: 'neutral' },
  pending: { label: 'Waiting review', tone: 'warning' },
  approved: { label: 'Approved', tone: 'success' },
  rejected: { label: 'Sent back', tone: 'danger' },
};

export interface PickerOptions {
  classes: { id: string; name: string; subjects: { id: string; name: string; canEdit: boolean }[] }[];
  canEditAll: boolean;
}

export interface Chapter {
  id: string;
  name: string;
  topics: string[];
  description: string | null;
  isActive: boolean;
  questions: number;
  approved: number;
}

export interface QuestionInput {
  classId: string;
  subjectId: string;
  chapterId: string | null;
  type: QuestionType;
  text: string;
  imageFileId: string | null;
  options: { text: string; correct: boolean }[];
  answer: string | null;
  explanation: string | null;
  marks: number;
  difficultyId: string | null;
  levelId: string | null;
}

export interface Question extends QuestionInput {
  id: string;
  status: QuestionStatus;
  source: 'manual' | 'import' | 'ai';
  reviewNote: string | null;
  chapter: string | null;
  difficulty: string | null;
  level: string | null;
  by: string | null;
  reviewer: string | null;
  canEdit: boolean;
  canReview: boolean;
  createdAt: string;
}

export interface QuestionQuery {
  class?: string;
  subject?: string;
  chapter?: string;
  type?: string;
  difficulty?: string;
  status?: string;
  source?: string;
  mine?: '1' | '0';
  search?: string;
  page?: number;
}

export interface AiStatus {
  on: boolean;
  ready: boolean;
  provider: string;
  model: string;
  keySaved: boolean;
  why: string | null;
}

export interface AiSetup extends AiStatus {
  usage: { today: number; month: number; monthlyLimit: number; dailyPerUser: number };
  lastError: { error: string | null; createdAt: string } | null;
}

export interface AiUsage {
  month: string;
  requests: number;
  tokens: number;
  features: { feature: string; requests: number; failed: number; tokens: number }[];
  people: { name: string; requests: number }[];
}

const clean = (q: object) => Object.fromEntries(Object.entries(q).filter(([, v]) => v !== undefined && v !== '' && v !== null)) as Record<string, string | number>;

export const questionsApi = {
  options: (purpose: 'chapters' | 'questions') => api.get<PickerOptions>('/questions/options', { params: { for: purpose } }),
  chapters: (classId: string, subjectId: string) => api.get<{ canEdit: boolean; chapters: Chapter[]; noChapter: number }>('/questions/chapters', { params: { class: classId, subject: subjectId } }),
  addChapter: (input: { classId: string; subjectId: string; name: string; topics: string[]; description?: string | null; isActive?: boolean }) => api.post<Chapter>('/questions/chapters', input),
  addChapters: (classId: string, subjectId: string, lines: string[]) => api.post<{ added: number }>('/questions/chapters/many', { classId, subjectId, lines }),
  suggestChapters: (classId: string, subjectId: string) => api.get<{ name: string; topics: string[] }[]>('/questions/chapters/suggest', { params: { class: classId, subject: subjectId }, timeout: 320_000 }),
  updateChapter: (id: string, input: { name: string; topics: string[]; description?: string | null; isActive: boolean }) => api.put<Chapter>(`/questions/chapters/${id}`, input),
  moveChapter: (id: string, move: Move) => api.post<{ moved: boolean }>(`/questions/chapters/${id}/move`, moveBody(move)),
  deleteChapter: (id: string) => api.delete<{ id: string }>(`/questions/chapters/${id}`),

  list: (q: QuestionQuery) => api.get<{ rows: Question[]; total: number; page: number; pages: number; counts: Record<string, number> }>('/questions', { params: clean(q) }),
  get: (id: string) => api.get<Question>(`/questions/${id}`),
  create: (input: QuestionInput, draft = false) => api.post<Question>('/questions', input, { params: draft ? { draft: '1' } : {} }),
  update: (id: string, input: QuestionInput, draft = false) => api.put<Question>(`/questions/${id}`, input, { params: draft ? { draft: '1' } : {} }),
  remove: (id: string) => api.delete<{ id: string }>(`/questions/${id}`),
  send: (ids: string[]) => api.post<{ sent: number; status: string }>('/questions/send', { ids }),
  review: (ids: string[], approve: boolean, note?: string) => api.post<{ reviewed: number }>('/questions/review', { ids, approve, note }),
  generate: (input: { classId: string; subjectId: string; chapterId: string | null; type: QuestionType; count: number; marks: number; difficultyId: string | null; levelId: string | null; instructions?: string }) =>
    api.post<{ made: number; skipped: number; status: string; questions: Question[] }>('/questions/generate', input, { timeout: 320_000 }),
  uploadImage: (file: File) => uploadFile<{ id: string; name: string }>('/questions/images', 'file', file),
  imagePath: (id: string) => `/questions/${id}/image`,

  aiStatus: () => api.get<AiStatus>('/ai/status'),
  aiSetup: () => api.get<AiSetup>('/ai/setup'),
  saveAiKey: (key: string) => api.put<AiSetup>('/ai/key', { key }),
  testAi: () => api.post<{ reply: string }>('/ai/test', undefined, { timeout: 320_000 }),
  aiUsage: (month?: string) => api.get<AiUsage>('/ai/usage', { params: month ? { month } : {} }),
};
