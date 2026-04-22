export type WidgetType = 'stat' | 'chart' | 'table' | 'calendar' | 'feed';
export type WidgetSubType = 'bar' | 'line' | 'pie' | 'donut' | 'stat_card' | 'audit_log' | 'user_list' | 'notification' | string;

export interface Widget {
    id: string;
    title: string;
    widget_type: WidgetType;
    sub_type: WidgetSubType | null;
    config: any;
    query: string;
    display_name: string | null;
    customization: any;
    range_enabled: boolean;
    is_active: boolean;
    created_by: string | null;
    updated_by: string | null;
    created_on: string;
    updated_on: string;
}

export interface RoleWidgetMapping {
    id: string;
    role_id: string;
    widget_id: string;
    enabled: boolean;
    display_order: number;
    height: number;
    width: number;
    created_by: string | null;
    updated_by: string | null;
    created_on: string;
    updated_on: string;
    widget?: Widget; // Joined data
}

export interface DashboardWidget extends Widget {
    mapping: {
        id: string;
        display_order: number;
        height: number;
        width: number;
        enabled: boolean;
    };
}

export interface WidgetPreviewResult {
    columns: string[];
    rows: any[];
    rowCount: number;
    executionTime: number;
}
