import apiClient from '../clients/apiClient';
import { ApiResponse } from '@/types/api/api.types';
import { Widget, WidgetPreviewResult } from '@/types/models/widget.model';

export const widgetApi = {
    getAll: async (filters?: { widget_type?: string; sub_type?: string; is_active?: boolean }): Promise<ApiResponse<Widget[]>> => {
        const response = await apiClient.get('/widgets', { params: filters });
        return response.data;
    },

    getById: async (id: string): Promise<ApiResponse<Widget>> => {
        const response = await apiClient.get(`/widgets/${id}`);
        return response.data;
    },

    create: async (data: Partial<Widget>): Promise<ApiResponse<Widget>> => {
        const response = await apiClient.post('/widgets', data);
        return response.data;
    },

    update: async (id: string, data: Partial<Widget>): Promise<ApiResponse<Widget>> => {
        const response = await apiClient.put(`/widgets/${id}`, data);
        return response.data;
    },

    delete: async (id: string): Promise<ApiResponse<any>> => {
        const response = await apiClient.delete(`/widgets/${id}`);
        return response.data;
    },

    previewQuery: async (query: string, params?: any, range?: { start?: string; end?: string }): Promise<ApiResponse<WidgetPreviewResult>> => {
        const response = await apiClient.post('/widgets/preview', { query, params, range });
        return response.data;
    }
};
