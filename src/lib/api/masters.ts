import { api, downloadFile } from './client';
import type { Paged } from './admin';

/** Configuration → Masters (cmsbackend/src/modules/masters). */

export interface MasterField {
  key: string;
  label: string;
  type: 'text' | 'number' | 'boolean';
  required?: boolean;
  max?: number;
  upperCase?: boolean;
  help?: string;
  example?: string;
}

export interface MasterInfo {
  key: string;
  label: string;
  plural: string;
  description: string | null;
  parent: string | null;
  /** This list and the lists above it, top first: city → country, state, district, city. */
  chain: { key: string; label: string; plural: string }[];
  code: 'none' | 'optional' | 'required';
  ordering: 'manual' | 'name';
  fields: MasterField[];
  total: number;
  active: number;
  canManage: boolean;
}

export interface MasterGroup {
  key: string;
  label: string;
  masters: MasterInfo[];
}

export interface MasterValue {
  id: string;
  name: string;
  code: string | null;
  parentId: string | null;
  /** Top first, e.g. India, Uttarakhand, Chamoli for a town. */
  ancestors: { id: string; name: string; master: string }[];
  sortOrder: number;
  isActive: boolean;
  extra: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface MasterOption {
  id: string;
  name: string;
  code: string | null;
  parentId: string | null;
  isActive: boolean;
}

export interface MasterValueQuery {
  page?: number;
  pageSize?: number;
  search?: string;
  parent?: string;
  status?: '' | 'active' | 'inactive';
}

export interface MasterValueInput {
  name?: string;
  code?: string | null;
  parentId?: string | null;
  isActive?: boolean;
  extra?: Record<string, unknown>;
}

const params = (q: MasterValueQuery) => {
  const p: Record<string, string | number> = {};
  if (q.page) p.page = q.page;
  if (q.pageSize) p.pageSize = q.pageSize;
  if (q.search?.trim()) p.search = q.search.trim();
  if (q.parent) p['filter[parent]'] = q.parent;
  if (q.status) p['filter[status]'] = q.status;
  return p;
};

export const mastersApi = {
  catalogue: () => api.get<MasterGroup[]>('/masters'),
  values: (key: string, q: MasterValueQuery) => api.get<Paged<MasterValue>>(`/masters/${key}/values`, { params: params(q) }),
  /** Active options for a dropdown (any signed-in user); `include` keeps a record's current choice. */
  options: (key: string, opts: { parent?: string; include?: string[] } = {}) =>
    api.get<MasterOption[]>(`/masters/${key}/options`, { params: { ...(opts.parent ? { parent: opts.parent } : {}), ...(opts.include?.length ? { include: opts.include.join(',') } : {}) } }),
  create: (key: string, input: MasterValueInput) => api.post<MasterValue>(`/masters/${key}/values`, input),
  update: (key: string, id: string, input: MasterValueInput) => api.patch<MasterValue>(`/masters/${key}/values/${id}`, input),
  move: (key: string, id: string, direction: 'up' | 'down') => api.post<MasterValue>(`/masters/${key}/values/${id}/move`, { direction }),
  remove: (key: string, id: string) => api.delete<{ id: string }>(`/masters/${key}/values/${id}`),
  export: (key: string, q: MasterValueQuery) => downloadFile(`/masters/${key}/export`, params(q), `${key}.xlsx`),
};
