import { api } from './client';
import type { Paged } from './admin';

/** Audit trail (cmsbackend/src/modules/audit). */

export interface AuditEntry {
  id: string;
  at: string;
  userId: string | null;
  user: { displayName: string; username: string } | null;
  action: string;
  entity: string;
  entityId: string | null;
  changes: Record<string, unknown> | null;
  ip: string | null;
  userAgent: string | null;
  requestId: string | null;
}

export interface AuditFacets {
  actions: { value: string; count: number }[];
  entities: { value: string; count: number }[];
  users: { value: string; label: string; count: number }[];
}

export interface AuditQuery {
  page?: number;
  pageSize?: number;
  from?: string;
  to?: string;
  action?: string;
  entity?: string;
  userId?: string;
}

const params = (q: AuditQuery) => {
  const p: Record<string, string | number> = {};
  if (q.page) p.page = q.page;
  if (q.pageSize) p.pageSize = q.pageSize;
  for (const k of ["from", "to", "action", "entity", "userId"] as const) if (q[k]) p[`filter[${k}]`] = q[k]!;
  return p;
};

export const auditApi = {
  list: (q: AuditQuery) => api.get<Paged<AuditEntry>>('/audit', { params: params(q) }),
  facets: () => api.get<AuditFacets>('/audit/facets'),
  history: (entity: string, id: string) => api.get<AuditEntry[]>(`/audit/history/${entity}/${encodeURIComponent(id)}`),
};
