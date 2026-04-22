import React, { useEffect } from 'react';
import { DashboardWidget } from '@/types/models/widget.model';
import { useExecuteWidget } from '@/lib/hooks/useDashboard';
import { StatCard } from './StatCard';

interface DynamicStatWidgetProps {
    widget: DashboardWidget;
}

export const DynamicStatWidget = ({ widget }: DynamicStatWidgetProps) => {
    const { mutate: execute, data: result, isPending, isError } = useExecuteWidget();

    useEffect(() => {
        execute({ query: widget.query });
    }, [widget.query, execute]);

    const val = result?.rows?.[0]?.value || 0;
    const prefix = widget.config?.prefix || '';
    const suffix = widget.config?.suffix || '';

    return (
        <StatCard 
            icon={widget.customization?.icon || 'monitoring'} 
            label={widget.display_name || widget.title}
            value={isPending ? '...' : `${prefix}${val}${suffix}`}
            colorClass={widget.customization?.color || 'bg-primary-container text-on-primary-container'}
        />
    );
};
