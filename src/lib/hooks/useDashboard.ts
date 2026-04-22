import { useQuery, useMutation } from '@tanstack/react-query';
import { dashboardApi } from '../api/endpoints/dashboard.endpoints';
import { widgetApi } from '../api/endpoints/widget.endpoints';

export const useDashboard = () => {
    return useQuery({
        queryKey: ['dashboardWidgets'],
        queryFn: () => dashboardApi.getMyWidgets().then(res => res.data),
    });
};

export const useExecuteWidget = () => {
    return useMutation({
        mutationFn: ({ query, params, range }: { query: string; params?: any; range?: { start?: string; end?: string; } }) =>
            widgetApi.previewQuery(query, params, range).then(res => res.data),
    });
};
