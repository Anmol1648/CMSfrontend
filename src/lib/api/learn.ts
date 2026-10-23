import { api } from './client';

/** AI learning (cmsbackend/src/modules/learn). */

export type LearnMode = 'ask' | 'explain' | 'summary' | 'points' | 'questions';

export interface LearnSubjects {
  student: { name: string; className: string; section: string };
  mode: 'guide' | 'full';
  subjects: { id: string; name: string; chapters: { id: string; name: string; topics: string[]; practice: { quizzes: number; percent: number | null } | null }[] }[];
}

export interface Chat {
  id: string;
  title: string;
  mode: LearnMode;
  subject: string;
  subjectId: string;
  chapter: string | null;
  chapterId: string | null;
  flagged: boolean;
  createdAt: string;
  messages: { id: string; role: 'user' | 'assistant'; text: string; flag: string; at: string }[];
}

export interface ChatRow {
  id: string;
  title: string;
  mode: LearnMode;
  subjectId: string;
  chapterId: string | null;
  messages: number;
  updatedAt: string;
}

export interface Quiz {
  id: string;
  source: 'bank' | 'ai';
  subject: string;
  chapter: string | null;
  questions: { text: string; options: string[] }[];
}

export interface QuizResult {
  score: number;
  total: number;
  questions: { text: string; options: string[]; correct: number; given: number; explanation: string | null }[];
}

export interface Progress {
  student: string;
  quizzes: number;
  average: number | null;
  chats: number;
  flagged: number;
  chapters: { subject: string; chapter: string; quizzes: number; percent: number | null; chats: number; last: string }[];
  weak: { subject: string; chapter: string; percent: number | null }[];
  conversations: { id: string; title: string; subject: string; chapter: string | null; messages: number; flagged: boolean; updatedAt: string }[];
}

export interface SectionRow {
  id: string;
  roll: number | null;
  name: string;
  admissionNo: string;
  quizzes: number;
  percent: number | null;
  lastQuiz: string | null;
  chats30: number;
  flagged: number;
}

export const learnApi = {
  subjects: () => api.get<LearnSubjects>('/learn/subjects'),
  chats: (q: { subject?: string; chapter?: string }) => api.get<ChatRow[]>('/learn/chats', { params: Object.fromEntries(Object.entries(q).filter(([, v]) => v)) }),
  chat: (id: string) => api.get<Chat>(`/learn/chats/${id}`),
  viewChat: (id: string) => api.get<Chat>(`/learn/view/chats/${id}`),
  start: (input: { subjectId: string; chapterId: string | null; mode: LearnMode; text?: string }) => api.post<Chat>('/learn/chats', input, { timeout: 120_000 }),
  send: (id: string, text: string) => api.post<Chat>(`/learn/chats/${id}/messages`, { text }, { timeout: 120_000 }),
  remove: (id: string) => api.delete<{ id: string }>(`/learn/chats/${id}`),
  quiz: (subjectId: string, chapterId: string | null) => api.post<Quiz>('/learn/quiz', { subjectId, chapterId }, { timeout: 120_000 }),
  submitQuiz: (id: string, answers: number[]) => api.post<QuizResult>(`/learn/quiz/${id}/submit`, { answers }),
  myProgress: () => api.get<Progress | null>('/learn/me/progress'),
  choices: () => api.get<{ children: { id: string; name: string }[]; sections: { id: string; label: string }[] }>('/learn/progress/choices'),
  section: (id: string) => api.get<SectionRow[]>(`/learn/progress/section/${id}`),
  student: (id: string) => api.get<Progress>(`/learn/progress/student/${id}`),
};
