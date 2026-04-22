import React, { useEffect } from 'react';
import { useExecuteWidget } from '@/lib/hooks/useDashboard';
import { DashboardWidget } from '@/types/models/widget.model';
import { DataTable } from '@/components/ui/DataTable';

interface TableWidgetProps {
    widget: DashboardWidget;
}

export const TableWidget = ({ widget }: TableWidgetProps) => {
    const { mutate: execute, data: result, isPending, isError } = useExecuteWidget();

    useEffect(() => {
        execute({ query: widget.query });
    }, [widget.query, execute]);

    if (isPending) {
        return <div className="h-full min-h-[300px] bg-surface-container-low animate-pulse rounded-2xl"></div>;
    }

    if (isError || !result || !result.rows) {
        return (
            <div className="h-full min-h-[300px] flex items-center justify-center bg-surface-container-low rounded-2xl text-on-surface-variant">
                <span className="material-symbols-outlined mr-2">error</span>
                Error loading table data
            </div>
        );
    }

    const { config, title } = widget;
    const columnsDef = result.columns.map(key => ({
        header: key,
        accessorKey: key as any,
    }));

    return (
        <div className="bg-surface-container-lowest p-6 rounded-2xl shadow-sm h-full flex flex-col">
            <h3 className="text-sm font-bold tracking-tight text-primary mb-4 flex items-center gap-2">
                {widget.customization?.icon && (
                    <span className="material-symbols-outlined text-sm">{widget.customization.icon}</span>
                )}
                {widget.display_name || title}
            </h3>
            <div className="flex-1 overflow-auto rounded-xl">
                <DataTable
                    columns={columnsDef}
                    data={result.rows}
                    totalItems={result.rowCount}
                    className="h-full"
                />
            </div>
        </div>
    );
};
