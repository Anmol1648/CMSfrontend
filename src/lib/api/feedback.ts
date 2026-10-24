import { api } from './client';

/** Teacher feedback (cmsbackend/src/modules/feedback). */

export type Audience = 'student' | 'parent' | 'both';
export type QuestionKind = 'rating' | 'yesno' | 'text';
export interface Question {
  id: string;
  kind: QuestionKind;
  text: string;
  required?: boolean;
}
export interface Form {
  id: string;
  name: string;
  audience: Audience;
  questions: Question[];
  isActive: boolean;
  rounds: number;
}
export interface RoundRow {
  id: string;
  name: string;
  form: string;
  audience: Audience;
  sections: number;
  anonymous: boolean;
  opensOn: string;
  closesOn: string;
  status: 'draft' | 'open' | 'closed' | 'released';
  filled: number;
  expected: number;
  people: number;
}
export interface RoundInput {
  formId: string;
  name: string;
  audience: Audience;
  sectionIds: string[];
  anonymous: boolean;
  opensOn: string;
  closesOn: string;
}
export interface TeacherResult {
  staffId: string;
  name: string;
  responses: number;
  enough: boolean;
  overall: number | null;
  per: Record<string, { avg: number | null; n: number; yes?: number | null }>;
  bySection: { section: string; responses: number; overall: number | null }[];
  comments: { responseId: string; question: string; text: string; status: string; kind: string }[];
}
export interface Results {
  round: { id: string; name: string; status: string; anonymous: boolean; opensOn: string; closesOn: string };
  questions: Question[];
  scale: number;
  minResponses: number;
  school: { overall: number | null; per: TeacherResult['per']; responses: number };
  teachers: TeacherResult[];
  all: boolean;
}
export interface GiveRound {
  id: string;
  name: string;
  closesOn: string;
  anonymous: boolean;
  questions: Question[];
  children: { studentId: string; as: 'student' | 'parent'; name: string; section: string; teachers: { staffId: string; name: string; role: string; done: boolean }[] }[];
}

export const feedbackApi = {
  forms: () => api.get<Form[]>('/feedback/forms'),
  saveForm: (id: string | null, input: Omit<Form, 'id' | 'rounds'>) => (id ? api.put<{ id: string }>(`/feedback/forms/${id}`, input) : api.post<{ id: string }>('/feedback/forms', input)),
  rounds: () => api.get<RoundRow[]>('/feedback/rounds'),
  roundDefaults: () => api.get<{ anonymous: boolean }>('/feedback/rounds/defaults'),
  saveRound: (id: string | null, input: RoundInput) => (id ? api.put<{ id: string }>(`/feedback/rounds/${id}`, input) : api.post<{ id: string }>('/feedback/rounds', input)),
  deleteRound: (id: string) => api.delete(`/feedback/rounds/${id}`),
  open: (id: string) => api.post(`/feedback/rounds/${id}/open`),
  close: (id: string) => api.post(`/feedback/rounds/${id}/close`),
  release: (id: string) => api.post(`/feedback/rounds/${id}/release`),
  comments: (id: string) => api.get<{ id: string; teacher: string; kind: string; status: 'pending' | 'hidden'; texts: string[] }[]>(`/feedback/rounds/${id}/comments`),
  screen: (ids: string[], status: 'shown' | 'hidden') => api.post('/feedback/comments', { ids, status }),
  results: (id: string, staff?: string) => api.get<Results>(`/feedback/rounds/${id}/results`, { params: staff ? { staff } : {} }),
  myRounds: () => api.get<{ id: string; name: string; closesOn: string; releasedAt: string | null }[]>('/feedback/mine/rounds'),
  myResults: (id: string) => api.get<Results>(`/feedback/mine/rounds/${id}`),
  give: () => api.get<{ rounds: GiveRound[]; scale: number }>('/feedback/give'),
  submit: (input: { roundId: string; staffId: string; studentId: string; answers: Record<string, number | boolean | string> }) => api.post('/feedback/give', input),
};

export const AUDIENCE: Record<Audience, string> = { student: 'Students', parent: 'Parents', both: 'Students and parents' };
export const ROUND_STATUS: Record<RoundRow['status'], { label: string; tone: 'neutral' | 'success' | 'warning' | 'primary' }> = { draft: { label: 'Draft', tone: 'neutral' }, open: { label: 'Open', tone: 'success' }, closed: { label: 'Closed', tone: 'warning' }, released: { label: 'Released to teachers', tone: 'primary' } };
