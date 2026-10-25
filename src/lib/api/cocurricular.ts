import { api, uploadFile } from './client';

/** Co-curricular: houses, clubs, competitions, achievements (cmsbackend/src/modules/cocurricular). */

export interface House {
  id: string;
  name: string;
  colour: string;
}
export interface StudentHit {
  id: string;
  name: string;
  admissionNo: string;
  section: string;
  houseId: string | null;
}
export interface Official {
  id: string;
  role: string;
  roleLabel: string;
  staffId: string | null;
  studentId: string | null;
  name: string;
  section: string;
}
export interface PointRow {
  id: string;
  houseId: string;
  house?: string;
  points: number;
  reason: string;
  student: string | null;
  date: string;
  by: string | null;
  fromResult: boolean;
}
export type HousesOverview =
  | { on: false }
  | {
      on: true;
      year: string;
      houses: (House & { points: number; rank: number; students: number; officials: Official[] })[];
      unassigned: number;
      recent: PointRow[];
      roles: { value: string; label: string; staff: boolean }[];
      can: { manage: boolean; points: boolean };
    };
export interface Strength {
  houses: House[];
  rows: { sectionId: string; section: string; counts: Record<string, number>; none: number }[];
}
export interface Allocation {
  students: number;
  houses: { houseId: string; name: string; colour: string; adding: number; total: number }[];
  done: boolean;
}

export interface ClubRow {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  incharges: string[];
  classes: string;
  members: number;
  requests: number;
  maxMembers: number | null;
  meets: string | null;
  isActive: boolean;
  mine: boolean;
  canRun: boolean;
}
export interface ClubMemberRow {
  id: string;
  studentId: string;
  name: string;
  admissionNo: string;
  section: string;
  role: string;
  roleLabel: string;
  grade: string | null;
  remark: string | null;
  attended: number;
  requestedBy: string | null;
  requestNote: string | null;
  at: string;
}
export interface Club {
  id: string;
  name: string;
  description: string | null;
  categoryId: string | null;
  category: string | null;
  inchargeIds: string[];
  incharges: string[];
  classIds: string[];
  maxMembers: number | null;
  meets: string | null;
  openToRequests: boolean;
  isActive: boolean;
  members: ClubMemberRow[];
  requests: ClubMemberRow[];
  meetings: { id: string; date: string; title: string; notes: string | null; presentIds: string[]; present: number; photoIds: string[] }[];
  can: { run: boolean; manage: boolean };
}
export interface ClubInput {
  name: string;
  description: string | null;
  categoryId: string | null;
  inchargeIds: string[];
  classIds: string[];
  maxMembers: number | null;
  meets: string | null;
  openToRequests: boolean;
  isActive: boolean;
}
export interface ClubOptions {
  categories: { id: string; name: string }[];
  classes: { id: string; name: string }[];
  staff: { id: string; name: string; code: string }[];
  roles: { value: string; label: string }[];
}

export type CompStatus = 'upcoming' | 'done' | 'cancelled';
export interface CompOptions {
  categories: { id: string; name: string }[];
  levels: { id: string; name: string; inSchool: boolean }[];
  classes: { id: string; name: string }[];
  staff: { id: string; name: string }[];
  clubs: { id: string; name: string }[];
  houses: House[];
  housesOn: boolean;
  points: { first: number; second: number; third: number; takingPart: number; teamTimes: number; achievements: boolean };
}
export interface CompRow {
  id: string;
  name: string;
  category: string | null;
  level: string | null;
  date: string;
  endDate: string | null;
  venue: string | null;
  kind: 'individual' | 'team';
  byHouse: boolean;
  status: CompStatus;
  resultsOut: boolean;
  entries: number;
  winner: string | null;
}
export interface Entry {
  id: string;
  teamName: string | null;
  houseId: string | null;
  house: House | null;
  students: { id: string; name: string; section: string; houseId: string | null }[];
  position: number | null;
  award: string | null;
  points: number;
  remark: string | null;
}
export interface Competition {
  id: string;
  name: string;
  categoryId: string | null;
  category: string | null;
  levelId: string | null;
  level: string | null;
  date: string;
  endDate: string | null;
  venue: string | null;
  description: string | null;
  classIds: string[];
  kind: 'individual' | 'team';
  byHouse: boolean;
  inchargeId: string | null;
  incharge: string | null;
  clubId: string | null;
  club: string | null;
  onCalendar: boolean;
  status: CompStatus;
  resultsOut: boolean;
  entries: Entry[];
  can: { manage: boolean };
}
export interface CompInput {
  name: string;
  categoryId: string | null;
  levelId: string | null;
  date: string;
  endDate: string | null;
  venue: string | null;
  description: string | null;
  classIds: string[];
  kind: 'individual' | 'team';
  byHouse: boolean;
  inchargeId: string | null;
  clubId: string | null;
  onCalendar: boolean;
  status?: CompStatus;
}
export interface EntryInput {
  id?: string | null;
  teamName: string | null;
  houseId: string | null;
  studentIds: string[];
  position: number | null;
  award: string | null;
  points: number | null;
  remark: string | null;
}

