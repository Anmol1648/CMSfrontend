import { api } from './client';
import type { UserKind } from './auth';

/** Access, users and roles (cmsbackend/src/modules/rbac + users). */

export type DataScope = 'all' | 'assigned' | 'own';

export interface MenuGroup {
  key: string;
  label: string;
  items: { key: string; label: string; icon: string; href: string }[];
}

export interface Access {
  isSuperAdmin: boolean;
  permissions: Record<string, DataScope>;
  menu: MenuGroup[];
}

export interface RoleRef {
  id: string;
  slug: string;
  name: string;
  isSystem: boolean;
}

export interface AdminUser {
  id: string;
  username: string;
  displayName: string;
  email: string | null;
  mobile: string | null;
  kind: UserKind;
  status: 'active' | 'disabled';
  mustChangePassword: boolean;
  mfaEnabled: boolean;
  locked: boolean;
  lockedUntil: string | null;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
  roles: RoleRef[];
  isSuperAdmin: boolean;
}

export interface Paged<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface Role {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  defaultFor: UserKind | null;
  userCount: number;
  permissionCount?: number;
  permissions?: { key: string; scope: DataScope }[];
}

export interface PermissionGroup {
  module: string;
  label: string;
  permissions: { key: string; label: string; description: string | null; sensitive: boolean; scopes: DataScope[] }[];
}

export interface UserListQuery {
  page?: number;
  pageSize?: number;
  sort?: string;
  order?: 'asc' | 'desc';
  search?: string;
  kind?: string;
  status?: string;
  role?: string;
}

const listParams = (q: UserListQuery) => {
  const p: Record<string, string | number> = {};
  if (q.page) p.page = q.page;
  if (q.pageSize) p.pageSize = q.pageSize;
  if (q.sort) p.sort = q.sort;
  if (q.order) p.order = q.order;
  if (q.search?.trim()) p.search = q.search.trim();
  if (q.kind) p["filter[kind]"] = q.kind;
  if (q.status) p["filter[status]"] = q.status;
  if (q.role) p["filter[role]"] = q.role;
  return p;
};

export interface UserInput {
  kind?: UserKind;
  displayName?: string;
  username?: string;
  email?: string;
  mobile?: string;
  status?: 'active' | 'disabled';
  roleIds?: string[];
}

export const accessApi = {
  mine: () => api.get<Access>('/me/access'),
};

export const usersApi = {
  list: (q: UserListQuery) => api.get<Paged<AdminUser>>('/users', { params: listParams(q) }),
  get: (id: string) => api.get<AdminUser>(`/users/${id}`),
  create: (input: UserInput) => api.post<{ user: AdminUser; temporaryPassword: string; emailed: boolean }>('/users', input),
  update: (id: string, input: UserInput) => api.patch<AdminUser>(`/users/${id}`, input),
  resetPassword: (id: string) => api.post<{ temporaryPassword: string }>(`/users/${id}/reset-password`),
  unlock: (id: string) => api.post<AdminUser>(`/users/${id}/unlock`),
  resetMfa: (id: string) => api.post<AdminUser>(`/users/${id}/reset-mfa`),
};

export const rolesApi = {
  list: () => api.get<Role[]>('/roles'),
  catalogue: () => api.get<PermissionGroup[]>('/roles/permissions'),
  get: (id: string) => api.get<Role>(`/roles/${id}`),
  create: (input: { name: string; description?: string; copyFromRoleId?: string }) => api.post<Role>('/roles', input),
  update: (id: string, input: { name?: string; description?: string | null }) => api.patch<Role>(`/roles/${id}`, input),
  setPermissions: (id: string, permissions: { key: string; scope: DataScope }[]) => api.put<Role>(`/roles/${id}/permissions`, { permissions }),
  remove: (id: string) => api.delete<object>(`/roles/${id}`),
};
