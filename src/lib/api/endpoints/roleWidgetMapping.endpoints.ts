import apiClient from '../clients/apiClient';
import { ApiResponse } from '@/types/api/api.types';
import { RoleWidgetMapping } from '@/types/models/widget.model';

export const roleWidgetMappingApi = {
    getForRole: async (roleId: string): Promise<ApiResponse<RoleWidgetMapping[]>> => {
        const response = await apiClient.get(`/role-widget-mappings/role/${roleId}`);
        return response.data;
    },

    upsert: async (data: { role_id: string; widget_id: string; enabled?: boolean; height?: number; width?: number; display_order?: number }): Promise<ApiResponse<RoleWidgetMapping>> => {
        const response = await apiClient.post('/role-widget-mappings', data);
        return response.data;
    },

    update: async (id: string, data: Partial<RoleWidgetMapping>): Promise<ApiResponse<RoleWidgetMapping>> => {
        const response = await apiClient.put(`/role-widget-mappings/${id}`, data);
        return response.data;
    },

    reorder: async (roleId: string, orderedIds: string[]): Promise<ApiResponse<any>> => {
        const response = await apiClient.post('/role-widget-mappings/reorder', { role_id: roleId, ordered_ids: orderedIds });
        return response.data;
    },

    delete: async (id: string): Promise<ApiResponse<any>> => {
        const response = await apiClient.delete(`/role-widget-mappings/${id}`);
        return response.data;
    }
};
