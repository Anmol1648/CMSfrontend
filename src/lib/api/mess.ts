import { api } from './client';

/** Mess (cmsbackend/src/modules/mess). */

export interface Meal {
  id: string;
  name: string;
  time: string;
  rate: number;
}
export interface Plan {
  id: string;
  name: string;
  mealIds: string[];
  fee: number;
  monthly: number;
  forBoarders: boolean;
  forWho: 'students' | 'staff' | 'both';
  isActive: boolean;
  members: number;
}
export interface TodayMeal extends Meal {
  items: string;
  special: string | null;
  members: number;
  skipped: number;
  away: number;
  cook: number;
  served: number;
  guests: number;
  rating: number | null;
  ratings: number;
  started: boolean;
}
export interface MenuRow {
  week: number;
  weekday: number;
  mealId: string;
  items: string;
}
export interface Special {
  id: string;
  date: string;
  mealId: string;
  items: string;
  note: string | null;
}
export interface Person {
  kind: 'student' | 'staff';
  personId: string;
  name: string;
  code: string;
  sub: string;
  photo: string | null;
  plan: string;
  mealIds: string[];
}
export interface Member extends Person {
  id: string;
  from: string;
  to: string | null;
  status: 'active' | 'ended';
  source: string;
}
export interface CounterMember extends Person {
  subscriptionId: string;
  skipped: boolean;
  away: boolean;
  servedId: string | null;
  servedAt: string | null;
}
export interface MyMember extends Person {
  subscriptionId: string;
  since: string;
  meals: Meal[];
  week: { date: string; meals: { mealId: string; items: string; special: string | null; skipped: boolean; canChange: boolean }[] }[];
  served: { date: string; meal: string; at: string }[];
  toRate: { date: string; mealId: string; meal: string; stars: number | null }[];
}

export type PlanInput = Omit<Plan, 'id' | 'members'>;

export const messApi = {
  today: (date?: string) => api.get<{ date: string; meals: TodayMeal[] }>('/mess/today', { params: { date } }),
  meals: () => api.get<Meal[]>('/mess/meals'),
  plans: () => api.get<Plan[]>('/mess/plans'),
  savePlan: (id: string | null, b: PlanInput) => (id ? api.put(`/mess/plans/${id}`, b) : api.post('/mess/plans', b)),
  menu: () => api.get<{ weeks: number; thisWeek: number; meals: Meal[]; rows: MenuRow[]; specials: Special[] }>('/mess/menu'),
  saveMenu: (rows: MenuRow[]) => api.put('/mess/menu', { rows }),
  saveSpecial: (b: { date: string; mealId: string; items: string; note: string | null }) => api.post('/mess/menu/special', b),
  deleteSpecial: (id: string) => api.delete(`/mess/menu/special/${id}`),
  members: (q: { show: string; planId?: string; kind: string }) => api.get<Member[]>('/mess/members', { params: q }),
  people: (q: string) => api.get<{ kind: 'student' | 'staff'; id: string; name: string; code: string }[]>('/mess/people', { params: { q }, quiet: true }),
  subscribe: (b: { planId: string; studentIds: string[]; staffIds: string[]; fromDate: string }) => api.post<{ added: number; already: number }>('/mess/members', b),
  end: (id: string, date: string) => api.post(`/mess/members/${id}/end`, { date }),
  skip: (b: { subscriptionId: string; date: string; mealIds: string[]; skip: boolean }) => api.post('/mess/skip', b),
  counter: (date: string, mealId: string) => api.get<{ meal: Meal; members: CounterMember[]; guests: { id: string; name: string | null; guests: number; amount: number; payBy: string | null; at: string }[] }>('/mess/counter', { params: { date, mealId } }),
  serve: (b: { date: string; mealId: string; subscriptionId?: string; code?: string }) => api.post<{ name: string; code: string; sub: string; photo: string | null; plan: string; warning: string | null }>('/mess/serve', b),
  unserve: (id: string) => api.delete(`/mess/serve/${id}`),
  guest: (b: { date: string; mealId: string; guestName: string; guests: number; payBy: string; studentId?: string | null; staffId?: string | null }) => api.post<{ amount: number }>('/mess/guests', b),
  mine: () => api.get<{ cutoff: number; members: MyMember[] }>('/mess/mine'),
  mySkip: (b: { subscriptionId: string; date: string; mealIds: string[]; skip: boolean }) => api.post('/mess/mine/skip', b),
  rate: (b: { date: string; mealId: string; stars: number; comment?: string | null }) => api.post('/mess/mine/rate', b),
};

export const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
export const dayLabel = (d: string) => new Date(`${d}T00:00:00`).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
