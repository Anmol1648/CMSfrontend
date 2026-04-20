import apiClient from "../clients/apiClient";

export const rbacApi = {
  // ─── My Data (Logged-in User) ───────────────────────────────────
  getMyPermissions: async () => {
    const response = await apiClient.get('/rbac/my-permissions');
    return response.data.data;
  },

  getMyMenus: async () => {
    const response = await apiClient.get('/rbac/my-menus');
    return response.data.data;
  },

  // ─── Permissions CRUD ─────────────────────────────────────────────
  getPermissions: async () => {
    const response = await apiClient.get('/rbac/permissions');
    return response.data.data;
  },

  createPermission: async (data: { resource: string; action: string; description?: string }) => {
    const response = await apiClient.post('/rbac/permissions', data);
    return response.data.data;
  },

  updatePermission: async (id: string, data: { resource?: string; action?: string; description?: string }) => {
    const response = await apiClient.put(`/rbac/permissions/${id}`, data);
    return response.data.data;
  },

  deletePermission: async (id: string) => {
    const response = await apiClient.delete(`/rbac/permissions/${id}`);
    return response.data.data;
  },

  // ─── Menus CRUD ───────────────────────────────────────────────────
  getMenus: async () => {
    const response = await apiClient.get('/rbac/menus');
    return response.data.data;
  },

  createMenu: async (data: any) => {
    const response = await apiClient.post('/rbac/menus', data);
    return response.data.data;
  },

  updateMenu: async (id: string, data: any) => {
    const response = await apiClient.put(`/rbac/menus/${id}`, data);
    return response.data.data;
  },

  deleteMenu: async (id: string) => {
    const response = await apiClient.delete(`/rbac/menus/${id}`);
    return response.data.data;
  },

  // ─── Roles CRUD ───────────────────────────────────────────────────
  getRoles: async () => {
    const response = await apiClient.get('/rbac/roles');
    return response.data.data;
  },

  createRole: async (data: any) => {
    const response = await apiClient.post('/rbac/roles', data);
    return response.data.data;
  },

  updateRole: async (id: string, data: any) => {
    const response = await apiClient.put(`/rbac/roles/${id}`, data);
    return response.data.data;
  },

  deleteRole: async (id: string) => {
    const response = await apiClient.delete(`/rbac/roles/${id}`);
    return response.data.data;
  },

  cloneRole: async (id: string, data: { newSlug: string; newName: string }) => {
    const response = await apiClient.post(`/rbac/roles/${id}/clone`, data);
    return response.data.data;
  },

  // ─── Role Assignments ─────────────────────────────────────────────
  assignPermissions: async (roleId: string, assignments: any[]) => {
    const response = await apiClient.put(`/rbac/roles/${roleId}/permissions`, { assignments });
    return response.data.data;
  },

  assignMenus: async (roleId: string, menus: any[]) => {
    const response = await apiClient.put(`/rbac/roles/${roleId}/menus`, { menus });
    return response.data.data;
  },

  getRoleMenus: async (roleId: string) => {
    const response = await apiClient.get(`/rbac/roles/${roleId}/menus`);
    return response.data.data;
  },

  getRolePermissions: async (roleId: string) => {
    const response = await apiClient.get(`/rbac/roles/${roleId}/permissions`);
    return response.data.data;
  },

  // ─── Simulation ───────────────────────────────────────────────────
  simulateRole: async (roleId: string) => {
    const response = await apiClient.get(`/rbac/roles/${roleId}/simulate`);
    return response.data.data;
  },

  // ─── Users ────────────────────────────────────────────────────────
  getUsers: async (search?: string) => {
    const response = await apiClient.get('/rbac/users', { params: { search } });
    return response.data.data;
  },

  getUserRoles: async (userId: string) => {
    const response = await apiClient.get(`/rbac/users/${userId}/roles`);
    return response.data.data;
  },

  assignRoleToUser: async (userId: string, roleIds: string[]) => {
    const response = await apiClient.put(`/rbac/users/${userId}/roles`, { roleIds });
    return response.data.data;
  },

  toggleUserStatus: async (userId: string, is_active: boolean) => {
    const response = await apiClient.patch(`/rbac/users/${userId}/status`, { is_active });
    return response.data.data;
  },
};
