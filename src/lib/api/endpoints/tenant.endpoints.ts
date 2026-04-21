import apiClient from "../clients/apiClient";

export const tenantApi = {
  // ─── List All Tenants ─────────────────────────────────────────────
  getAll: async () => {
    const response = await apiClient.get('/tenants');
    return response.data.data;
  },

  // ─── Get Single Tenant (includes health check) ───────────────────
  getById: async (id: string) => {
    const response = await apiClient.get(`/tenants/${id}`);
    return response.data.data;
  },

  // ─── Onboard New Tenant ───────────────────────────────────────────
  create: async (data: { name: string; slug: string; domain: string }) => {
    const response = await apiClient.post('/tenants', data);
    return response.data.data;
  },

  // ─── Activate / Suspend ───────────────────────────────────────────
  updateStatus: async (id: string, status: 'active' | 'suspended') => {
    const response = await apiClient.patch(`/tenants/${id}/status`, { status });
    return response.data.data;
  },

  // ─── Trigger Migration Run ────────────────────────────────────────
  triggerMigration: async (id: string) => {
    const response = await apiClient.post(`/tenants/${id}/migrate`);
    return response.data.data;
  },
};
