import React, { useEffect } from 'react';
import { useExecuteWidget } from '@/lib/hooks/useDashboard';
import { DashboardWidget } from '@/types/models/widget.model';

interface FeedWidgetProps {
    widget: DashboardWidget;
}

export const FeedWidget = ({ widget }: FeedWidgetProps) => {
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
                Error loading feed
            </div>
        );
    }

    const { config, title } = widget;
    const titleKey = config?.titleKey || 'title';
    const categoryKey = config?.categoryKey || 'category';
    const descKey = config?.descriptionKey || 'description';
    const timeKey = config?.timestampKey || 'timestamp';   

    return (
        <div className="bg-surface-container-lowest p-6 rounded-2xl shadow-sm h-full flex flex-col">
            <h3 className="text-sm font-bold tracking-tight text-primary mb-4 flex items-center gap-2">
                {widget.customization?.icon && (
                    <span className="material-symbols-outlined text-sm">{widget.customization.icon}</span>
                )}
                {widget.display_name || title}
            </h3>
            <div className="flex-1 overflow-auto pr-2 space-y-4">
                {result.rows.map((item, idx) => (
                    <div key={idx} className="flex gap-4 p-3 rounded-xl hover:bg-surface-container-low transition-colors">
                        <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                            <span className="material-symbols-outlined text-sm">
                                {item[categoryKey] === 'user_roles' ? 'person_add' : 'history_edu'}
                            </span>
                        </div>
                        <div>
                            <p className="text-sm font-bold text-on-surface">
                                {item[titleKey]} <span className="text-xs font-medium text-on-surface-variant ml-1 cursor-pointer hover:underline">{item[descKey]}</span>
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="text-[10px] uppercase tracking-wider font-extrabold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                                    {String(item[categoryKey] || 'system')}
                                </span>
                                <span className="text-[10px] text-on-surface-variant font-medium">
                                    {item[timeKey]}
                                </span>
                            </div>
                        </div>
                    </div>
                ))}
                {result.rows.length === 0 && (
                    <div className="text-center text-sm text-on-surface-variant py-8">No recent activity</div>
                )}
            </div>
        </div>
    );
};