export interface AchievementRow {
  id: string;
  studentId: string;
  student: string;
  section: string;
  title: string;
  category: string | null;
  level: string | null;
  result: string | null;
  organiser: string | null;
  date: string;
  certificateId: string | null;
  points: number;
}
export interface AchievementInput {
  studentId: string;
  title: string;
  categoryId: string | null;
  levelId: string | null;
  result: string | null;
  organiser: string | null;
  date: string;
  certificateId: string | null;
  points: number;
}

export interface Activities {
  house: { id: string; name: string; colour: string; rank: number | null; points: number | null; of: number; role: string | null; myPoints: number } | null;
  clubs: { id: string; clubId: string; club: string; year: string; current: boolean; status: 'active' | 'requested' | 'left' | 'refused'; role: string; grade: string | null; remark: string | null }[];
  competitions: { id: string; competitionId: string; name: string; category: string | null; level: string | null; date: string; year: string; status: CompStatus; team: string | null; position: number | null; award: string | null; resultsOut: boolean }[];
  achievements: { id: string; title: string; level: string | null; category: string | null; result: string | null; organiser: string | null; date: string; year: string; hasCertificate: boolean }[];
}
export interface MyActivities {
  housesOn: boolean;
  standings: (House & { points: number; rank: number })[];
  children: (Activities & { id: string; name: string; openClubs: { id: string; name: string; description: string | null; category: string | null; meets: string | null }[]; upcoming: { id: string; name: string; date: string; venue: string | null }[] })[];
}

const clean = (q: Record<string, unknown>) => Object.fromEntries(Object.entries(q).filter(([, v]) => v !== undefined && v !== ''));

