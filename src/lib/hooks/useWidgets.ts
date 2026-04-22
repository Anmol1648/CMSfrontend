import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { widgetApi } from '../api/endpoints/widget.endpoints';
import { roleWidgetMappingApi } from '../api/endpoints/roleWidgetMapping.endpoints';
import { Widget, RoleWidgetMapping } from '@/types/models/widget.model';

// ─── Widget Definition Hooks ──────────────────────────────────────────────────

export const useWidgets = (filters?: { widget_type?: string; sub_type?: string; is_active?: boolean }) => {
    return useQuery({
        queryKey: ['widgets', filters],
        queryFn: () => widgetApi.getAll(filters).then(res => res.data),
    });
};

export const useWidgetDetails = (id: string) => {
    return useQuery({
        queryKey: ['widgets', id],
        queryFn: () => widgetApi.getById(id).then(res => res.data),
        enabled: !!id,
    });
};

export const useCreateWidget = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: Partial<Widget>) => widgetApi.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['widgets'] });
        },
    });
};

export const useUpdateWidget = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: Partial<Widget> }) => widgetApi.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['widgets'] });
        },
    });
};

export const useDeleteWidget = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => widgetApi.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['widgets'] });
        },
    });
};

export const usePreviewWidgetQuery = () => {
    return useMutation({
        mutationFn: ({ query, params, range }: { query: string; params?: any; range?: any }) => 
            widgetApi.previewQuery(query, params, range),
    });
};

// ─── Role Mapping Hooks ───────────────────────────────────────────────────────

export const useRoleWidgetMappings = (roleId: string) => {
    return useQuery({
        queryKey: ['roleWidgetMappings', roleId],
        queryFn: () => roleWidgetMappingApi.getForRole(roleId).then(res => res.data),
        enabled: !!roleId,
    });
};

export const useUpsertRoleWidgetMapping = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: { role_id: string; widget_id: string; enabled?: boolean; height?: number; width?: number; display_order?: number }) => 
            roleWidgetMappingApi.upsert(data),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['roleWidgetMappings', variables.role_id] });
        },
    });
};

export const useUpdateRoleWidgetMapping = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: Partial<RoleWidgetMapping> }) => 
            roleWidgetMappingApi.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['roleWidgetMappings'] });
        },
    });
};

export const useReorderRoleWidgetMappings = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ roleId, orderedIds }: { roleId: string; orderedIds: string[] }) => 
            roleWidgetMappingApi.reorder(roleId, orderedIds),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['roleWidgetMappings', variables.roleId] });
        },
    });
};

export const useDeleteRoleWidgetMapping = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => roleWidgetMappingApi.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['roleWidgetMappings'] });
        },
    });
};
