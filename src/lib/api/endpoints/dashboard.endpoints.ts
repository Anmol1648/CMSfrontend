import apiClient from '../clients/apiClient';
import { ApiResponse } from '@/types/api/api.types';
import { DashboardWidget } from '@/types/models/widget.model';

export const dashboardApi = {
    getMyWidgets: async (): Promise<ApiResponse<DashboardWidget[]>> => {
        const response = await apiClient.get('/dashboard/widgets');
        return response.data;
    }
};
