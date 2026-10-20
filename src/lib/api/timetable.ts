import { api } from './client';

/** Timetable (cmsbackend/src/modules/timetable). Weekday 1 = Monday. */

export interface Ref {
  id: string;
  name: string;
}

export interface Slot {
  kind: 'period' | 'break';
  periodNo: number | null;
  label: string;
  startTime: string;
  endTime: string;
}

export interface Schedule {
  id: string;
  name: string;
  periods: number;
  weekdays: number[];
  slots: Slot[];
}

export interface WeekDay {
  weekday: number;
  name: string;
  scheduleId: string;
  periods: { periodNo: number; label: string; startTime: string; endTime: string }[];
  slots: Slot[];
  breakAfter: number[];
}

export interface LoadRow {
  subject: { id: string; name: string; code: string | null };
  stream: Ref | null;
  isOptional: boolean;
  perWeek: number;
  doubles: number;
  parallelGroup: string | null;
  roomId: string | null;
}

export interface TeacherLoad {
  id: string;
  name: string;
  code: string;
  designation: string | null;
  periodsNeeded: number;
  classTeacher: boolean;
  maxPerDay: number | null;
  maxPerWeek: number | null;
  unavailable: { weekday: number; periodNo: number }[];
}

export interface TimetableListItem {
  id: string;
  name: string;
  status: 'draft' | 'published' | 'archived';
  entries: number;
  unplaced: number;
  generatedAt: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Entry {
  id: string;
  weekday: number;
  periodNo: number;
  subject: { id: string; name: string; code: string | null };
  staff: { id: string; name: string; code: string } | null;
  room: { id: string; name: string; code: string | null } | null;
  section: { id: string; label: string };
  locked: boolean;
}

export interface TimetableOverview {
  id: string;
  name: string;
  status: TimetableListItem['status'];
  academicYearId: string;
  generatedAt: string | null;
  publishedAt: string | null;
  days: WeekDay[];
  sections: { id: string; label: string; periods: number }[];
  teachers: { id: string; name: string; code: string }[];
  unplaced: { section: string; sectionId: string; subjects: string; missing: number; reason: string }[];
}

export interface Grid {
  timetable: { id: string; name: string; status: TimetableListItem['status'] };
  days: WeekDay[];
  entries: Entry[];
}

export interface FreeTeacher {
  id: string;
  name: string;
  code: string;
  designation: string | null;
  periodsThatDay: number;
}

export interface SubstitutionPeriod {
  id: string;
  periodNo: number;
  time: string | null;
  section: { id: string; label: string };
  subject: Ref | null;
  substitute: { id: string; name: string; code: string } | null;
  note: string | null;
  suggestions: { id: string; name: string; code: string; knowsClass: boolean; periodsThatDay: number; substitutionsThatDay: number; overLimit: boolean }[];
}

export interface SubstitutionDay {
  date: string;
  weekday: number;
  schoolDay: boolean;
  limitPerDay: number;
  absent: { teacher: { id: string; name: string; code: string }; periods: SubstitutionPeriod[] }[];
  open: number;
}

export interface MyTimetable {
  published: boolean;
  name?: string;
  days: WeekDay[];
  views: { kind: 'teacher' | 'class'; title: string; entries: Entry[] }[];
  substitutions: { date: string; periodNo: number; section: string; subject: string | null; for: string; note: string | null }[];
}

const y = (year: string) => ({ params: { year } });

export const timetableApi = {
  start: (year: string) => api.post<{ schedules: number; loads: number }>('/timetable/setup/start', undefined, y(year)),
  schedules: (year: string) => api.get<Schedule[]>('/timetable/setup/schedules', y(year)),
  addSchedule: (year: string, input: { name: string; slots: Omit<Slot, 'periodNo'>[] }) => api.post<Schedule[]>('/timetable/setup/schedules', input, y(year)),
  saveSchedule: (id: string, input: { name: string; slots: Omit<Slot, 'periodNo'>[] }) => api.put<Schedule[]>(`/timetable/setup/schedules/${id}`, input),
  deleteSchedule: (id: string) => api.delete<Schedule[]>(`/timetable/setup/schedules/${id}`),
  days: (year: string) => api.get<{ weekday: number; name: string; scheduleId: string | null }[]>('/timetable/setup/days', y(year)),
  saveDays: (year: string, days: { weekday: number; scheduleId: string | null }[]) => api.put<{ weekday: number; name: string; scheduleId: string | null }[]>('/timetable/setup/days', days, y(year)),
  week: (year: string) => api.get<WeekDay[]>('/timetable/setup/week', y(year)),
  loadOverview: (year: string) => api.get<{ periodsInWeek: number; classes: { id: string; name: string; periods: number; subjects: number }[] }>('/timetable/setup/loads', y(year)),
  loads: (year: string, classId: string) => api.get<{ class: Ref & { hasStreams: boolean }; periodsInWeek: number; rows: LoadRow[] }>(`/timetable/setup/loads/${classId}`, y(year)),
  saveLoads: (year: string, classId: string, rows: { subjectId: string; streamId: string | null; perWeek: number; doubles: number; parallelGroup: string | null; roomId: string | null }[]) =>
    api.put<{ class: Ref; periodsInWeek: number; rows: LoadRow[] }>(`/timetable/setup/loads/${classId}`, { rows }, y(year)),
  teachers: (year: string) => api.get<{ defaults: { maxPerDay: number; maxPerWeek: number }; teachers: TeacherLoad[] }>('/timetable/setup/teachers', y(year)),
  saveTeacher: (year: string, staffId: string, input: { maxPerDay: number | null; maxPerWeek: number | null; unavailable: { weekday: number; periodNo: number }[] }) =>
    api.put<{ defaults: { maxPerDay: number; maxPerWeek: number }; teachers: TeacherLoad[] }>(`/timetable/setup/teachers/${staffId}`, input, y(year)),

  list: (year: string) => api.get<TimetableListItem[]>('/timetable', y(year)),
  generate: (year: string, input: { timetableId?: string; name?: string }) =>
    api.post<{ timetableId: string; placed: number; wanted: number; unplaced: number; noTeacher: number; seconds: number }>('/timetable/generate', input, { ...y(year), timeout: 180_000 }),
  overview: (id: string) => api.get<TimetableOverview>(`/timetable/${id}`),
  grid: (id: string, of: { section?: string; teacher?: string }) => api.get<Grid>(`/timetable/${id}/grid`, { params: of }),
  free: (id: string, weekday: number, period: number) => api.get<FreeTeacher[]>(`/timetable/${id}/free`, { params: { weekday, period } }),
  setCell: (id: string, input: { sectionId: string; weekday: number; periodNo: number; lessons: { subjectId: string; staffId: string | null; roomId?: string | null }[]; locked?: boolean }) => api.put<Grid>(`/timetable/${id}/cell`, input),
  swap: (id: string, input: { sectionId: string; a: { weekday: number; periodNo: number }; b: { weekday: number; periodNo: number } }) => api.post<Grid>(`/timetable/${id}/swap`, input),
  rename: (id: string, name: string) => api.patch<TimetableOverview>(`/timetable/${id}`, { name }),
  publish: (id: string) => api.post<TimetableOverview>(`/timetable/${id}/publish`),
  copy: (id: string) => api.post<{ id: string }>(`/timetable/${id}/copy`, undefined, { timeout: 60_000 }),
  remove: (id: string) => api.delete<{ id: string }>(`/timetable/${id}`),

  substitutions: (date: string) => api.get<SubstitutionDay>('/timetable-subs', { params: { date } }),
  markAbsent: (date: string, staffId: string) => api.post<SubstitutionDay>('/timetable-subs/absent', { date, staffId }),
  clearAbsent: (date: string, staffId: string) => api.post<SubstitutionDay>('/timetable-subs/absent/clear', { date, staffId }),
  assign: (id: string, substituteStaffId: string | null, note?: string | null) => api.put<SubstitutionDay>(`/timetable-subs/${id}`, { substituteStaffId, ...(note !== undefined ? { note } : {}) }),
  subReport: (month: string) => api.get<{ month: string; total: number; arranged: number; teachers: { id: string; name: string; code: string | null; taken: number; missed: number }[] }>('/timetable-subs/report', { params: { month } }),

  mine: () => api.get<MyTimetable>('/my-timetable'),
};
