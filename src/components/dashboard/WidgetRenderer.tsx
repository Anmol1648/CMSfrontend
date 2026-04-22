import React from 'react';
import { DashboardWidget } from '@/types/models/widget.model';
import { DynamicStatWidget } from './DynamicStatWidget';
import { ChartWidget } from './ChartWidget';
import { TableWidget } from './TableWidget';
import { FeedWidget } from './FeedWidget';

interface WidgetRendererProps {
    widget: DashboardWidget;
}

export const WidgetRenderer = ({ widget }: WidgetRendererProps) => {
    switch (widget.widget_type) {
        case 'stat':
            return <DynamicStatWidget widget={widget} />;
        case 'chart':
            return <ChartWidget widget={widget} />;
        case 'table':
            return <TableWidget widget={widget} />;
        case 'feed':
            return <FeedWidget widget={widget} />;
        case 'calendar':
            // Fallback for calendar until implemented
            return <div className="bg-surface-container-lowest p-6 rounded-2xl h-full shadow-sm text-center font-medium text-on-surface-variant flex items-center justify-center">Upcoming Events Calendar (Coming Soon)</div>;
        default:
            return <div className="bg-error-container text-on-error-container p-6 rounded-2xl">Unsupported widget type: {widget.widget_type}</div>;
    }
};
