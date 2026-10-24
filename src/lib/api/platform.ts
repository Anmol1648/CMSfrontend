import axios, { AxiosError } from 'axios';
import { API_BASE_URL, ApiError } from './client';

/**
 * The platform console (Klytos staff): its own sign-in and token, separate from a school's. The token
 * is kept for this browser tab only.
 */

const TOKEN_KEY = 'platform-token';
export const platformToken = {
  get: () => {
    try {
      return sessionStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },
  set: (t: string | null) => {
    try {
      if (t) sessionStorage.setItem(TOKEN_KEY, t);
      else sessionStorage.removeItem(TOKEN_KEY);
    } catch {
      /* private window: signed in until the page is closed */
    }
  },
};

const http = axios.create({ baseURL: `${API_BASE_URL}/platform`, timeout: 60_000, headers: { 'Content-Type': 'application/json' } });
http.interceptors.request.use((c) => {
  const t = platformToken.get();
  if (t) c.headers.Authorization = `Bearer ${t}`;
  return c;
});
type Envelope<T> = { data?: T; error?: { message?: string; code?: string; details?: { field: string; message: string }[] }; requestId?: string };
const call = async <T>(p: Promise<{ data: Envelope<T> }>): Promise<T> => {
  try {
    return (await p).data.data as T;
  } catch (err) {
    const ax = err as AxiosError<Envelope<unknown>>;
    if (ax.response) {
      const b = ax.response.data;
      if (ax.response.status === 401 && !String(ax.config?.url ?? '').startsWith('/auth/')) platformToken.set(null);
      throw new ApiError(b?.error?.message || `Request failed (${ax.response.status})`, ax.response.status, b?.error?.code || 'ERROR', b?.error?.details || [], b?.requestId);
    }
    throw new ApiError("Can't reach the server. Check your connection and try again.", 0, 'NETWORK_ERROR');
  }
};

export type PlatformRole = 'owner' | 'support';
export interface PlatformUser {
  id: string;
  email: string;
  name: string;
  role: PlatformRole;
  mustChangePassword: boolean;
}
export interface Limits {
  maxStudents?: number;
  aiMonthly?: number;
  storageMb?: number;
}
export interface SchoolRow {
  id: string;
  code: string;
  name: string;
  domain: string | null;
  status: 'active' | 'suspended';
  city: string | null;
  planId: string | null;
  plan: string | null;
  modulesAll: boolean;
  modules: string[];
  limits: Limits;
  deleteAfter: string | null;
  createdAt: string;
  address: string | null;
  students: number;
  staff: number;
  users: number;
  storageMb: number;
  aiThisMonth: number;
  lastSignIn: string | null;
}
export interface SetupStep {
  key: string;
  label: string;
  help: string;
  href: string;
  done: boolean;
  detail?: string;
}
export interface School extends SchoolRow {
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  notes: string | null;
  suspendedReason: string | null;
  profile: { legalName: string; city: string | null; state: string | null; phone: string | null; email: string | null; board: string | null } | null;
  admins: { id: string; username: string; displayName: string; email: string | null; status: string; lastLoginAt: string | null; lockedUntil: string | null }[];
  setup: { steps: SetupStep[]; done: number; total: number; live: boolean; liveOn: string | null };
  mail: { host: string; port: string; user: string; from: string } | null;
}
export interface Plan {
  id: string;
  name: string;
  description: string;
  modules: string[];
  limits: Limits;
  sortOrder: number;
  isActive: boolean;
  schools: number;
}
export interface ModuleInfo {
  key: string;
  label: string;
  description: string;
}
export interface Staff {
  id: string;
  email: string;
  name: string;
  role: PlatformRole;
  status: 'active' | 'disabled';
  mfaEnabled: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}
export interface LogRow {
  id: string;
  action: string;
  tenantId: string | null;
  schoolName: string | null;
  details: Record<string, unknown>;
  ip: string | null;
  createdAt: string;
  by: string;
}
export interface Notice {
  id: string;
  kind: 'banner' | 'news';
  title: string;
  body: string;
  audience: 'all' | 'admins';
  startsAt: string;
  endsAt: string | null;
}

export interface MenuTemplate {
  id: string;
  name: string;
  description: string;
  items: unknown[];
  groups: unknown[];
  updatedAt: string;
}

export type SchoolUpdate = Pick<School, 'name' | 'domain' | 'city' | 'contactName' | 'contactEmail' | 'contactPhone' | 'notes' | 'planId' | 'modulesAll' | 'modules' | 'limits'>;

export const platformApi = {
  login: (email: string, password: string) => call<{ mfaRequired?: true; mfaSetup?: true; mfaToken: string; qrCodeDataUrl?: string; secret?: string }>(http.post('/auth/login', { email, password })),
  verify: (mfaToken: string, code: string) => call<{ token: string; user: PlatformUser }>(http.post('/auth/verify', { mfaToken, code })),
  me: () => call<PlatformUser>(http.get('/auth/me')),
  changePassword: (current: string, next: string) => call(http.post('/auth/password', { current, next })),
  schools: () => call<SchoolRow[]>(http.get('/schools')),
  school: (id: string) => call<School>(http.get(`/schools/${id}`)),
  createSchool: (b: Record<string, unknown>) => call<{ id: string; code: string; address: string | null; admin: { username: string; temporaryPassword: string }; emailed: boolean }>(http.post('/schools', b)),
  updateSchool: (id: string, b: SchoolUpdate) => call<School>(http.put(`/schools/${id}`, b)),
  setStatus: (id: string, status: 'active' | 'suspended', reason?: string) => call<School>(http.post(`/schools/${id}/status`, { status, reason })),
  resetAdmin: (id: string, userId: string) => call<{ username: string; password: string }>(http.post(`/schools/${id}/admins/${userId}/reset`)),
  setMail: (id: string, b: { host: string; port: number; user: string; password?: string; from?: string | null } | null) => call<School>(http.put(`/schools/${id}/mail`, b)),
  requestDelete: (id: string, confirmCode: string) => call<School>(http.post(`/schools/${id}/delete`, { confirmCode })),
  cancelDelete: (id: string) => call<School>(http.post(`/schools/${id}/delete/cancel`)),
  exportSchool: async (id: string) => {
    try {
      const res = await http.get<Blob>(`/schools/${id}/export`, { responseType: 'blob', timeout: 600_000 });
      const name = /filename="([^"]+)"/.exec(String(res.headers['content-disposition'] ?? ''))?.[1] ?? 'school-export.zip';
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = name;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
    } catch {
      throw new ApiError('The export failed. Try again.', 0, 'ERROR');
    }
  },
  menuTemplates: () => call<MenuTemplate[]>(http.get('/menu-templates')),
  saveMenuTemplate: (schoolId: string, name: string, description: string) => call<MenuTemplate[]>(http.post(`/schools/${schoolId}/menu-template`, { name, description })),
  applyMenu: (schoolId: string, templateId: string | null) => call<{ ok: boolean }>(http.post(`/schools/${schoolId}/menu`, { templateId })),
  deleteMenuTemplate: (id: string) => call<MenuTemplate[]>(http.delete(`/menu-templates/${id}`)),
  plans: () => call<{ modules: ModuleInfo[]; plans: Plan[] }>(http.get('/plans')),
  savePlan: (id: string | null, b: Omit<Plan, 'id' | 'schools'>) => call<{ modules: ModuleInfo[]; plans: Plan[] }>(id ? http.put(`/plans/${id}`, b) : http.post('/plans', b)),
  applyPlan: (id: string) => call<{ schools: number }>(http.post(`/plans/${id}/apply`)),
  deletePlan: (id: string) => call<{ modules: ModuleInfo[]; plans: Plan[] }>(http.delete(`/plans/${id}`)),
  staff: () => call<Staff[]>(http.get('/staff')),
  saveStaff: (id: string | null, b: { email: string; name: string; role: PlatformRole; status: 'active' | 'disabled' }) => call<{ password: string | null }>(id ? http.put(`/staff/${id}`, b) : http.post('/staff', b)),
  resetStaff: (id: string) => call<{ password: string }>(http.post(`/staff/${id}/reset`)),
  log: (page: number, tenantId?: string) => call<{ total: number; rows: LogRow[] }>(http.get('/log', { params: { page, tenantId } })),
  notices: () => call<Notice[]>(http.get('/notices')),
  saveNotice: (id: string | null, b: Omit<Notice, 'id'>) => call<Notice[]>(id ? http.put(`/notices/${id}`, b) : http.post('/notices', b)),
  deleteNotice: (id: string) => call<Notice[]>(http.delete(`/notices/${id}`)),
};

export const when = (d: string | null) => (d ? new Date(d).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '—');