export const cocurricularApi = {
  students: (q: string, classIds: string[] = []) => api.get<StudentHit[]>('/cocurricular/students', { params: clean({ q, classes: classIds.join(',') }), quiet: true }),
  upload: (file: File) => uploadFile<{ id: string; name: string }>('/cocurricular/files', 'file', file),
  student: (id: string) => api.get<Activities>(`/cocurricular/student/${id}`),
  mine: () => api.get<MyActivities>('/cocurricular/mine'),

  houses: () => api.get<HousesOverview>('/cocurricular/houses'),
  strength: () => api.get<Strength>('/cocurricular/houses/strength'),
  points: (q: { house?: string; page?: number }) => api.get<{ total: number; page: number; pageSize: number; rows: PointRow[] }>('/cocurricular/houses/points', { params: clean(q) }),
  givePoints: (input: { houseId: string; points: number; reason: string; studentId: string | null; date?: string }) => api.post<HousesOverview>('/cocurricular/houses/points', input),
  removePoints: (id: string) => api.delete<HousesOverview>(`/cocurricular/houses/points/${id}`),
  allocate: (input: { which: 'unassigned' | 'all'; classIds: string[]; preview: boolean }) => api.post<Allocation>('/cocurricular/houses/allocate', input),
  houseStudents: (houseId: string, section?: string) => api.get<StudentHit[]>(`/cocurricular/houses/${houseId}/students`, { params: clean({ section }) }),
  setOfficials: (houseId: string, officials: { role: string; staffId: string | null; studentId: string | null }[]) => api.put<HousesOverview>(`/cocurricular/houses/${houseId}/officials`, { officials }),

  clubOptions: () => api.get<ClubOptions>('/cocurricular/clubs/options'),
  clubs: () => api.get<{ clubs: ClubRow[]; can: { manage: boolean } }>('/cocurricular/clubs'),
  club: (id: string) => api.get<Club>(`/cocurricular/clubs/${id}`),
  createClub: (input: ClubInput) => api.post<Club>('/cocurricular/clubs', input),
  updateClub: (id: string, input: ClubInput) => api.put<Club>(`/cocurricular/clubs/${id}`, input),
  deleteClub: (id: string) => api.delete(`/cocurricular/clubs/${id}`),
  addMembers: (id: string, studentIds: string[]) => api.post<Club>(`/cocurricular/clubs/${id}/members`, { studentIds }),
  updateMember: (memberId: string, input: { role?: string; status?: 'active' | 'refused' | 'left'; grade?: string | null; remark?: string | null }) => api.put<Club>(`/cocurricular/clubs/members/${memberId}`, input),
  addMeeting: (id: string, input: { date: string; title: string; notes: string | null; presentIds: string[]; photoIds: string[] }) => api.post<Club>(`/cocurricular/clubs/${id}/meetings`, input),
  updateMeeting: (meetingId: string, input: { date: string; title: string; notes: string | null; presentIds: string[]; photoIds: string[] }) => api.put<Club>(`/cocurricular/clubs/meetings/${meetingId}`, input),
  deleteMeeting: (meetingId: string) => api.delete<Club>(`/cocurricular/clubs/meetings/${meetingId}`),
  photoPath: (meetingId: string, fileId: string) => `/cocurricular/clubs/meetings/${meetingId}/photos/${fileId}`,
  requestJoin: (clubId: string, studentId: string, note: string | null) => api.post(`/cocurricular/clubs/${clubId}/request`, { studentId, note }),
  cancelRequest: (memberId: string) => api.delete(`/cocurricular/clubs/requests/${memberId}`),

  compOptions: () => api.get<CompOptions>('/cocurricular/competitions/options'),
  competitions: (q: { status?: string; category?: string; level?: string; search?: string; page?: number }) => api.get<{ total: number; page: number; pageSize: number; rows: CompRow[]; can: { manage: boolean } }>('/cocurricular/competitions', { params: clean(q) }),
  competition: (id: string) => api.get<Competition>(`/cocurricular/competitions/${id}`),
  createCompetition: (input: CompInput) => api.post<Competition>('/cocurricular/competitions', input),
  updateCompetition: (id: string, input: CompInput) => api.put<Competition>(`/cocurricular/competitions/${id}`, input),
  deleteCompetition: (id: string) => api.delete(`/cocurricular/competitions/${id}`),
  saveEntries: (id: string, input: { entries: EntryInput[]; done?: boolean; resultsOut?: boolean }) => api.put<Competition>(`/cocurricular/competitions/${id}/entries`, input),

  achievements: (q: { search?: string; level?: string; page?: number }) => api.get<{ total: number; page: number; pageSize: number; rows: AchievementRow[]; can: { record: boolean } }>('/cocurricular/achievements', { params: clean(q) }),
  recordAchievement: (input: AchievementInput) => api.post<{ id: string }>('/cocurricular/achievements', input),
  deleteAchievement: (id: string) => api.delete(`/cocurricular/achievements/${id}`),
  certificatePath: (id: string) => `/cocurricular/achievements/${id}/certificate`,
};

export const place = (n: number | null) => (n === 1 ? '1st' : n === 2 ? '2nd' : n === 3 ? '3rd' : n ? `${n}th` : null);
export const MEDAL: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };
export const STATUS: Record<CompStatus, { label: string; tone: 'primary' | 'success' | 'neutral' }> = { upcoming: { label: 'Coming up', tone: 'primary' }, done: { label: 'Results', tone: 'success' }, cancelled: { label: 'Cancelled', tone: 'neutral' } };
export const day = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
export const todayIso = () => new Date(Date.now() + 5.5 * 3_600_000).toISOString().slice(0, 10);
